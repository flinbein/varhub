import { TypedEventEmitter } from "../index.js";
export class PlayerController extends TypedEventEmitter {
    #room;
    #players = new Map();
    #idOfPlayer = new WeakMap();
    #passwordOfPlayer = new WeakMap();
    #playerOfConnection = new WeakMap();
    closed = false;
    constructor(room) {
        super();
        this.#room = room;
        room.on("connectionEnter", (connection, ...args) => {
            if (args.length < 1)
                return room.kick(connection, "wrong player id");
            const [id = null, password = "", config] = args;
            if (typeof id !== "string")
                return room.kick(connection, "wrong player id");
            if (typeof password !== "string")
                return room.kick(connection, "wrong player password");
            const player = this.#players.get(id);
            if (player) {
                const pass = this.#passwordOfPlayer.get(player);
                if (pass !== password) {
                    if (this.closed)
                        return room.kick(connection, "room is closed");
                    return room.kick(connection, "wrong password");
                }
                this.#playerOfConnection.set(connection, player);
                const online = player.online;
                player.addConnection(connection);
                room.join(connection);
                if (!online)
                    this.emit("online", player);
                return;
            }
            if (this.closed)
                return room.kick(connection, "room is closed");
            // new player
            const newPlayer = new Player(id, config);
            this.#players.set(id, newPlayer);
            this.#idOfPlayer.set(newPlayer, id);
            this.#passwordOfPlayer.set(newPlayer, password);
            this.#playerOfConnection.set(connection, newPlayer);
            newPlayer.addConnection(connection);
            this.emit("join", newPlayer);
            room.join(connection);
        });
        room.on("connectionClosed", (connection) => {
            const player = this.#playerOfConnection.get(connection);
            if (!player)
                return;
            for (let con of player.getConnections()) {
                if (con === connection)
                    continue;
                return;
            }
            this.emit("offline", player);
        });
    }
    kick(player, reason = null) {
        const id = this.#idOfPlayer.get(player);
        if (id == undefined)
            return false;
        this.#players.delete(id);
        this.#idOfPlayer.delete(player);
        this.#passwordOfPlayer.delete(player);
        for (let connection of player.getConnections()) {
            connection.leave(reason);
        }
        this.emit("leave", player);
        return true;
    }
    getPlayers() {
        return new Map(this.#players);
    }
    getPlayerById(id) {
        return this.#players.get(id) ?? null;
    }
    getPlayerId(player) {
        return this.#idOfPlayer.get(player) ?? null;
    }
    getPlayerOfConnection(connection) {
        return this.#playerOfConnection.get(connection) ?? null;
    }
    broadcastEvent(...args) {
        for (let player of this.#players.values()) {
            player.sendEvent(...args);
        }
    }
}
export class Player {
    config;
    #connections = new Set();
    #id;
    constructor(id, config) {
        this.config = config;
        this.#id = id;
    }
    get id() { return this.#id; }
    ;
    get online() {
        return this.#connections.size > 0;
    }
    addConnection(connection) {
        this.#connections.add(connection);
        connection.on("disconnect", () => this.#removeConnection(connection));
    }
    #removeConnection(connection) {
        this.#connections.delete(connection);
    }
    getConnections() {
        return new Set(this.#connections);
    }
    sendEvent(...args) {
        for (let connection of this.#connections) {
            connection.sendEvent(...args);
        }
    }
}
