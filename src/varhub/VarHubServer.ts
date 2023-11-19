import T from "t-type-check";
import { Room, isRoomInitData } from "./Room.js";

const isRoomCreateData = T({
	modules: isRoomInitData,
	config: T.any
});

const isCommandData = T.listPartOf([T("room","join","call")])

export interface VarHubClient {
	sendEvent(...data: any): void,
	disconnect(message: string): void
}
export interface CreateClient {
	(
		call: (...data: any) => any,
		exit: () => void
	): VarHubClient;
}
export default class VarHubServer {
	
	readonly #clients = new Map<string, VarHubClient>();
	readonly #rooms = new Map<string, Room|null>();
	readonly #clientToRoomIdMap = new WeakMap<VarHubClient, string|null>();
	
	registerClient(registerClientFn: CreateClient): string {
		const id = generateStringKey(s => !this.#clients.has(s), 10, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_");
		const onExitHook = () => this.#onExit(client, id);
		const onCallHook = (...args: unknown[]) => this.#onCall(client, id, ...args);
		const client = registerClientFn(onCallHook, onExitHook)
		this.#clients.set(id, client);
		return id;
	}
	
	getClient(clientId: string){
		return this.#clients.get(clientId);
	}
	
	#onExit(client: VarHubClient, id: string) {
		this.#clients.delete(id);
		const roomId = this.#clientToRoomIdMap.get(client);
		if (roomId != null) {
			const room = this.#rooms.get(roomId);
			if (room != null) room.removeClient(id);
		}
	}
	
	async #onCall(client: VarHubClient, id: string, ...data: unknown[]){
		const [cmd, ...args] = isCommandData.assert(data, "wrong `message` format");
		if (cmd === "room") return this.createRoom(client, id, args[0]);
		if (cmd === "join") return this.joinRoom(client, id, ...args);
		if (cmd === "call") return this.callRoom(client, id, ...args);
	}
	
	async createRoom(client: VarHubClient, clientId: string, data: unknown): Promise<unknown>{
		const roomData = isRoomCreateData.assert(data, "wrong `room` format");
		
		const id = this.generateRoomId();
		try {
			this.#rooms.set(id, null);
			const onCloseHook = (reason: string) => this.#onCloseRoom(room, id, reason);
			const onKickHook = (client: string, reason: string) => this.#onKick(room, id, client, reason);
			const onEventHook = (clients: Iterable<string>, ...data: unknown[]) => this.#onRoomEvent(room, id, clients, ...data);
			const room = new Room(onEventHook, onKickHook, onCloseHook);
			await room.init(roomData.modules, roomData.config);
			this.#rooms.set(id, room);
			return [id, room.hash];
		} catch (e) {
			this.#rooms.delete(id);
			throw e;
		}
	}
	
	#onCloseRoom = async (room: Room, id: string, reason: string) => {
		this.#rooms.delete(id);
		for (let client of room.getClients()) {
			this.#clients.get(id)?.disconnect(reason);
		}
	}
	
	#onKick = async (room: Room, roomId: string, clientId: string, reason: string) => {
		this.#clients.get(clientId)?.disconnect(reason);
	}
	
	#onRoomEvent(room: Room, roomId: string, clients: Iterable<string>, ...data: unknown[]){
		const existClients = new Set(room.getClients());
		for (let clientId of clients) {
			if (!existClients.has(clientId)) continue;
			this.#clients.get(clientId)?.sendEvent(...data);
		}
	}
	
	private generateRoomId(){
		let length = 5;
		while (true) {
			const id = Array.from({length}).map(() => Math.floor(Math.random() * 10)).join("");
			if (!this.#rooms.has(id)) return id;
			length++;
		}
	}
	
	async joinRoom(client: VarHubClient, clientId: string, ...args: unknown[]){
		const [roomId, hash,...message] = T.listPartOf([T.string, T(T.string, null)]).assert(args, "wrong `join` format");
		if (this.#clientToRoomIdMap.has(client)) throw new Error("already in room");
		const room = this.#rooms.get(roomId);
		if (!room) throw new Error("wrong room id: "+ roomId);
		if (hash && room.hash !== hash) throw new Error("room hash mismatched");
		this.#clientToRoomIdMap.set(client, null);
		try {
			const result = await room.addClient(clientId, ...message);
			if (!result) {
				this.#clientToRoomIdMap.delete(client);
				return false;
			}
			this.#clientToRoomIdMap.set(client, roomId);
			return result;
		} catch (error) {
			this.#clientToRoomIdMap.delete(client);
			throw error;
		}
	}
	
	async callRoom(client: VarHubClient, clientId: string, ...args: unknown[]){
		const roomId = this.#clientToRoomIdMap.get(client);
		const room = roomId != null ? this.#rooms.get(roomId) : null;
		if (room == null) throw new Error("not in room");
		return room.call(clientId, ...args);
	}
}


function generateStringKey(check: (s: string) => boolean, length: number, pattern = "0123456789"){
	while (true) {
		const id = Array.from({length}).map(() => pattern.at(Math.floor(Math.random() * pattern.length))).join("");
		if (check(id)) return id;
		length++;
	}
}
