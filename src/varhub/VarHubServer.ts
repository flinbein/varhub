import type { WebSocketServer } from "ws";
import { RPCWSServer } from "../RPCWSServer.js";
import { RPCWSClient } from "../RPCWSClient.js";
import { XJData } from "../utils/XJMapper.js";
import T from "../utils/TypeCheck.js";

const isCreateRoom = T({
	name: T.string,
	value: [T.string, T.number, T.optionalOf(T.string)]
})

export class VarHubServer extends RPCWSServer {
	
	constructor(wss: WebSocketServer) {
		super(wss, (...args) => this.handler(...args));
	}
	
	async handler(client: RPCWSClient, methodName: string, args: readonly XJData[]): Promise<XJData[]|void> {
		const method = this.methods[methodName];
		if (method) return method(client, ...args);
		// todo: other methods
		throw new Error("unknown method "+methodName);
	}
	
	private methods: Partial<Record<string, (client: RPCWSClient, ...args: XJData[]) => XJData[]|void | Promise<XJData[]|void>>> = {
		$$create(client: RPCWSClient, data: XJData){
			if(!isCreateRoom(data)) throw new Error("wrong format");
			data.value
			// todo
		},
		$$join(client: RPCWSClient, data: XJData){
			// todo
		}
	}
	
}
