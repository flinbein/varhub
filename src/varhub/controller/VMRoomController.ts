import type { Buffer } from "buffer";
import { RoomController } from "./RoomController.js";
import type { Room } from "../Room.js";


export class VMRoomController extends RoomController {
	
	private module;
	
	constructor(room: Room, protected code: string) {
		super(room);
		this.module = instantiate(wasmData);
	}
	
	
	async onInit(user: string, data: Buffer): Promise<string | Buffer | null> {
		return super.onInit(user, data);
	}
	
	async onUserMessage(user: string, data: Buffer): Promise<string | Buffer | null> {
		return super.onUserMessage(user, data);
	}
	
	async onUserConnect(user: string): Promise<string | Buffer | null> {
		return super.onUserConnect(user);
	}
	
	onUserDisconnect(user: string) {
		super.onUserDisconnect(user);
	}
	
	async onUserReconnect(user: string): Promise<string | Buffer | null> {
		return super.onUserReconnect(user);
	}
}
