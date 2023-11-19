import { URL } from "node:url";
import { readFile } from "node:fs";
import ModuleSandbox from "sandboxer";
import T, { ResolveTypeChecker } from "t-type-check";

import type { TranscodeEncoding } from "node:buffer";
import { getStableHash } from "../utils/getStableHash.js";

const roomTextPromise = asyncReadFile("./controller/$room.js", "utf-8");
const innerTextPromise = asyncReadFile("./controller/$inner.js", "utf-8");

const innerModulesAsync: Record<string, Promise<string>> = {
	"inner:timer": asyncReadFile("./controller/timer.js", "utf-8")
}

const isInvokeArgs = T.listPartOf([T.string]);

const isRoomJsModule = T({
	type: "js",
	source: T.string.optional,
	evaluate: T.bool.optional,
	hooks: T(
		T.mapOf(T.string, T.bool),
		T.arrayOf(T.string)
	).optional
})
const isRoomJsonModule = T({
	type: "json",
	source: T.string,
})
const isRoomModule = T(isRoomJsModule, isRoomJsonModule);

const isClientOrClientList = T(T.string,T.arrayOf(T.string));

export const isRoomCreateData = T({
	modules: T.mapOf(isRoomModule),
	config: T.any,
	integrityRequired: T.bool.optional
});

type RoomCreateData = ResolveTypeChecker<typeof isRoomCreateData>;


function asyncReadFile(modulePath: string, encoding: TranscodeEncoding){
	const filePath = import.meta.resolve(modulePath);
	const fileUrl = new URL(filePath);
	return new Promise<string>((resolve, reject) => {
		readFile(fileUrl, encoding, (err, data) => {
			err ? reject(err) : resolve(data);
		});
	})
}

interface RoomOptions {
	ttlOnInit: number
	ttlOnEmpty: number
}
const defaultRoomOptions: RoomOptions = {
	ttlOnInit: 10 * 1000,
	ttlOnEmpty: 15 * 60 * 1000
}

export type RoomStatus = "new"|"init"|"ready"|"closed"|"error"

export class Room {
	readonly #onCloseHook: (reason: string) => void;
	readonly #onKickHook: (client: string, reason: string) => void;
	readonly #onEventHook: (clients: Iterable<string>, ...data: unknown[]) => void;
	readonly #clients: Set<string> = new Set();
	readonly #remoteClientIdMap: Map<string, unknown> = new Map();
	readonly #aliases: Map<string, [string, string]> = new Map();
	#sandbox?: ModuleSandbox<string>;
	#lifeTimer: null|ReturnType<typeof setTimeout> = null
	#options: RoomOptions;
	#status: RoomStatus = "new";
	#hash: string|null = null;
	#integrityRequired: boolean = false;
	
	get status(): RoomStatus{
		return this.#status;
	}
	
	get integrityRequired(): boolean{
		return this.#integrityRequired;
	}
	
	get hash(): string|null{
		return this.#hash;
	}
	
