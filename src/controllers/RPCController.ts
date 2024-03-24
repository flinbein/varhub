import { Room } from "../varhub/Room.js";
import { Connection } from "../varhub/Connection.js";

export class RPCController {
	readonly #room: Room;
	constructor(room: Room, rpcHandler: (connection: Connection, args: any[]) => any) {
		this.#room = room;
		
		room.on("connectionMessage", async (connection, ...args) => {
			if (args.length < 2) return;
			const [rpcMark, rpcId, ...rpcArgs] = args;
			if (rpcMark !== "$rpc") return;
			try {
				const syncResult = rpcHandler(connection, rpcArgs);
				const result = (typeof syncResult?.then === "function") ? await syncResult : syncResult;
				connection.sendEvent("$rpcResult", rpcId, true, result);
			} catch (error) {
				connection.sendEvent("$rpcResult", rpcId, false, error);
			}
		});
	}
	
	static sendRpcEvent(member: Connection, ...args: any[]){
		member.sendEvent("$rpcEvent", ...args);
	}
}
