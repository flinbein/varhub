import {VarHubServer} from "./VarHubServer.js";
import { VarHubClient } from "./VarHubClient.js";
import { InPackage } from "./utils/Package.js";
import { Buffer } from "buffer";
import { hrtime } from "process";
import { EventEmitter } from "events";
import { TypeEmitter } from "./utils/TypedEmitter.js";

type RoomEvents = {
	join: [name: string, client: VarHubClient, admin: boolean],
}

export class Room extends (EventEmitter as {} as TypeEmitter<RoomEvents>) {
    public title: string = "";
	private readonly players = new Map<string, [client: VarHubClient, admin: boolean]>;
    
    private lastActivity: number = hrtime()[0];
	
    public updateActivity() {
        this.lastActivity = hrtime()[0];
    }
    
    constructor(
        private readonly server: VarHubServer,
        public readonly roomId: string,
        public readonly type: string,
		controllerName: string
    ) {
		super();
		// todo: create room controller
    }
    
    handleInPackage(client: VarHubClient, inPackage: InPackage): string | Buffer | ArrayBufferView {
        throw new Error("room commands is not implemented yet")
    }
	
	join(client: VarHubClient, name: string, admin: boolean){
		this.players.set(name, [client, admin]);
		this.emit("join", name, client, admin)
	}
}