	#setLifeToLive(ttl: number){
		this.#clearTimeToLive()
		this.#lifeTimer = setTimeout(() => this.close("room timeout"), ttl)
	}
	
	#clearTimeToLive(){
		if (this.#lifeTimer != null) clearTimeout(this.#lifeTimer);
		this.#lifeTimer = null;
	}
	
	public getClients(){
		return this.#clients.values();
	}
    
    constructor(
		onEvent: (clients: Iterable<string>, ...data: unknown[]) => void,
		onKick: (client: string, reason: string) => void,
		onClose: (reason: string) => void,
		options: Partial<RoomOptions> = {}
    ) {
		this.#options = {...defaultRoomOptions, ...options};
		this.#onCloseHook = onClose;
		this.#onKickHook = onKick;
		this.#onEventHook = onEvent;
    }
	
	#registerAlias(alias: string, module: string, functionName: string){
		if (this.#aliases.has(alias)) {
			throw new Error(`alias overlap: ${alias} in ${this.#aliases.get(alias)?.[0]}, ${module}`);
		}
		this.#aliases.set(alias, [module, functionName]);
	}
	
	public async init(data: RoomCreateData){
		try {
			this.#status = "init"
			const result = await this._init(data);
			this.#status = "ready"
			return result;
		} catch (error) {
			this.#status = "error"
			throw error;
		}
	}
	
	public async _init({modules: moduleDescriptors, config, integrityRequired}: RoomCreateData){
		const names = Object.keys(moduleDescriptors);
		const hashObject = {modules: {}, alias: {}} as any;
		if (names.some(name => name.startsWith("varhub:"))) throw new Error("forbidden module domain: `varhub:`")
		const sandboxDescriptor: Parameters<typeof ModuleSandbox.create>[0] = {};
		const roomModuleText = await roomTextPromise;
		const innerModuleText = await innerTextPromise;
		for (let [moduleName, moduleConfig] of Object.entries(moduleDescriptors)) {
			if (!moduleConfig) continue;
			if (moduleConfig.type === "json") {
				sandboxDescriptor[moduleName] = {type: "json", source: moduleConfig.source}
				hashObject.modules[moduleName] = ["json", moduleConfig.source];
				continue;
			}
			if (moduleName in innerModulesAsync) {
				if (moduleConfig?.source) throw new Error("overriding inner module: "+moduleName);
				const source = await innerModulesAsync[moduleName];
				sandboxDescriptor[moduleName] = {type: "js", source, links: ["varhub:room", "varhub:config"], evaluate: Boolean(moduleConfig?.evaluate)}
				hashObject.modules[moduleName] = ["js", source, Boolean(moduleConfig?.evaluate)]
			} else {
				const source = moduleConfig?.source ?? "";
				if (!source) throw new Error("empty module: "+moduleName);
				sandboxDescriptor[moduleName] = {type: "js", source, links: [...names, "varhub:room", "varhub:config"], evaluate: moduleConfig?.evaluate}
				hashObject[moduleName] = ["js", source, Boolean(moduleConfig?.evaluate)]
			}
			
			if (moduleConfig?.hooks) {
				if (Array.isArray(moduleConfig?.hooks)) {
					for (const alias of moduleConfig.hooks) {
						this.#registerAlias(alias, moduleName, alias);
						hashObject.alias[alias] = [moduleName, alias];
					}
				} else {
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
			sandboxDescriptor["varhub:config"] = {type: "json", source: JSON.stringify(config)}
		}
		sandboxDescriptor["varhub:room"] = {type: "js", source: roomModuleText, links: ["varhub:inner"]};
		sandboxDescriptor["varhub:inner"] = {type: "js", source: innerModuleText, links: [], evaluate: true};
		this.#sandbox = await ModuleSandbox.create(sandboxDescriptor, {
			stdout: 1,
			stderr: 2,
			contextHooks: ["console", "EventTarget", "Event", "performance"],
		});
		this.#sandbox?.once("exit", (reason) => this.close(reason));
		
		const hooks = {
			kick: (clientId: string, reason:string) => {this.#onKickHook(String(clientId), String(reason))},
			send: (clientId: string | Iterable<string>, ...data: unknown[]) => {
				this.#onEventHook(isClientOrClientList.assert(clientId), ...data);
			},
			close: (reason: string) => {this.close(String(reason))}
		}
		const mappingOfInit = {mapping: "link", responseMapping: "ignore", hookMode: {mapping: "json", responseMapping: "ignore", noThis: true}} as const;
		await this.#sandbox?.invoke("varhub:inner", "init", undefined, [hooks], mappingOfInit);
		this.#hash = getStableHash(hashObject, "sha256", "hex");
		this.#integrityRequired = Boolean(integrityRequired);
		this.#setLifeToLive(this.#options.ttlOnInit);
	}
	
	async addClient(clientId: string, ...message: unknown[]): Promise<unknown> {
		const remoteClientPromise = this.#sandbox!.invoke("varhub:inner", "onJoin", undefined, [clientId, ...message], {mapping: "process", responseMapping: "ref"});
		let remoteClient;
		try {
			remoteClient = await remoteClientPromise;
		} catch (eRef) {
			throw await this.#sandbox?.invoke("varhub:inner", "deref", undefined, [eRef], {
				mapping: "link",
				responseMapping: "process"
			});
		}
		if (!remoteClient) return false;
		this.#clients.add(clientId);
		this.#remoteClientIdMap.set(clientId, remoteClient);
		this.#clearTimeToLive();
		return true;
	}
	
	removeClient(clientId: string): boolean {
		const hasClient = this.#clients.delete(clientId);
		if (hasClient) {
			const remoteClient = this.#remoteClientIdMap.get(clientId);
			this.#sandbox?.invoke("varhub:inner", "onLeave", undefined, [clientId, remoteClient], {mapping: "link", responseMapping: "ignore"});
		}
		this.#remoteClientIdMap.delete(clientId);
		if (this.#clients.size === 0) this.#setLifeToLive(this.#options.ttlOnEmpty);
		return hasClient;
	}
	
	async call(clientId: string, ...args: unknown[]) {
		const [alias, ...invokeArgs] = isInvokeArgs.assert(args, 'wrong call-module format');
		const callbackPath = this.#aliases.get(alias);
		if (!callbackPath) throw new Error("no registered function with this alias: "+alias);
		const [moduleName, methodName] = callbackPath;
		const client = this.#remoteClientIdMap.get(clientId);
		return this.#sandbox?.invoke(moduleName, methodName, {client}, invokeArgs, {mapping: "link", responseMapping: "process"});
	}
	
	close(reason: string){
		if (this.#status === "closed") return;
		this.#status = "closed"
		this.#clearTimeToLive();
		this.#sandbox?.kill();
		this.#onCloseHook(reason);
	}
}
