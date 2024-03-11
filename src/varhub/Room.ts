import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Member } from "./Member.js";
import { LOG_LEVEL } from "../types.js";

interface EventRef<T> {
	current: T,
	success: boolean
}

type RoomEvents = {
	destroy: [],
	changePublicType: [string|null],
	memberCreate: [ref: EventRef<boolean|Promise<boolean>>, ...args: unknown[]],
	memberJoin: [member: Member, ...args: unknown[]],
	memberLeave: [member: Member, ...args: unknown[]],
	memberCall: [member: Member, ref: EventRef<unknown>, ...args: unknown[]],
	log: [level: LOG_LEVEL, message: string],
}
export class Room extends TypedEventEmitter<RoomEvents> {
	readonly #members = new Set<Member>;
	#destroyed = false
	#publicType: string|null = null;
	publicValue: unknown = null;
	#destroyTimer: null|ReturnType<typeof setTimeout> = null;
	
	setTimeToLive(ttl: number|null){
		this.#clearTimeToLive();
		if (ttl && ttl > 0) this.#destroyTimer = setTimeout(() => this.destroy(), ttl)
	}
	
	#clearTimeToLive(){
		if (this.#destroyTimer != null) clearTimeout(this.#destroyTimer);
		this.#destroyTimer = null;
	}
	
	constructor() {
		super();
	}
	
	get destroyed(): boolean {
		return this.#destroyed;
	}
	
	get publicType(): string|null {
		return this.#publicType;
	}
	
	log(level: LOG_LEVEL, message: string){
		this.emit("log", level, message);
	}
	
	async createMember(...args: unknown[]): Promise<Member|null> {
		if (this.destroyed) throw new Error("can not create member in destroyed room");
		const ref = {current: true as boolean|Promise<boolean>, success: true};
		this.emit("memberCreate", ref, ...args);
		if (!ref.success) throw ref.current;
		const success = await ref.current;
		if (!success) return null;
		const member: Member = new Member((...args: unknown[]) => this.#onMemberCall(member, ...args));
		this.#members.add(member);
		member.on("disconnect", (...args) => this.#onMemberDisconnect(member, ...args));
		this.emit("memberJoin", member, ...args);
		return member;
	}
	
	destroy(){
		if (this.destroyed) return;
		this.#destroyed = true;
		this.emit("destroy");
		for (let member of this.#members) {
			member.disconnect();
		}
	}
	
	getMembers(): ReadonlySet<Member> {
		return this.#members;
	}
	
	#onMemberCall(member: Member, ...args: unknown[]): unknown {
		if (!this.#members.has(member)) throw new Error("member not in room");
		const ref = {current: notImplementedError, success: false};
		this.emit("memberCall", member, ref, ...args);
		return ref.current;
	}
	
	setPublicType(value: string|null){
		if (this.#publicType === value) return;
		this.#publicType = value;
		this.emit("changePublicType", value);
	}
	
	#onMemberDisconnect(member: Member, ...args: unknown[]){
		this.#members.delete(member);
		this.emit("memberLeave", member, ...args);
	}
}
const notImplementedError = new Error("method not implemented")
