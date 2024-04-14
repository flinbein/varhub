import { Room } from "../varhub/Room.js";

export class TimeoutDestroyController implements Disposable {
	readonly #room: Room;
	readonly #timeout: number;
	#timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
	
	constructor(room: Room, timeout: number) {
		this.#room = room;
		this.#timeout = timeout;
		this.#room.on("connectionEnter", this.#check);
		this.#room.on("connectionClosed", this.#check);
		this.#room.on("destroy", () => this[Symbol.dispose]());
		this.#check();
	}
	
	#check = () => {
		const count = this.#room.getJoinedConnections().length + this.#room.getLobbyConnections().length;
		if (count === 0) {
			if (!this.#timeoutId) this.#timeoutId = setTimeout(this.#destroyRoom, this.#timeout);
		} else if (this.#timeoutId !== undefined) {
			clearTimeout(this.#timeoutId);
			this.#timeoutId = undefined;
		}
	}
	
	#destroyRoom = () => {
		this.#room.destroy();
		if (this.#timeoutId !== undefined) clearTimeout(this.#timeoutId);
		this[Symbol.dispose]();
	}
	
	[Symbol.dispose](){
		this.#room.off("connectionEnter", this.#check);
		this.#room.off("connectionClosed", this.#check);
		if (this.#timeoutId !== undefined) clearTimeout(this.#timeoutId);
	}
}
