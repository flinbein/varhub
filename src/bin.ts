import {WebSocketServer} from "ws";
import { env } from "process";
import {parse, serialize} from "xjmapper";
import VarHubServer, {type VarHubClient} from "./varhub/VarHubServer.js";

const port = env.port ? Number(env.port) : 8088

const wss = new WebSocketServer({port});
const varhub = new VarHubServer();

wss.on("connection", (connection) => {
	connection.binaryType = "nodebuffer";
	
	varhub.registerClient((call, exit) => {
		
		connection.on("close", () => exit());
		connection.on("message", async (data: Buffer) => {
			try {
				const [callId, ...args] = parse(data);
				try {
					const result = await call(...args);
					connection.send(serialize(0, callId, result));
				} catch (error) {
					connection.send(serialize(1, callId, error as any));
				}
			} catch (e) {
				connection.close(4000, "wrong data format");
			}
		});
		
		return {
			disconnect: (message) => connection.close(4000, message),
			sendEvent: (...data) => connection.send(serialize(2, ...data))
		} satisfies VarHubClient;
	})
})