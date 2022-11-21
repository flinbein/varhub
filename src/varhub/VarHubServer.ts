import type { WebSocketServer, WebSocket } from "ws";
import { VarHubClient } from "./VarHubClient.js";
import { Room } from "./Room.js";
import * as process from "process";
import { InPackage, InPackageType } from "./utils/Package.js";
import { Buffer } from "buffer";
import { checkForm, DataForm } from "./utils/convertArgs.js";

export class VarHubServer {
	
	private readonly rooms = new Map<string, Room>();
	private readonly clientInRoomMap = new Map<VarHubClient, [Room, string]>();
	private readonly startTime: [number, number] = process.hrtime()
	
	constructor(private readonly wss: WebSocketServer) {
		
		wss.on("connection", (connection: WebSocket) => {
			connection.binaryType = "nodebuffer";
			new VarHubClient(connection, this);
		});
	}
	
	public getUptimeMs(): number {
		const [s, ns] = process.hrtime(this.startTime);
		return s * 1000 + ns / 1000000;
	}
	
	public getClientRoomAndName(client: VarHubClient) {
		return this.clientInRoomMap.get(client) ?? [null, null];
	}
	
	private generateFreeRoomId() {
		let length = 5;
		while (true) {
			const id = Array.from({length})
			.fill(null)
			.map((_, index) => index > 0 ? Math.floor(Math.random() * 10) : Math.floor(1 + Math.random() * 9) )
			.join("");
			if (!this.rooms.has(id)) return id;
			length += 1;
		}
	}
	
	private createRoom(data: DataForm<typeof CREATE_ROOM_PACKET_FORM>){
	
	}
	
	handleInPackage(client: VarHubClient, inPackage: InPackage): string | Buffer | ArrayBufferView {
		if (inPackage.type === InPackageType.TIME_SYNC) return Float64Array.of(this.getUptimeMs());
		if (inPackage.type === InPackageType.CREATE_ROOM) return this.handleCreateRoom(client, inPackage);
		// todo: create room | find room | join room
		const [room] = this.getClientRoomAndName(client);
		if (!room) throw new Error("you still haven't joined the room");
		return room.handleInPackage(client, inPackage);
	}
	
	handleCreateRoom(client: VarHubClient, inPackage: InPackage): string {
		const data: unknown = JSON.parse(inPackage.data.toString("utf-8"));
		if (!checkForm(CREATE_ROOM_PACKET_FORM, data)) throw new Error("wrong packet data format");
		
		this.generateFreeRoomId();
		return JSON.stringify({
		
		})
	}
}

const CREATE_ROOM_PACKET_FORM = {
	title: "string?",
	password: "string?",
	adminPassword: "string?",
	player: "string",
	type: "string",
	controller: "string"
} as const
