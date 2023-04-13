import type { WebSocket } from "ws";
import { parse, serialize, XJData } from "./utils/XJMapper.js";

export class RPCWSClient {
	
	constructor(
		private readonly connection: WebSocket,
		private readonly handleClientCall: (client: RPCWSClient, methodName: string, args: XJData[]) => XJData[]|void | Promise<XJData[]|void>
	) {
		connection.on("message", this.onMessage.bind(this));
		connection.on("error", (err: any) => {
			this.close(4001, "unknown error: " + String(err));
		});
	}
	
	private async onMessage(data: Buffer){
		const [id, methodName, ...args] = parse(data.subarray(4));
		if (typeof id !== "number") throw new Error("wrong packet id format")
		if (typeof methodName !== "string") throw new Error("wrong method name format");
		try {
			const result = (await this.handleClientCall(this, methodName, args)) ?? [null];
			await this.sendResponse(id, ...result);
		} catch (e) {
			try {
				if (e instanceof Error) {
					await this.sendError(id, {name: e.name, message: e.message});
				} else {
					await this.sendError(id, JSON.stringify(e));
				}
			} catch (e2) {
				await this.sendError(id, null);
			}
		}
	}
	
	close(code: number, message: string) {
		this.connection.close(code, message);
	}
	
	private async send(...data: XJData[]): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.send(serialize(...data), err => err ? reject(err) : resolve());
		});
	}
	
	protected async sendResponse(packetId: number, ...data: XJData[]) {
		return this.send(1, packetId, ...data);
	}
	
	protected async sendError(packetId: number, ...data: XJData[]) {
		return this.send(2, packetId, ...data);
	}
	
	public async sendEvent(eventName: string, ...data: XJData[]) {
		return await this.send(serialize(0, eventName, ...data));
	}
}
