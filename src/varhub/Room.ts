import {URL} from "node:url";
import {readFile} from "node:fs";
import ModuleSandbox from "sandboxer";
import type { TranscodeEncoding } from "node:buffer";

import T, { ResolveTypeChecker } from "../utils/TypeCheck.js";

const roomTextPromise = asyncReadFile("./controller/$room.js", "utf-8");
const innerTextPromise = asyncReadFile("./controller/$inner.js", "utf-8");

const isInvokeArgs = T.listPartOf([T.string])
export const isRoomInitData = T.mapOf({
	source: T.string.optional,
	evaluate: T.bool.optional,
	hooks: T.mapOf(T.string).optional
});
type RoomInitData = ResolveTypeChecker<typeof isRoomInitData>;


function asyncReadFile(modulePath: string, encoding: TranscodeEncoding){
	const filePath = import.meta.resolve(modulePath);
	const fileUrl = new URL(filePath);
	return new Promise<string>((resolve, reject) => {
		readFile(fileUrl, encoding, (err, data) => {
			err ? reject(err) : resolve(data);
		});
	})
}

export class Room {
	readonly #onCloseHook: (reason: string) => void;
	readonly #onKickHook: (client: string, reason: string) => void;
	readonly #onEventHook: (clients: Iterable<string>, ...data: unknown[]) => void;
	readonly #clients: Set<string> = new Set();
	readonly #aliases: Map<string, [string, string]> = new Map();
	#sandbox?: ModuleSandbox<string>;
	
	public getClients(){
		return this.#clients.values();
	}
    
    constructor(
		onEvent: (clients: Iterable<string>, ...data: unknown[]) => void,
		onKick: (client: string, reason: string) => void,
		onClose: (reason: string) => void,
    ) {
		this.#onCloseHook = onClose;
		this.#onKickHook = onKick;
		this.#onEventHook = onEvent;
    }
	
	public async init(data: RoomInitData){
		const names = Object.keys(data);
		if (names.some(name => name.startsWith("varhub:"))) throw new Error("forbidden module domain: `varhub:`")
		const sandboxDescriptor: Parameters<typeof ModuleSandbox.create>[0] = {};
		const roomModuleText = await roomTextPromise;
		const innerModuleText = await innerTextPromise;
		for (let [moduleName, moduleConfig] of Object.entries(data)) {
			sandboxDescriptor[moduleName] = {source: moduleConfig?.source ?? "", links: [...names, "varhub:room"], evaluate: moduleConfig?.evaluate}
			if (moduleConfig?.hooks) {
				for (const [alias, functionName] of Object.entries(moduleConfig.hooks)) {
					if (functionName) this.#aliases.set(alias, [moduleName, functionName]);
				}
				
			}
		}
		sandboxDescriptor["varhub:room"] = {source: roomModuleText, links: ["varhub:inner"]};
		sandboxDescriptor["varhub:inner"] = {source: innerModuleText, links: [], evaluate: true};
		this.#sandbox = await ModuleSandbox.create(sandboxDescriptor);
		
		
		const hooks = {
			kick: (clientId: string, reason:string) => {this.#onKickHook(String(clientId), String(reason))},
			send: (clientId: string, ...data: unknown[]) => {this.#onEventHook(String(clientId), ...data)},
			close: (reason: string) => {this.#onCloseHook(String(reason))}
		}
		const mappingOfInit = {mapping: "link", responseMapping: "ignore", hookMode: {mapping: "process", responseMapping: "ignore"}} as const;
		await this.#sandbox?.invoke("varhub:inner", "init", undefined, [hooks], mappingOfInit);
	}
	
	async addClient(clientId: string, ...message: unknown[]): Promise<unknown> {
		const result = await this.#sandbox?.invoke("varhub:inner", "onJoin", undefined, [clientId, ...message], {mapping: "process", responseMapping: "process"});
		if (!result) return false;
		this.#clients.add(clientId);
		return true;
	}
	
	removeClient(clientId: string): boolean {
		const hasClient = this.#clients.delete(clientId);
		// todo: send to sandbox;
		if (hasClient) {
			this.#sandbox?.invoke("varhub:inner", "onLeave", undefined, [clientId], {mapping: "process", responseMapping: "ignore"});
		}
		void clientId;
		// if (hasClient) this.#onKickHook(clientId, reason); // DO NOT CALL
		return hasClient;
	}
	
	async call(clientId: string, ...args: unknown[]) {
		const [alias, ...invokeArgs] = isInvokeArgs.assert(args, 'wrong call-module format');
		const callbackPath = this.#aliases.get(alias);
		if (!callbackPath) throw new Error("no registered function with this alias: "+alias);
		const [moduleName, methodName] = callbackPath;
		return this.#sandbox?.invoke(moduleName, methodName, {clientId}, invokeArgs, {mapping: "process", responseMapping: "process"});
	}
	
	close(reason: string){
		this.#onCloseHook(reason);
	}
}
