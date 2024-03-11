import TypedEventEmitter from "../utils/TypedEventEmitter.js";
export class Member extends TypedEventEmitter {
    #call;
    constructor(call) {
        super();
        this.#call = call;
    }
    get connected() {
        return this.#call != null;
    }
    call(...args) {
        if (!this.#call)
            throw new Error("member is disconnected");
        return this.#call(...args);
    }
    sendEvent(...args) {
        this.emit("event", ...args);
    }
    disconnect(...args) {
        if (!this.connected)
            return;
        this.#call = null;
        this.emit("disconnect", ...args);
    }
}
