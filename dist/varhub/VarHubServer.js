import T from "@flinbein/t-type-check";
import { Room_, isRoomCreateData } from "./Room_.js";
import EventEmitter from "events";
const isCommandData = T.listPartOf([T("room", "join", "call", "list", "info")]);
export class VarHubServer extends EventEmitter {
    #clients = new Map();
    #rooms = new Map();
    #roomHash = new Map();
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
            return this.#commandRoom(client, id, args[0]);
        if (cmd === "join")
            return this.#commandJoin(client, id, ...args);
        if (cmd === "call")
            return this.#commandCall(client, id, ...args);
        if (cmd === "list")
            return this.#commandList(client, id, ...args);
        if (cmd === "info")
            return this.#commandInfo(client, id, ...args);
        throw new Error("unknown command");
    }
    async #commandRoom(client, clientId, data) {
        const roomData = isRoomCreateData.assert(data, "wrong `room` format");
        const id = this.generateRoomId();
        try {
            this.#rooms.set(id, null);
            const room = new Room_({});
            room.on("event", (clients, ...data) => this.#onRoomEvent(room, id, clients, ...data));
            room.on("kick", (client, reason) => this.#onRoomKick(room, id, client, reason));
            room.on("close", (reason) => this.#onRoomClose(room, id, reason));
            room.on("publish", (value) => this.#onRoomPublish(room, id, value));
            await room.init(roomData);
            this.#rooms.set(id, room);
            this.emit("clientCreateRoom", clientId, client, room, data);
            return [id, room.integrity];
        }
        catch (e) {
            this.#rooms.delete(id);
            throw e;
        }
    }
    async #commandInfo(client, clientId, ...args) {
        const roomId = T.string.assert(args[0]);
        const integrity = T.string.optional.assert(args[1]);
        const room = this.#rooms.get(roomId);
        if (!room || !room.public)
            throw new Error("wrong room id: " + roomId);
        if (room.integrityRequired) {
            if (room.integrity !== integrity)
                throw new Error("room integrity key mismatch");
        }
        return room.publicMessage;
    }
    async #commandList(client, clientId, ...args) {
        const integrity = T.string.assert(args[0]);
        const result = {};
        const publicRooms = this.#roomHash.get(integrity);
        if (publicRooms)
            for (const roomId of publicRooms) {
                const room = this.#rooms.get(roomId);
                if (room)
                    result[roomId] = room.publicMessage;
            }
        return result;
    }
    #onRoomPublish(room, id, value) {
        const integrity = room.integrity;
        if (value) { // add
            if (!this.#roomHash.has(integrity))
                this.#roomHash.set(integrity, new Set());
            const publicRooms = this.#roomHash.get(integrity);
            publicRooms?.add(id);
        }
        else {
            if (this.#roomHash.has(integrity)) {
                const publicRooms = this.#roomHash.get(integrity);
                publicRooms?.delete(id);
                if (publicRooms?.size === 0)
                    this.#roomHash.delete(integrity);
            }
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
    async #commandJoin(client, clientId, ...args) {
        const [roomId, integrityKey, ...message] = T.listPartOf([T.string, T(T.string, null)]).assert(args, "wrong `join` format");
        if (this.#clientToRoomIdMap.has(client))
            throw new Error("already in room");
        const room = this.#rooms.get(roomId);
        if (!room)
            throw new Error("wrong room id: " + roomId);
        if (!integrityKey && room.integrityRequired)
            throw new Error("room integrity key required");
        if (integrityKey && room.integrity !== integrityKey)
            throw new Error("room integrity key mismatch");
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
    async #commandCall(client, clientId, ...args) {
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
