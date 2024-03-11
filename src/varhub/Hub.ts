import { MapOfSet } from "../utils/MapOfSet.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Room } from "./Room.js";
import { LOG_LEVEL } from "../types.js";

type HubEvents = {
	destroyRoom: [roomId: string, room: Room],
	publishRoom: [roomId: string, room: Room],
	changeRoomPublicType: [roomId: string, room: Room, publicType: string|null],
	addRoom: [roomId: string, room: Room],
	log: [roomId: string, room: Room, level: LOG_LEVEL, message: string],
}
export class Hub extends TypedEventEmitter<HubEvents> {
	
	#rooms = new Map<string, Room>
	#publicRooms = new MapOfSet<string, string>
	#lastRoomPublicType = new WeakMap<Room, string>
	
	addRoom(room: Room): string | null {
		if (room.destroyed) return null;
		const roomId = generateStringKey(s => !this.#rooms.has(s));
		this.#onRoomChangePublicType(roomId, room, room.publicType);
		const onChangePublicType = (value: string|null) => this.#onRoomChangePublicType(roomId, room, value);
		const onLog = (level: LOG_LEVEL, message: string) => this.emit("log", roomId, room, level, message)
		room.on("changePublicType", onChangePublicType );
		room.on("log", onLog);
		room.once("destroy", () => {
			room.off("changePublicType", onChangePublicType);
			room.off("log", onLog);
			this.#onRoomDestroy(roomId, room);
		});
		this.emit("addRoom", roomId, room);
		return roomId;
	}
	
	getRoom(id: string, publicType?: string): Room | undefined {
		const room =  this.#rooms.get(id);
		if (!room) return undefined;
		if (publicType != null && room.publicType !== publicType) return undefined;
		return room;
	}
	
	getPublicRooms(integrity: string): ReadonlySet<string> {
		return this.#publicRooms.get(integrity) ?? new Set;
	}
	
	#onRoomDestroy(roomId: string, room: Room){
		this.#rooms.delete(roomId);
		const lastPublicType = this.#lastRoomPublicType.get(room);
		if (lastPublicType != null) this.#publicRooms.delete(lastPublicType, roomId);
		this.emit("destroyRoom", roomId, room);
	}
	
	#onRoomChangePublicType(roomId: string, room: Room, publicType: string|null){
		const lastPublicType = this.#lastRoomPublicType.get(room);
		if (lastPublicType != null) this.#publicRooms.delete(lastPublicType, roomId);
		if (publicType != null) {
			this.#publicRooms.add(publicType, roomId);
		}
		this.emit("changeRoomPublicType", roomId, room, publicType);
	}
}

function generateStringKey(check: (s: string) => boolean, length: number = 5, pattern = "0123456789"){
	while (true) {
		const id = Array.from({length}).map(() => pattern.at(Math.floor(Math.random() * pattern.length))).join("");
		if (check(id)) return id;
		length++;
	}
}
