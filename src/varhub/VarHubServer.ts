import type { WebSocketServer } from "ws";
import { RPCWSServer } from "../RPCWSServer.js";
import { RPCWSClient } from "../RPCWSClient.js";
import { XJData } from "../utils/XJMapper.js";
import T from "../utils/TypeCheck.js";
import { Room } from "./Room.js";
import { RegisterClientHandler, VarHubClient } from "./VarHubClient.js";

const isRoomCreateData = T({
	modules: T.mapOf({
		source: T.optionalOf(T.string),
		url: T.optionalOf(T.string),
		evaluate: T.bool
	}),
	pass: T.optionalOf(T.string),
	adminPass: T.optionalOf(T.string)
})



export class VarHubServer extends RPCWSServer {
	
	private rooms = new Map<string, Room|null>();
	
	constructor(wss: WebSocketServer) {
		super(wss, (...args) => this.handler(...args));
	}
	
	async addClient(register: RegisterClientHandler){
		const client = new VarHubClient(this, register, this.#onDisconnect, this.#onMessage);
	}
	
	#onDisconnect = (client: VarHubClient) => {
	
	}
	
	#onMessage = (client: VarHubClient, ...data: any) => {
	
	}
	
	async handler(client: RPCWSClient, methodName: string, ...args: readonly XJData[]): Promise<XJData[]|void> {
		if (methodName === "room") return [await this.createRoom(client, args[0])];
		if (methodName === "join") return [await this.joinRoom(client, args[0], args[1])];
		throw new Error("unknown method "+methodName);
	}
	
	async createRoom(client: RPCWSClient, data: XJData): Promise<XJData>{
		const roomCreateData = T.assert(data, isRoomCreateData);
		const id = this.generateRoomId();
		try {
			this.rooms.set(id, null);
			const room = new Room(this, id);
			await room.init(roomCreateData.modules);
		} catch (e) {
			this.rooms.delete(id);
		}
		return id;
	}
	
	private generateRoomId(){
		let length = 5;
		while (true) {
			const id = Array.from({length}).map(() => Math.floor(Math.random() * 10)).join("");
			if (!this.rooms.has(id)) return id;
			length++;
		}
	}
	
	async joinRoom(client: RPCWSClient, roomId: XJData, pass: XJData){
		return 0;
	}
	
}
