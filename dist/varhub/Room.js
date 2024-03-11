import TypedEventEmitter from "../utils/TypedEventEmitter.js";
import { Member } from "./Member.js";
export class Room extends TypedEventEmitter {
    #members = new Set;
    #destroyed = false;
    #publicType = null;
    publicValue = null;
    #destroyTimer = null;
    setTimeToLive(ttl) {
        this.#clearTimeToLive();
        if (ttl && ttl > 0)
            this.#destroyTimer = setTimeout(() => this.destroy(), ttl);
    }
    #clearTimeToLive() {
        if (this.#destroyTimer != null)
            clearTimeout(this.#destroyTimer);
        this.#destroyTimer = null;
    }
    constructor() {
        super();
    }
    get destroyed() {
        return this.#destroyed;
    }
    get publicType() {
        return this.#publicType;
    }
    log(level, message) {
        this.emit("log", level, message);
    }
    async createMember(...args) {
        if (this.destroyed)
            throw new Error("can not create member in destroyed room");
        const ref = { current: true, success: true };
        this.emit("memberCreate", ref, ...args);
        if (!ref.success)
            throw ref.current;
        const success = await ref.current;
        if (!success)
            return null;
        const member = new Member((...args) => this.#onMemberCall(member, ...args));
        this.#members.add(member);
        member.on("disconnect", (...args) => this.#onMemberDisconnect(member, ...args));
        this.emit("memberJoin", member, ...args);
        return member;
    }
    destroy() {
        if (this.destroyed)
            return;
        this.#destroyed = true;
        this.emit("destroy");
        for (let member of this.#members) {
            member.disconnect();
        }
    }
    getMembers() {
        return this.#members;
    }
    #onMemberCall(member, ...args) {
        if (!this.#members.has(member))
            throw new Error("member not in room");
        const ref = { current: notImplementedError, success: false };
        this.emit("memberCall", member, ref, ...args);
        return ref.current;
    }
    setPublicType(value) {
        if (this.#publicType === value)
            return;
        this.#publicType = value;
        this.emit("changePublicType", value);
    }
    #onMemberDisconnect(member, ...args) {
        this.#members.delete(member);
        this.emit("memberLeave", member, ...args);
    }
}
const notImplementedError = new Error("method not implemented");
