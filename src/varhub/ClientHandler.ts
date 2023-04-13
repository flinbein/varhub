import { WebSocket } from "ws";
import { TypeEmitter } from "./utils/TypedEmitter.js";
import { VarHubClient } from "./VarHubClient.js";
import { type Room } from "./Room.js";

export class ClientHandler extends TypeEmitter<{
	onConnectPlayer(name: string): void
}> {
	
	constructor(private top: Room) {
		super();
	}
	
	onConnect(client: VarHubClient){
		this.emit("onConnectPlayer","PlayerName");
	}
	
	getPlayers(){
	
	}
}
