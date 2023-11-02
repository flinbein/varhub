import { VarHubServer } from "./VarHubServer.js";
import { TypeEmitter } from "./utils/TypedEmitter.js";

export interface RegisterClientHandler {
	(
		call: (...data: any) => any,
		exit: () => void
	): {
		sendEvent: (...data: any) => void,
		disconnect: () => void
	}
}
export class VarHubClient extends TypeEmitter {
	
	#clientHandler: ReturnType<RegisterClientHandler>;
	#onExitHook: (client: VarHubClient) => void
	#onCallHook: (client: VarHubClient, ...data: any) => any
	#connected = true;
	
	constructor(
		private readonly server: VarHubServer,
		register: RegisterClientHandler,
		onExit: (client: VarHubClient) => void,
		onMessage: (client: VarHubClient, ...data: any) => any
	) {
		super();
		this.#clientHandler = register(this.#onCall, this.#onExit);
		this.#onExitHook = onExit;
		this.#onCallHook = onMessage;
	}
	
	get connected(): boolean {
		return this.#connected
	}
	
	#onCall = (...data: any): any => {
		if (!this.#connected) return;
		return this.#onCallHook(this, ...data);
	}
	
	#onExit = () => {
		if (!this.#connected) return;
		this.#onExitHook(this);
	}
	
	sendEvent(...data: any){
		this.#clientHandler.sendEvent(data);
	}
	
	exit(){
		this.#connected = false;
		this.#clientHandler.disconnect();
		this.#onExitHook(this);
	}
	
}
