import { MapOfSet } from "../utils/MapOfSet.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Hub extends TypedEventEmitter {
    #rooms = new Map;
    #roomIdIntegrity = new Map;
    #integrityOfRooms = new MapOfSet;
    addRoom(room, integrity) {
        if (room.destroyed)
            return null;
        const roomId = generateStringKey(s => !this.#rooms.has(s));
        this.#roomIdIntegrity.set(roomId, integrity);
        this.#rooms.set(roomId, room);
        if (integrity)
            this.#integrityOfRooms.add(integrity, roomId);
        room.once("destroy", () => this.#onRoomDrop(roomId, room));
        this.emit("addRoom", roomId, room);
        return roomId;
    }
    getRoom(id) {
        return this.#rooms.get(id);
    }
    getRoomIntegrity(id) {
        return this.#roomIdIntegrity.get(id);
    }
    dropRoom(id) {
        const room = this.getRoom(id);
        if (!room)
            return false;
        this.#onRoomDrop(id, room);
        return true;
    }
    getRooms() {
        return new Set(this.#rooms.keys());
    }
    getRoomsByIntegrity(integrity) {
        return new Set(this.#integrityOfRooms.get(integrity) ?? null);
    }
    #onRoomDrop(roomId, room) {
        const roomIsDeleted = this.#rooms.delete(roomId);
        if (!roomIsDeleted)
            return;
        const integrity = this.#roomIdIntegrity.get(roomId);
        this.#roomIdIntegrity.delete(roomId);
        if (integrity != null)
            this.#integrityOfRooms.delete(integrity, roomId);
        this.emit("dropRoom", roomId, room);
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
