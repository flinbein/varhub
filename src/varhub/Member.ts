import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Room } from "./Room.js";

type MemberEvents = {
	disconnect: [online: boolean, reason: string|null],
	event: [...args: any[]],
	join: [],
}
export class Member extends TypedEventEmitter<MemberEvents> {
	#call: (...args: unknown[]) => void;
	#room: Room;
	#status: "lobby" | "joined" | "disconnected" = "lobby";
	#memberJoinListener = (member: Member) => {
		if (member !== this) return;
		this.#status = "joined";
		this.emit("join");
	};
	
	get status(){
		return this.#status;
	}
	#memberLeaveListener = (member: Member, online: boolean, reason: string|null) => {
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
		room.on("memberJoin", this.#memberJoinListener);
		room.on("memberLeave", this.#memberLeaveListener);
		room.on("destroy", this.#roomDestroyListener);
	}
	
	get connected(){
		return this.#call != null;
	}
	
	message(...args: unknown[]): void {
		return this.#call(...args);
	}
	
	sendEvent(...args: any[]){
		this.emit("event", ...args);
	}
	
	leave(reason: string|null){
		this.#room.kick(this, reason);
	}
	
	#onDisconnect(reason: string|null){
		if (this.#status === "disconnected") return;
		this.#room.off("memberJoin", this.#memberJoinListener);
		this.#room.off("memberLeave", this.#memberLeaveListener);
		this.#room.off("destroy", this.#roomDestroyListener);
		const online = this.#status === "joined"
		this.#status = "disconnected";
		this.emit("disconnect", online, reason);
		this.removeAllListeners();
	}
}
