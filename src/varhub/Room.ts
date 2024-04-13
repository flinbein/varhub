import { Connection } from "./Connection.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export interface CallResult {
	type: "success" | "error";
	value: any;
}

export type RoomEvents = {
	messageChange: [string|null, string|null],
	connectionEnter: [Connection, ...any[]]
	connectionMessage: [Connection, ...any[]]
	connectionJoin: [Connection]
	connectionClosed: [member: Connection, online: boolean, message: string|null]
	destroy: [],
}
export class Room extends TypedEventEmitter<RoomEvents> implements Disposable {
	#publicMessage: string | null = null;
	#lobbyConnectionsSet = new Set<Connection>();
	#joinedConnectionsSet = new Set<Connection>();
	#isDestroyed = false;
	
	get publicMessage() : string | null {
		return this.#publicMessage;
	}
	set publicMessage(msg: string | null) {
		const oldMessage = this.#publicMessage;
		if (oldMessage === msg) return;
		this.#publicMessage = msg;
		this.emit("messageChange", msg, oldMessage);
	}
	
	#connectionMessage(connection: Connection, ...args: any[]): void {
		if (!this.#joinedConnectionsSet.has(connection)) return;
		this.emit("connectionMessage", connection, ...args);
	}
	
	createConnection(...enterArgs: any[]): Connection {
		const call = (...args: any[]) => this.#connectionMessage(connection, ...args);
		const connection: Connection = new Connection(this, call);
		this.#lobbyConnectionsSet.add(connection);
		this.emit("connectionEnter", connection, ...enterArgs);
		return connection;
	}
	join(connection: Connection): boolean {
		if (!this.#lobbyConnectionsSet.has(connection)) return false;
		this.#lobbyConnectionsSet.delete(connection);
		this.#joinedConnectionsSet.add(connection);
		this.emit("connectionJoin", connection);
		return true;
	}
	kick(connection: Connection, message: string|null = null): boolean {
		if (!this.#lobbyConnectionsSet.has(connection) && !this.#joinedConnectionsSet.has(connection)) return false;
		this.#lobbyConnectionsSet.delete(connection);
		const online = this.#joinedConnectionsSet.delete(connection);
		this.emit("connectionClosed", connection, online, message);
		return true;
	}
	
	
	getLobbyConnections(): Connection[] {
		return [...this.#lobbyConnectionsSet];
	}
	getJoinedConnections(): Connection[] {
		return [...this.#joinedConnectionsSet];
	}
	
	get destroyed(): boolean {
		return this.#isDestroyed;
	}
	destroy(): boolean {
		if (this.#isDestroyed) return false;
		this.#isDestroyed = true;
		this.emit("destroy");
		this.removeAllListeners();
		return true;
	}
	
	[Symbol.dispose](){
		return this.destroy();
	}
}
