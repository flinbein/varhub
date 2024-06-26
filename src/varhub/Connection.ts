import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Room } from "./Room.js";

type MemberEvents = {
	disconnect: [online: boolean, reason: string|null],
	event: [...args: any[]],
	join: [],
}
export class Connection extends TypedEventEmitter<MemberEvents> {
	readonly #call: (...args: unknown[]) => void;
	readonly #enter: (...args: unknown[]) => void;
	readonly #id: number;
	readonly #room: Room;
	#status: "new" | "lobby" | "joined" | "disconnected" = "new";
	#connectionJoinListener = (member: Connection) => {
		if (member !== this) return;
		this.#status = "joined";
		this.emit("join");
	};
	
	get status(){
		return this.#status;
	}
	#connectionClosedListener = (member: Connection, online: boolean, reason: string|null) => {
		if (member !== this) return;
		this.#onDisconnect(reason);
	}
	
	#roomDestroyListener = () => {
		this.#onDisconnect("room destroyed");
	}
	
	constructor(room: Room, id: number, call: (...args: unknown[]) => void, enter: (...args: unknown[]) => void) {
		super();
		this.#id = id;
		this.#call = call;
		this.#room = room;
		this.#enter = enter;
		room.prependListener("connectionJoin", this.#connectionJoinListener);
		room.prependListener("connectionClosed", this.#connectionClosedListener);
		room.prependListener("destroy", this.#roomDestroyListener);
	}
	
	get id(){
		return this.#id;
	}
	get connected(){
		return this.#status === "joined" || this.#status === "lobby";
	}
	
	enter(...args: unknown[]): this {
		if (this.#status !== "new") throw new Error("wrong connections status");
		this.#status = "lobby";
		this.#enter(...args);
		return this;
	}
	
	message(...args: unknown[]): void {
		return this.#call(...args);
	}
	
	sendEvent(...args: any[]){
		this.emit("event", ...args);
	}
	
	leave(reason: string|null = null){
		this.#room.kick(this, reason);
	}
	
	#onDisconnect(reason: string|null){
		if (this.#status === "disconnected") return;
		this.#room.off("connectionJoin", this.#connectionJoinListener);
		this.#room.off("connectionClosed", this.#connectionClosedListener);
		this.#room.off("destroy", this.#roomDestroyListener);
		const online = this.#status === "joined"
		this.#status = "disconnected";
		this.emit("disconnect", online, reason);
		this.removeAllListeners();
	}
}
