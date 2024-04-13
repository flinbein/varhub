import { Room } from "../varhub/Room.js";
import { Connection } from "../varhub/Connection.js";

export interface RPCHandler {
	/**
	 * @param connection
	 * @param args
	 * @returns undefined if rpc can not be handled, function - if it can be handled
	 */
	(connection: Connection, ...args: unknown[]): null | void | ((connection: Connection, ...args: unknown[]) => any);
}
export class RPCController implements Disposable {
	readonly #room: Room;
	readonly #handlers: RPCHandler[] = [];
	#disposed = false;
	
	constructor(room: Room) {
		this.#room = room;
		room.on("connectionMessage", this.#connectionMessageHandler);
		room.on("destroy", () => this[Symbol.dispose]());
	}
	
	get room(){
		return this.#room;
	}
	
	#connectionMessageHandler = async (connection: Connection, ...args: any[]) => {
		if (args.length < 2) return;
		const [rpcMark, rpcId, ...rpcArgs] = args;
		if (rpcMark !== "$rpc") return;
		let executor: null | void | ((connection: Connection, ...args: any[]) => any) = undefined;
		for (let handler of this.#handlers) {
			executor = handler(connection, ...rpcArgs);
			if (typeof executor === "function") break;
		}
		if (typeof executor !== "function") return void connection.sendEvent("$rpcResult", rpcId, 2, executor);
		try {
			const syncResult = executor(connection, ...rpcArgs);
			const result = (syncResult instanceof Promise) ? await syncResult : syncResult;
			connection.sendEvent("$rpcResult", rpcId, 0, result);
		} catch (error) {
			connection.sendEvent("$rpcResult", rpcId, 1, error);
		}
	}
	
	addHandler(...handlers: RPCHandler[]): this {
		if (this.#disposed) return this;
		this.#handlers.push(...handlers);
		return this;
	}
	
	prependHandler(...handlers: RPCHandler[]): this {
		if (this.#disposed) return this;
		this.#handlers.unshift(...handlers);
		return this;
	}
	
	removeHandler(...handlers: RPCHandler[]): this {
		if (this.#disposed) return this;
		for (let handler of handlers) {
			const index = this.#handlers.indexOf(handler);
			if (index !== -1) this.#handlers.splice(index, 1);
		}
		return this;
	}
	
	getRpcArgs(...args: any[]){
		return ["$rpcEvent", ...args];
	}
	
	static sendRpcEvent(member: Connection, ...args: any[]){
		member.sendEvent("$rpcEvent", ...args);
	}
	
	[Symbol.dispose](){
		this.#disposed = true;
		this.#room.off("connectionMessage", this.#connectionMessageHandler);
		this.#handlers.length = 0;
	}
}
