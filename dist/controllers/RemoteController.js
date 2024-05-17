export class RemoteController {
    #room;
    #connection;
    get room() {
        return this.#room;
    }
    get connection() {
        return this.#connection;
    }
    constructor(room, connection) {
        this.#room = room;
        this.#connection = connection;
        room.on("connectionEnter", (c, ...args) => {
            connection.sendEvent("connectionEnter", c.id, ...args);
        });
        room.on("connectionJoin", (c, ...args) => {
            connection.sendEvent("connectionJoin", c.id, ...args);
        });
        room.on("connectionClosed", (c, ...args) => {
            if (c === connection) {
                room.destroy();
                return;
            }
            connection.sendEvent("connectionClosed", c.id, ...args);
        });
        room.on("connectionMessage", (c, ...args) => {
            if (c === connection) {
                try {
                    execute(...args);
                }
                catch { }
                return;
            }
            connection.sendEvent("connectionMessage", c.id, ...args);
        });
        room.on("messageChange", (...args) => {
            connection.sendEvent("messageChange", ...args);
        });
        const findAllConnections = (v) => {
            return [...room.getJoinedConnections(), ...room.getLobbyConnections()].filter(c => c !== connection);
        };
        const findJoinedConnections = (v) => {
            return room.getJoinedConnections().filter(c => v.includes(c.id) && c !== connection);
        };
        const findLobbyConnections = (v) => {
            return room.getLobbyConnections().filter(c => v.includes(c.id) && c !== connection);
        };
        const execute = (cmd, ...args) => {
            if (cmd === "join") {
                for (let c of findLobbyConnections(args.map((v) => Number(v)))) {
                    room.join(c);
                }
            }
            if (cmd === "kick") {
                for (let c of findAllConnections(args.map((v) => Number(v)))) {
                    room.kick(c);
                }
            }
            if (cmd === "publicMessage") {
                room.publicMessage = args[0] == null ? null : String(args[0]);
            }
            if (cmd === "destroy") {
                room.destroy();
            }
            if (cmd === "send") {
                const [idArg, ...sendArgs] = args;
                const idArgList = Array.isArray(idArg) ? idArg : [idArg];
                for (let c of findJoinedConnections(idArgList.map((v) => Number(v)))) {
                    c.sendEvent(...sendArgs);
                }
            }
            if (cmd === "broadcast") {
                const [...sendArgs] = args;
                for (let c of room.getJoinedConnections().filter(c => c !== connection)) {
                    c.sendEvent(...sendArgs);
                }
            }
        };
    }
}
