import type { WebSocket, WebSocketServer } from "ws";
import type { XJData } from "./utils/XJMapper.js";
import { RPCWSClient } from "./RPCWSClient.js";

export class RPCWSServer {
	
	private clients = new Set<RPCWSClient>();
	
	constructor(
		private readonly wss: WebSocketServer,
		private readonly messageHandler: (client: RPCWSClient, methodName: string, args: readonly XJData[]) => XJData[]|void | Promise<XJData[]|void>
	) {
		wss.on("connection", this.registerClient.bind(this));
		wss.on("close", () => this.onClose());
	}
	
	private registerClient(connection: WebSocket){
		connection.binaryType = "nodebuffer";
		const client = new RPCWSClient(connection, this.messageHandler);
		if (!this.onClientConnect(client)) {
			return client.close(4001, "closed by server");
		}
		this.clients.add(client);
		connection.on("close", () => {
			this.clients.delete(client);
			this.onClientDisconnect(client);
		});
	}
	
	public onClientConnect(client: RPCWSClient): boolean { return true };
	public onClientDisconnect(client: RPCWSClient): void {};
	public onClose(): void {};
	
	public getClients(): ReadonlySet<RPCWSClient>{
		return this.clients;
	}
}
