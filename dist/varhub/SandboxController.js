import T from "@flinbein/t-type-check";
import { URL } from "node:url";
import { readFile } from "node:fs";
import getStableHash from "@flinbein/json-stable-hash";
import ModuleSandbox from "@flinbein/sandboxer";
import EventEmitter from "events";
const isJsModule = T({
    type: "js",
    source: T.string.optional,
    evaluate: T.bool.optional,
    hooks: T(T.mapOf(T.string, T.bool), T.arrayOf(T.string), "*").optional
});
const isJsonModule = T({
    type: "json",
    source: T.string,
});
const isTextModule = T({
    type: "text",
    source: T.string,
});
const isBinModule = T({
    type: "bin",
    source: T.instanceOf(Uint8Array),
});
const isModule = T(isJsModule, isJsonModule, isTextModule, isBinModule);
const isClientOrClientList = T(T.string, T.arrayOf(T.string));
export const isCreateData = T([{
        modules: T.mapOf(isModule),
        config: T.any.optional
    }]);
function asyncReadFile(modulePath, encoding) {
    const filePath = import.meta.resolve(modulePath);
    const fileUrl = new URL(filePath);
    return new Promise((resolve, reject) => {
        readFile(fileUrl, encoding, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
}
const roomTextPromise = asyncReadFile("./controller/$room.js", "utf-8");
const innerTextPromise = asyncReadFile("./controller/$inner.js", "utf-8");
const innerModulesAsync = {
    "inner:timer": asyncReadFile("./controller/timer.js", "utf-8")
};
export async function sandboxController(room, ...args) {
    const [{ modules: moduleDescriptors, config }] = isCreateData.assert(args);
    const integrity = getStableHash(moduleDescriptors, "sha256", "hex");
    let starInvokeHandler = null;
    const aliases = new Map();
    function registerAlias(alias, module, functionName) {
        if (aliases.has(alias)) {
            throw new Error(`alias overlap: ${alias} in ${aliases.get(alias)?.[0]}, ${module}`);
        }
        aliases.set(alias, [module, functionName]);
    }
    const names = Object.keys(moduleDescriptors);
    if (names.some(name => name.startsWith("varhub:")))
        throw new Error("forbidden module domain: `varhub:`");
    const sandboxDescriptor = {};
    const roomModuleText = await roomTextPromise;
    const innerModuleText = await innerTextPromise;
    for (let [moduleName, moduleConfig] of Object.entries(moduleDescriptors)) {
        if (!moduleConfig)
            continue;
        if (moduleConfig.type === "json") {
            sandboxDescriptor[moduleName] = { type: "json", source: moduleConfig.source };
            continue;
        }
        if (moduleConfig.type === "text") {
            sandboxDescriptor[moduleName] = { type: "text", source: moduleConfig.source };
            continue;
        }
        if (moduleConfig.type === "bin") {
            sandboxDescriptor[moduleName] = { type: "bin", source: moduleConfig.source };
            continue;
        }
        if (moduleName in innerModulesAsync) {
            if (moduleConfig?.source)
                throw new Error("overriding inner module: " + moduleName);
            const source = await innerModulesAsync[moduleName];
            sandboxDescriptor[moduleName] = { type: "js", source, links: ["varhub:room", "varhub:config"], evaluate: Boolean(moduleConfig?.evaluate) };
        }
        else {
            const source = moduleConfig?.source ?? "";
            if (!source)
                throw new Error("empty module: " + moduleName);
            sandboxDescriptor[moduleName] = { type: "js", source, links: [...names, "varhub:room", "varhub:config"], evaluate: moduleConfig?.evaluate };
        }
        if (moduleConfig?.hooks) {
            if (Array.isArray(moduleConfig?.hooks)) {
                for (const alias of moduleConfig.hooks) {
                    registerAlias(alias, moduleName, alias);
                }
            }
            else if (moduleConfig?.hooks === "*") {
                if (starInvokeHandler != null) {
                    throw new Error(`alias * overlap: in ${module}, ${starInvokeHandler}`);
                }
                starInvokeHandler = moduleName;
            }
            else {
                for (const [alias, functionName] of Object.entries(moduleConfig.hooks)) {
                    if (functionName === true) {
                        registerAlias(alias, moduleName, alias);
                    }
                    else if (typeof functionName === "string") {
                        registerAlias(alias, moduleName, functionName);
                    }
                }
            }
        }
    }
    if (config === undefined) {
        sandboxDescriptor["varhub:config"] = { type: "js", source: "export default undefined" };
    }
    else {
        sandboxDescriptor["varhub:config"] = { type: "json", source: JSON.stringify(config) };
    }
    sandboxDescriptor["varhub:room"] = { type: "js", source: roomModuleText, links: ["varhub:inner"] };
    sandboxDescriptor["varhub:inner"] = { type: "js", source: innerModuleText, links: [], evaluate: true };
    const sandbox = await ModuleSandbox.create(sandboxDescriptor, {
        stdout: "pipe",
        stderr: "pipe",
        maxOldGenerationSizeMb: 100,
        contextHooks: ["console", "EventTarget", "Event", "performance"],
    });
    const eventEmitter = new EventEmitter();
    const emit = eventEmitter.emit.bind(eventEmitter);
    const mappingOfInit = { mapping: "link", responseMapping: "ignore", hookMode: { mapping: "json", responseMapping: "ignore", noThis: true } };
    await sandbox?.invoke("varhub:inner", "init", undefined, [emit], mappingOfInit);
    const publicType = "sandbox-" + integrity;
    // add events
    eventEmitter.on("setPublic", (value) => {
        room.setPublicType(value ? publicType : null);
    });
    eventEmitter.on("send", (target, ...message) => {
        // todo: GET CLIENTS AND SEND MESSAGE
    });
    // toom events
    room.on("memberCreate", (ref, ...args) => {
    });
    sandbox.once("exit", () => room.destroy());
    room.once("destroy", () => {
        eventEmitter.removeAllListeners();
        sandbox.kill();
    });
}
