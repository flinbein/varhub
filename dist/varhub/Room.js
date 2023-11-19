import { URL } from "node:url";
import { readFile } from "node:fs";
import ModuleSandbox from "sandboxer";
import T from "t-type-check";
import { getStableHash } from "../utils/getStableHash.js";
const roomTextPromise = asyncReadFile("./controller/$room.js", "utf-8");
const innerTextPromise = asyncReadFile("./controller/$inner.js", "utf-8");
const innerModulesAsync = {
    "inner:timer": asyncReadFile("./controller/timer.js", "utf-8")
};
const isInvokeArgs = T.listPartOf([T.string]);
const isRoomJsModule = T({
    type: "js",
    source: T.string.optional,
    evaluate: T.bool.optional,
    hooks: T(T.mapOf(T.string, T.bool), T.arrayOf(T.string)).optional
});
const isRoomJsonModule = T({
    type: "json",
    source: T.string,
});
const isRoomModule = T(isRoomJsModule, isRoomJsonModule);
const isClientOrClientList = T(T.string, T.arrayOf(T.string));
export const isRoomCreateData = T({
    modules: T.mapOf(isRoomModule),
    config: T.any,
    integrityRequired: T.bool.optional
});
function asyncReadFile(modulePath, encoding) {
    const filePath = import.meta.resolve(modulePath);
    const fileUrl = new URL(filePath);
    return new Promise((resolve, reject) => {
        readFile(fileUrl, encoding, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
}
const defaultRoomOptions = {
    ttlOnInit: 10 * 1000,
    ttlOnEmpty: 15 * 60 * 1000
};
export class Room {
    #onCloseHook;
    #onKickHook;
    #onEventHook;
    #clients = new Set();
    #remoteClientIdMap = new Map();
    #aliases = new Map();
    #sandbox;
    #lifeTimer = null;
    #options;
    #status = "new";
    #hash = null;
    #integrityRequired = false;
    get status() {
        return this.#status;
    }
    get integrityRequired() {
        return this.#integrityRequired;
    }
    get hash() {
        return this.#hash;
    }
    #setLifeToLive(ttl) {
        this.#clearTimeToLive();
        this.#lifeTimer = setTimeout(() => this.close("room timeout"), ttl);
    }
    #clearTimeToLive() {
        if (this.#lifeTimer != null)
            clearTimeout(this.#lifeTimer);
        this.#lifeTimer = null;
    }
    getClients() {
        return this.#clients.values();
    }
    constructor(onEvent, onKick, onClose, options = {}) {
        this.#options = { ...defaultRoomOptions, ...options };
        this.#onCloseHook = onClose;
        this.#onKickHook = onKick;
        this.#onEventHook = onEvent;
    }
    #registerAlias(alias, module, functionName) {
        if (this.#aliases.has(alias)) {
            throw new Error(`alias overlap: ${alias} in ${this.#aliases.get(alias)?.[0]}, ${module}`);
        }
        this.#aliases.set(alias, [module, functionName]);
    }
    async init(data) {
        try {
            this.#status = "init";
            const result = await this._init(data);
            this.#status = "ready";
            return result;
        }
        catch (error) {
            this.#status = "error";
            throw error;
        }
    }
    async _init({ modules: moduleDescriptors, config, integrityRequired }) {
        const names = Object.keys(moduleDescriptors);
        const hashObject = { modules: {}, alias: {} };
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
                hashObject.modules[moduleName] = ["json", moduleConfig.source];
                continue;
            }
            if (moduleName in innerModulesAsync) {
                if (moduleConfig?.source)
                    throw new Error("overriding inner module: " + moduleName);
                const source = await innerModulesAsync[moduleName];
                sandboxDescriptor[moduleName] = { type: "js", source, links: ["varhub:room", "varhub:config"], evaluate: Boolean(moduleConfig?.evaluate) };
                hashObject.modules[moduleName] = ["js", source, Boolean(moduleConfig?.evaluate)];
            }
            else {
                const source = moduleConfig?.source ?? "";
                if (!source)
                    throw new Error("empty module: " + moduleName);
                sandboxDescriptor[moduleName] = { type: "js", source, links: [...names, "varhub:room", "varhub:config"], evaluate: moduleConfig?.evaluate };
                hashObject[moduleName] = ["js", source, Boolean(moduleConfig?.evaluate)];
            }
            if (moduleConfig?.hooks) {
                if (Array.isArray(moduleConfig?.hooks)) {
                    for (const alias of moduleConfig.hooks) {
                        this.#registerAlias(alias, moduleName, alias);
                        hashObject.alias[alias] = [moduleName, alias];
                    }
                }
                else {
                    for (const [alias, functionName] of Object.entries(moduleConfig.hooks)) {
                        if (functionName === true) {
                            this.#registerAlias(alias, moduleName, alias);
                            hashObject.alias[alias] = [moduleName, alias];
                        }
                        else if (typeof functionName === "string") {
                            this.#registerAlias(alias, moduleName, functionName);
                            hashObject.alias[alias] = [moduleName, functionName];
                        }
                    }
                }
            }
        }
        if (config !== undefined) {
            sandboxDescriptor["varhub:config"] = { type: "json", source: JSON.stringify(config) };
        }
        sandboxDescriptor["varhub:room"] = { type: "js", source: roomModuleText, links: ["varhub:inner"] };
        sandboxDescriptor["varhub:inner"] = { type: "js", source: innerModuleText, links: [], evaluate: true };
        this.#sandbox = await ModuleSandbox.create(sandboxDescriptor, {
            stdout: 1,
            stderr: 2,
            contextHooks: ["console", "EventTarget", "Event", "performance"],
        });
        this.#sandbox?.once("exit", (reason) => this.close(reason));
        const hooks = {
            kick: (clientId, reason) => { this.#onKickHook(String(clientId), String(reason)); },
            send: (clientId, ...data) => {
                this.#onEventHook(isClientOrClientList.assert(clientId), ...data);
            },
            close: (reason) => { this.close(String(reason)); }
        };
        const mappingOfInit = { mapping: "link", responseMapping: "ignore", hookMode: { mapping: "json", responseMapping: "ignore", noThis: true } };
        await this.#sandbox?.invoke("varhub:inner", "init", undefined, [hooks], mappingOfInit);
        this.#hash = getStableHash(hashObject, "sha256", "hex");
        this.#integrityRequired = Boolean(integrityRequired);
        this.#setLifeToLive(this.#options.ttlOnInit);
    }
    async addClient(clientId, ...message) {
        const remoteClientPromise = this.#sandbox.invoke("varhub:inner", "onJoin", undefined, [clientId, ...message], { mapping: "process", responseMapping: "ref" });
        let remoteClient;
        try {
            remoteClient = await remoteClientPromise;
        }
        catch (eRef) {
            throw await this.#sandbox?.invoke("varhub:inner", "deref", undefined, [eRef], {
                mapping: "link",
                responseMapping: "process"
            });
        }
        if (!remoteClient)
            return false;
        this.#clients.add(clientId);
        this.#remoteClientIdMap.set(clientId, remoteClient);
        this.#clearTimeToLive();
        return true;
    }
    removeClient(clientId) {
        const hasClient = this.#clients.delete(clientId);
        if (hasClient) {
            const remoteClient = this.#remoteClientIdMap.get(clientId);
            this.#sandbox?.invoke("varhub:inner", "onLeave", undefined, [clientId, remoteClient], { mapping: "link", responseMapping: "ignore" });
        }
        this.#remoteClientIdMap.delete(clientId);
        if (this.#clients.size === 0)
            this.#setLifeToLive(this.#options.ttlOnEmpty);
        return hasClient;
    }
    async call(clientId, ...args) {
        const [alias, ...invokeArgs] = isInvokeArgs.assert(args, 'wrong call-module format');
        const callbackPath = this.#aliases.get(alias);
        if (!callbackPath)
            throw new Error("no registered function with this alias: " + alias);
        const [moduleName, methodName] = callbackPath;
        const client = this.#remoteClientIdMap.get(clientId);
        return this.#sandbox?.invoke(moduleName, methodName, { client }, invokeArgs, { mapping: "link", responseMapping: "process" });
    }
    close(reason) {
        if (this.#status === "closed")
            return;
        this.#status = "closed";
        this.#clearTimeToLive();
        this.#sandbox?.kill();
        this.#onCloseHook(reason);
    }
}
