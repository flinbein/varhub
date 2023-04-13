import {VarHubServer} from "./VarHubServer.js";
import { VarHubClient } from "./VarHubClient.js";
import { InPackage } from "./utils/Package.js";
import { Buffer } from "buffer";
import { hrtime } from "process";
import { TypeEmitter } from "./utils/TypedEmitter.js";
type RoomEvents = {
	join: [client: VarHubClient],
}

export class Room extends TypeEmitter<RoomEvents> {
    public title: string = "";
	private readonly connections = new Set<VarHubClient>;
    
    private lastActivity: number = hrtime()[0];
	
    public updateActivity() {
		this.lastActivity = hrtime()[0];
    }
    
    constructor(
        private readonly server: VarHubServer,
        public readonly roomId: string,
    ) {
		super();
		// todo: create room controller
    }
    
    handleInPackage(client: VarHubClient, inPackage: InPackage): string | Buffer | ArrayBufferView {
        throw new Error("room commands is not implemented yet");
    }
	
	join(client: VarHubClient){
		client.on("message", (message) => {
		})
		this.emit("join", client);
	}
}
