import TypedEventEmitter from "../utils/TypedEventEmitter.js";

type MemberEvents = {
	disconnect: [...args: any[]],
	event: [...args: any[]],
}
export class Member extends TypedEventEmitter<MemberEvents> {
	#call: null | ((...args: unknown[]) => unknown);
	
	constructor(call: (...args: unknown[]) => unknown) {
		super();
		this.#call = call;
	}
	
	get connected(){
		return this.#call != null;
	}
	
	call(...args: unknown[]): unknown {
		if (!this.#call) throw new Error("member is disconnected");
		return this.#call(...args);
	}
	
	sendEvent(...args: any[]){
		this.emit("event", ...args);
	}
	
	disconnect(...args: any[]){
		if (!this.connected) return;
		this.#call = null;
		this.emit("disconnect", ...args);
	}
}
