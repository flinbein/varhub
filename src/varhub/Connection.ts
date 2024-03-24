import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Room } from "./Room.js";

type MemberEvents = {
	disconnect: [online: boolean, reason: string|null],
	event: [...args: any[]],
	join: [],
}
export class Connection extends TypedEventEmitter<MemberEvents> {
	readonly #call: (...args: unknown[]) => void;
	readonly #room: Room;
	#status: "lobby" | "joined" | "disconnected" = "lobby";
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
	
	constructor(room: Room, call: (...args: unknown[]) => unknown) {
		super();
		this.#call = call;
		this.#room = room;
		room.on("connectionJoin", this.#connectionJoinListener);
		room.on("connectionClosed", this.#connectionClosedListener);
		room.on("destroy", this.#roomDestroyListener);
	}
	
	get connected(){
		return this.#status === "joined" || this.#status === "lobby";
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
