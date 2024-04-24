import { Connection } from "./Connection.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Room extends TypedEventEmitter {
    #publicMessage = null;
    #lobbyConnectionsSet = new Set();
    #joinedConnectionsSet = new Set();
    #isDestroyed = false;
    get publicMessage() {
        return this.#publicMessage;
    }
    set publicMessage(msg) {
        const oldMessage = this.#publicMessage;
        if (oldMessage === msg)
            return;
        this.#publicMessage = msg;
        this.emit("messageChange", msg, oldMessage);
    }
    #connectionMessage(connection, ...args) {
        if (!this.#joinedConnectionsSet.has(connection))
            return;
        this.emit("connectionMessage", connection, ...args);
    }
    #connectionId = 0;
    createConnection(...enterArgs) {
        const connectionId = this.#connectionId++;
        const call = (...args) => this.#connectionMessage(connection, ...args);
        const connection = new Connection(this, connectionId, call);
        this.#lobbyConnectionsSet.add(connection);
        this.emit("connectionEnter", connection, ...enterArgs);
        return connection;
    }
    join(connection) {
        if (!this.#lobbyConnectionsSet.has(connection))
            return false;
        this.#lobbyConnectionsSet.delete(connection);
        this.#joinedConnectionsSet.add(connection);
        this.emit("connectionJoin", connection);
        return true;
    }
    kick(connection, message = null) {
        if (!this.#lobbyConnectionsSet.has(connection) && !this.#joinedConnectionsSet.has(connection))
            return false;
        this.#lobbyConnectionsSet.delete(connection);
        const online = this.#joinedConnectionsSet.delete(connection);
        this.emit("connectionClosed", connection, online, message);
        return true;
    }
    getLobbyConnections() {
        return [...this.#lobbyConnectionsSet];
    }
    getJoinedConnections() {
        return [...this.#joinedConnectionsSet];
    }
    get destroyed() {
        return this.#isDestroyed;
    }
    destroy() {
        if (this.#isDestroyed)
            return false;
        this.#isDestroyed = true;
        this.emit("destroy");
        this.removeAllListeners();
        return true;
    }
    [Symbol.dispose]() {
        return this.destroy();
    }
}
