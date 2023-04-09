import { Room } from "../Room.js";
import type Buffer from "buffer";

export abstract class RoomController {
	protected constructor(protected room: Room) {}
	
	public async onInit(user: string, data: Buffer): Promise<string | Buffer | null> { return null };
	
	public async onUserMessage(user: string, data: Buffer): Promise<string | Buffer | null> { return null}
	
	public async onUserConnect(user: string): Promise<string | Buffer | null> { return null };
	
	public onUserDisconnect(user: string): void {};
	
	public async onUserReconnect(user: string): Promise<string | Buffer | null> { return null };
}
