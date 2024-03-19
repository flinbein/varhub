import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Member extends TypedEventEmitter {
    #call;
    #room;
    #status = "lobby";
    #memberJoinListener = (member) => {
        if (member !== this)
            return;
        this.#status = "joined";
        this.emit("join");
    };
    get status() {
        return this.#status;
    }
    #memberLeaveListener = (member, online, reason) => {
        if (member !== this)
            return;
        this.#onDisconnect(reason);
    };
    #roomDestroyListener = () => {
        this.#onDisconnect("room destroyed");
    };
    constructor(room, call) {
        super();
        this.#call = call;
        this.#room = room;
        room.on("memberJoin", this.#memberJoinListener);
        room.on("memberLeave", this.#memberLeaveListener);
        room.on("destroy", this.#roomDestroyListener);
    }
    get connected() {
        return this.#call != null;
    }
    message(...args) {
        return this.#call(...args);
    }
    sendEvent(...args) {
        this.emit("event", ...args);
    }
    leave(reason) {
        this.#room.kick(this, reason);
    }
    #onDisconnect(reason) {
        if (this.#status === "disconnected")
            return;
        this.#room.off("memberJoin", this.#memberJoinListener);
        this.#room.off("memberLeave", this.#memberLeaveListener);
        this.#room.off("destroy", this.#roomDestroyListener);
        const online = this.#status === "joined";
        this.#status = "disconnected";
        this.emit("disconnect", online, reason);
        this.removeAllListeners();
    }
}
