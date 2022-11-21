import {WebSocketServer} from "ws";
import { env } from "process";
import {VarHubServer} from "./varhub/VarHubServer.js";

const port = env.port ? Number(env.port) : 8088

const wss = new WebSocketServer({
    port,
});
const varhub = new VarHubServer(wss);
console.log("VARHUB starts", port, varhub);
