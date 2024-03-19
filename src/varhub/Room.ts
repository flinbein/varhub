import { Member } from "./Member.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export interface CallResult {
	type: "success" | "error";
	value: any;
}

export type RoomEvents = {
	messageChange: [string|null, string|null],
	memberEnter: [Member, ...any[]]
	memberMessage: [Member, ...any[]]
	memberJoin: [Member]
	memberLeave: [member: Member, online: boolean, message: string|null]
	destroy: [],
}
export class Room extends TypedEventEmitter<RoomEvents> {
	#publicMessage: string | null = null;
	#lobbyMembersSet = new Set<Member>();
	#joinedMembersSet = new Set<Member>();
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
	
	#memberMessage(member: Member, ...args: any[]): void {
		if (!this.#joinedMembersSet.has(member)) return;
		this.emit("memberMessage", member, ...args);
	}
	
	createMember(...enterArgs: any[]): Member {
		const call = (...args: any[]) => this.#memberMessage(member, ...args);
		const member: Member = new Member(this, call);
		this.#lobbyMembersSet.add(member);
		this.emit("memberEnter", member, ...enterArgs);
		return member;
	}
	join(member: Member): boolean {
		if (!this.#lobbyMembersSet.has(member)) return false;
		this.#lobbyMembersSet.delete(member);
		this.#joinedMembersSet.add(member);
		this.emit("memberJoin", member);
		return true;
	}
	kick(member: Member, message: string|null = null): boolean {
		if (!this.#lobbyMembersSet.has(member) && !this.#joinedMembersSet.has(member)) return false;
		this.#lobbyMembersSet.delete(member);
		const online = this.#joinedMembersSet.delete(member);
		this.emit("memberLeave", member, online, message);
		return true;
	}
	
	
	getLobbyMembers(): Member[] {
		return [...this.#lobbyMembersSet];
	}
	getJoinedMembers(): Member[] {
		return [...this.#joinedMembersSet];
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
}
