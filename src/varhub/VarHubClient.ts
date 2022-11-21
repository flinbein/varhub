import { WebSocket } from "ws";
import { VarHubServer } from "./VarHubServer.js";
import { Buffer } from "buffer";
import {
	EventPackageType,
	InPackage,
	OutEventPackage,
	OutPackageType,
	OutResponsePackage
} from "./utils/Package.js";

export class VarHubClient {
	
	constructor(
		private readonly connection: WebSocket,
		private readonly server: VarHubServer
	) {
		connection.on("message", async (data: Buffer) => {
			const inPackage = InPackage.fromBytes(data);
			try {
				let result = this.server.handleInPackage(this, inPackage);
				await this.sendResponse(inPackage.id, result);
			} catch (e) {
				try {
					if (e instanceof Error) {
						await this.sendError(inPackage.id, JSON.stringify({name: e.name, message: e.message}));
					} else {
						await this.sendError(inPackage.id, JSON.stringify(e));
					}
				} catch (e2) {
					await this.sendError(inPackage.id);
				}
			}
			
		});
		connection.on("error", (err: any) => {
			this.close(4001, "unknown error: " + String(err));
		});
	}
	
	close(code: number, message: string) {
		this.connection.close(code, message);
	}
	
	private async send(...args: (string | Buffer)[]): Promise<void> {
		return new Promise((resolve, reject) => {
			const buffers = args.map(v => typeof v === "string" ? Buffer.from(v, "utf-8") : v);
			this.connection.send(Buffer.concat(buffers), err => err ? reject(err) : resolve());
		});
	}
	
	protected async sendResponse(packetId: number, data: Buffer | string | ArrayBufferView = Buffer.alloc(0)) {
		if (typeof data === "string") data = Buffer.from(data);
		else if (ArrayBuffer.isView(data)) data = Buffer.from(data.buffer);
		return await this.send(new OutResponsePackage(OutPackageType.SUCCESS, packetId, data as Buffer).getBytes());
	}
	
	protected async sendError(packetId: number, data: Buffer | string | ArrayBufferView = Buffer.alloc(0)) {
		if (typeof data === "string") data = Buffer.from(data);
		else if (ArrayBuffer.isView(data)) data = Buffer.from(data.buffer);
		return await this.send(new OutResponsePackage(OutPackageType.ERROR, packetId, data as Buffer).getBytes());
	}
	
	public async sendEvent(type: EventPackageType, data: Buffer | string | ArrayBufferView = Buffer.alloc(0)) {
		if (typeof data === "string") data = Buffer.from(data);
		else if (ArrayBuffer.isView(data)) data = Buffer.from(data.buffer);
		return await this.send(new OutEventPackage(type, data as Buffer).getBytes());
	}
}
