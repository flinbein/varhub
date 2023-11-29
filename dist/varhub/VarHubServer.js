import T from "@flinbein/t-type-check";
import { Room, isRoomCreateData } from "./Room.js";
import EventEmitter from "events";
const isCommandData = T.listPartOf([T("room", "join", "call")]);
export class VarHubServer extends EventEmitter {
    #clients = new Map();
    #rooms = new Map();
    #clientToRoomIdMap = new WeakMap();
    registerClient(registerClientFn) {
        const id = generateStringKey(s => !this.#clients.has(s), 10, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_");
        const onExitHook = () => this.#onExit(client, id);
        const onCallHook = (...args) => this.#onCall(client, id, ...args);
        const client = registerClientFn(onCallHook, onExitHook);
        this.emit("clientJoin", id, client);
        this.#clients.set(id, client);
        return id;
    }
    getClient(clientId) {
        return this.#clients.get(clientId);
    }
    #onExit(client, id) {
        this.#clients.delete(id);
        this.emit("clientLeave", id, client);
        const roomId = this.#clientToRoomIdMap.get(client);
        if (roomId != null) {
            const room = this.#rooms.get(roomId);
            if (room != null)
                room.removeClient(id);
        }
    }
    async #onCall(client, id, ...data) {
        this.emit("clientCommand", id, client, ...data);
        const [cmd, ...args] = isCommandData.assert(data, "wrong `message` format");
        if (cmd === "room")
            return this.#createRoom(client, id, args[0]);
        if (cmd === "join")
            return this.#joinRoom(client, id, ...args);
        if (cmd === "call")
            return this.#callRoom(client, id, ...args);
    }
    async #createRoom(client, clientId, data) {
        const roomData = isRoomCreateData.assert(data, "wrong `room` format");
        const id = this.generateRoomId();
        try {
            this.#rooms.set(id, null);
            const room = new Room({});
            room.on("event", (clients, ...data) => this.#onRoomEvent(room, id, clients, ...data));
            room.on("kick", (client, reason) => this.#onRoomKick(room, id, client, reason));
            room.on("close", (reason) => this.#onRoomClose(room, id, reason));
            await room.init(roomData);
            this.#rooms.set(id, room);
            this.emit("clientCreateRoom", clientId, client, room, data);
            return [id, room.hash];
        }
        catch (e) {
            this.#rooms.delete(id);
            throw e;
        }
    }
    #onRoomClose = async (room, id, reason) => {
        this.#rooms.delete(id);
        for (let clientId of room.getClients()) {
            this.#clients.get(clientId)?.disconnect(reason);
        }
    };
    #onRoomKick = async (room, roomId, clientId, reason) => {
        this.#clients.get(clientId)?.disconnect(reason);
    };
    #onRoomEvent(room, roomId, clients, ...data) {
        const existClients = new Set(room.getClients());
        for (let clientId of clients) {
            if (!existClients.has(clientId))
                continue;
            this.#clients.get(clientId)?.sendEvent(...data);
        }
    }
    generateRoomId() {
        let length = 5;
        while (true) {
            const id = Array.from({ length }).map(() => Math.floor(Math.random() * 10)).join("");
            if (!this.#rooms.has(id))
                return id;
            length++;
        }
    }
    async #joinRoom(client, clientId, ...args) {
        const [roomId, integrityKey, ...message] = T.listPartOf([T.string, T(T.string, null)]).assert(args, "wrong `join` format");
        if (this.#clientToRoomIdMap.has(client))
            throw new Error("already in room");
        const room = this.#rooms.get(roomId);
        if (!room)
            throw new Error("wrong room id: " + roomId);
        if (!integrityKey && room.integrityRequired)
            throw new Error("room integrity key required");
        if (integrityKey && room.hash !== integrityKey)
            throw new Error("room integrity key mismatched");
        this.#clientToRoomIdMap.set(client, null);
        try {
            const result = await room.addClient(clientId, ...message);
            if (!result) {
                this.#clientToRoomIdMap.delete(client);
                return false;
            }
            this.#clientToRoomIdMap.set(client, roomId);
            return result;
        }
        catch (error) {
            this.#clientToRoomIdMap.delete(client);
            throw error;
        }
    }
    async #callRoom(client, clientId, ...args) {
        const roomId = this.#clientToRoomIdMap.get(client);
        const room = roomId != null ? this.#rooms.get(roomId) : null;
        if (room == null)
            throw new Error("not in room");
        return room.call(clientId, ...args);
    }
}
function generateStringKey(check, length, pattern = "0123456789") {
    while (true) {
        const id = Array.from({ length }).map(() => pattern.at(Math.floor(Math.random() * pattern.length))).join("");
        if (check(id))
            return id;
        length++;
    }
}
