import { MapOfSet } from "../utils/MapOfSet.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Hub extends TypedEventEmitter {
    #rooms = new Map;
    #publicRooms = new MapOfSet;
    #lastRoomPublicType = new WeakMap;
    addRoom(room) {
        if (room.destroyed)
            return null;
        const roomId = generateStringKey(s => !this.#rooms.has(s));
        this.#onRoomChangePublicType(roomId, room, room.publicType);
        const onChangePublicType = (value) => this.#onRoomChangePublicType(roomId, room, value);
        const onLog = (level, message) => this.emit("log", roomId, room, level, message);
        room.on("changePublicType", onChangePublicType);
        room.on("log", onLog);
        room.once("destroy", () => {
            room.off("changePublicType", onChangePublicType);
            room.off("log", onLog);
            this.#onRoomDestroy(roomId, room);
        });
        this.emit("addRoom", roomId, room);
        return roomId;
    }
    getRoom(id, publicType) {
        const room = this.#rooms.get(id);
        if (!room)
            return undefined;
        if (publicType != null && room.publicType !== publicType)
            return undefined;
        return room;
    }
    getPublicRooms(integrity) {
        return this.#publicRooms.get(integrity) ?? new Set;
    }
    #onRoomDestroy(roomId, room) {
        this.#rooms.delete(roomId);
        const lastPublicType = this.#lastRoomPublicType.get(room);
        if (lastPublicType != null)
            this.#publicRooms.delete(lastPublicType, roomId);
        this.emit("destroyRoom", roomId, room);
    }
    #onRoomChangePublicType(roomId, room, publicType) {
        const lastPublicType = this.#lastRoomPublicType.get(room);
        if (lastPublicType != null)
            this.#publicRooms.delete(lastPublicType, roomId);
        if (publicType != null) {
            this.#publicRooms.add(publicType, roomId);
        }
        this.emit("changeRoomPublicType", roomId, room, publicType);
    }
}
function generateStringKey(check, length = 5, pattern = "0123456789") {
    while (true) {
        const id = Array.from({ length }).map(() => pattern.at(Math.floor(Math.random() * pattern.length))).join("");
        if (check(id))
            return id;
        length++;
    }
}
