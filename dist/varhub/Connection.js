import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Connection extends TypedEventEmitter {
    #call;
    #room;
    #status = "lobby";
    #connectionJoinListener = (member) => {
        if (member !== this)
            return;
        this.#status = "joined";
        this.emit("join");
    };
    get status() {
        return this.#status;
    }
    #connectionClosedListener = (member, online, reason) => {
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
        room.on("connectionJoin", this.#connectionJoinListener);
        room.on("connectionClosed", this.#connectionClosedListener);
        room.on("destroy", this.#roomDestroyListener);
    }
    get connected() {
        return this.#status === "joined" || this.#status === "lobby";
    }
    message(...args) {
        return this.#call(...args);
    }
    sendEvent(...args) {
        this.emit("event", ...args);
    }
    leave(reason = null) {
        this.#room.kick(this, reason);
    }
    #onDisconnect(reason) {
        if (this.#status === "disconnected")
            return;
        this.#room.off("connectionJoin", this.#connectionJoinListener);
        this.#room.off("connectionClosed", this.#connectionClosedListener);
        this.#room.off("destroy", this.#roomDestroyListener);
        const online = this.#status === "joined";
        this.#status = "disconnected";
        this.emit("disconnect", online, reason);
        this.removeAllListeners();
    }
}
