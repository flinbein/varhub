export class RPCController {
    #room;
    constructor(room, rpcHandler) {
        this.#room = room;
        room.on("connectionMessage", async (connection, ...args) => {
            if (args.length < 2)
                return;
            const [rpcMark, rpcId, ...rpcArgs] = args;
            if (rpcMark !== "$rpc")
                return;
            try {
                const syncResult = rpcHandler(connection, rpcArgs);
                const result = (typeof syncResult?.then === "function") ? await syncResult : syncResult;
                connection.sendEvent("$rpcResult", rpcId, true, result);
            }
            catch (error) {
                connection.sendEvent("$rpcResult", rpcId, false, error);
            }
        });
    }
    static sendRpcEvent(member, ...args) {
        member.sendEvent("$rpcEvent", ...args);
    }
}
