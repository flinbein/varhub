import { Room } from "../varhub/Room.js";
import { Connection } from "../varhub/Connection.js";
import { TypedEventEmitter } from "../index.js";

export type PlayerControllerEvents = {
	join: [Player]
	leave: [Player]
	online: [Player]
	offline: [Player]
}
export class PlayerController extends TypedEventEmitter<PlayerControllerEvents>{
	readonly #room: Room;
	readonly #players = new Map<string, Player>();
	readonly #idOfPlayer = new WeakMap<Player, string>();
	readonly #passwordOfPlayer = new WeakMap<Player, string>();
	readonly #playerOfConnection = new WeakMap<Connection, Player>();
	closed = false;
	
	constructor(room: Room) {
		super();
		this.#room = room;
		
		room.on("connectionEnter", (connection, ...args) => {
			if (args.length < 1) return room.kick(connection, "wrong player id");
			const [id = null, password = "", config] = args as [any, any, any];
			if (typeof id !== "string") return room.kick(connection, "wrong player id");
			if (typeof password !== "string") return room.kick(connection, "wrong player password");
			
			const player = this.#players.get(id);
			if (player) {
				const pass = this.#passwordOfPlayer.get(player);
				if (pass !== password) {
					if (this.closed) return room.kick(connection, "room is closed");
					return room.kick(connection, "wrong password");
				}
				this.#playerOfConnection.set(connection, player);
				const online = player.online;
				player.addConnection(connection);
				room.join(connection);
				if (!online) this.emit("online", player);
				return;
			}
			if (this.closed) return room.kick(connection, "room is closed");

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
			if (!player) return;
			for (let con of player.getConnections()) {
				if (con === connection) continue;
				return;
			}
			this.emit("offline", player);
		});
	}
	
	kick(player: Player, reason: string|null = null): boolean {
		const id = this.#idOfPlayer.get(player);
		if (id == undefined) return false;
		this.#players.delete(id);
		this.#idOfPlayer.delete(player);
		this.#passwordOfPlayer.delete(player);
		
		for (let connection of player.getConnections()) {
			connection.leave(reason);
		}
		this.emit("leave", player);
		return true;
	}
	
	getPlayers(): Map<string, Player> {
		return new Map(this.#players);
	}
	
	getPlayerById(id: string): Player | null {
		return this.#players.get(id) ?? null;
	}
	
	getPlayerId(player: Player): string | null {
		return this.#idOfPlayer.get(player) ?? null;
	}
	
	getPlayerOfConnection(connection: Connection): Player | null {
		return this.#playerOfConnection.get(connection) ?? null;
	}
	
	broadcastEvent(...args: any){
		for (let player of this.#players.values()) {
			player.sendEvent(...args);
		}
	}
}


export class Player {
	readonly #connections = new Set<Connection>();
	readonly #id: string;
	constructor(id: string, public readonly config: any) {
		this.#id = id;
	}
	
	get id() {return this.#id};
	
	get online(){
		return this.#connections.size > 0;
	}
	
	addConnection(connection: Connection) {
		this.#connections.add(connection);
		connection.on("disconnect", () => this.#removeConnection(connection))
	}
	
	#removeConnection(connection: Connection){
		this.#connections.delete(connection);
	}
	
	getConnections(): Set<Connection> {
		return new Set(this.#connections);
	}
	
	sendEvent(...args: any){
		for (let connection of this.#connections) {
			connection.sendEvent(...args);
		}
	}
}
