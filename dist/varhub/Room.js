import { Member } from "./Member.js";
import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Room extends TypedEventEmitter {
    #publicMessage = null;
    #lobbyMembersSet = new Set();
    #joinedMembersSet = new Set();
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
    #memberMessage(member, ...args) {
        if (!this.#joinedMembersSet.has(member))
            return;
        this.emit("memberMessage", member, ...args);
    }
    createMember(...enterArgs) {
        const call = (...args) => this.#memberMessage(member, ...args);
        const member = new Member(this, call);
        this.#lobbyMembersSet.add(member);
        this.emit("memberEnter", member, ...enterArgs);
        return member;
    }
    join(member) {
        if (!this.#lobbyMembersSet.has(member))
            return false;
        this.#lobbyMembersSet.delete(member);
        this.#joinedMembersSet.add(member);
        this.emit("memberJoin", member);
        return true;
    }
    kick(member, message = null) {
        if (!this.#lobbyMembersSet.has(member) && !this.#joinedMembersSet.has(member))
            return false;
        this.#lobbyMembersSet.delete(member);
        const online = this.#joinedMembersSet.delete(member);
        this.emit("memberLeave", member, online, message);
        return true;
    }
    getLobbyMembers() {
        return [...this.#lobbyMembersSet];
    }
    getJoinedMembers() {
        return [...this.#joinedMembersSet];
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
}
