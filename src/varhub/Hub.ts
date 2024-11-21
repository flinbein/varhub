import { MapOfSet } from "../utils/MapOfSet.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Room } from "./Room.js";
import { Brand } from "../types.js";

type RoomId = Brand<string, [Room, "id"]>;
type RoomIntegrityId = Brand<string|null, [Room, "publicId"]>;
type HubEvents = {
	dropRoom: [roomId: RoomId, room: Room],
	addRoom: [roomId: RoomId, room: Room],
}
export class Hub extends TypedEventEmitter<HubEvents> {
	
	#rooms = new Map<RoomId, Room>
	#roomIdIntegrity = new Map<RoomId, RoomIntegrityId>;
	#integrityToRooms = new MapOfSet<RoomIntegrityId, RoomId>;
	#roomToIdSet = new MapOfSet<Room, RoomId>;
	
	addRoom(room: Room, integrity?: string): string | null {
		if (room.destroyed) return null;
		const roomId = generateStringKey(s => !this.#rooms.has(s as any)) as RoomId;
		this.#roomIdIntegrity.set(roomId, integrity as RoomIntegrityId);
		this.#rooms.set(roomId, room);
		if (integrity) this.#integrityToRooms.add(integrity as RoomIntegrityId, roomId);
		room.once("destroy", () => this.#onRoomDrop(roomId, room));
		this.#roomToIdSet.add(room, roomId);
		this.emit("addRoom", roomId, room);
		return roomId;
	}
	
	getRoom(id: string): Room | undefined {
		return this.#rooms.get(id as RoomId);
	}
	
	getRoomIntegrity(id: string): string | undefined {
		return this.#roomIdIntegrity.get(id as RoomId);
	}
	
	dropRoom(id: string): boolean {
		const room = this.getRoom(id);
		if (!room) return false;
		this.#onRoomDrop(id as RoomId, room);
		return true;
		
	}
	
	getRooms(): ReadonlySet<string> {
		return new Set(this.#rooms.keys());
	}
	
	getRegisteredId(room: Room): ReadonlySet<string> {
		return new Set(this.#roomToIdSet.get(room));
	}
	
	getRoomsByIntegrity(integrity: string): ReadonlySet<string> {
		return new Set(this.#integrityToRooms.get(integrity as RoomIntegrityId) ?? null);
	}
	
	#onRoomDrop(roomId: RoomId, room: Room){
		const roomIsDeleted = this.#rooms.delete(roomId);
		if (!roomIsDeleted) return;
		const integrity = this.#roomIdIntegrity.get(roomId);
		this.#roomIdIntegrity.delete(roomId);
		if (integrity != null) this.#integrityToRooms.delete(integrity, roomId);
		this.#roomToIdSet.delete(room, roomId);
		this.emit("dropRoom", roomId, room);
	}
}

function generateStringKey(check: (s: string) => boolean, length: number = 5, pattern = "0123456789"){
	while (true) {
		const id = Array.from({length}).map(() => pattern.at(Math.floor(Math.random() * pattern.length))).join("");
		if (check(id)) return id;
		length++;
	}
}
