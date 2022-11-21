import {VarHubServer} from "./VarHubServer.js";
import { VarHubClient } from "./VarHubClient.js";
import { InPackage } from "./utils/Package.js";
import { Buffer } from "buffer";
import { hrtime } from "process";

export class Room {
    
    public roomPassword: string = "";
    public adminPassword: string = "";
    public title: string = "";
    
    private lastActivity: number = hrtime()[0];
    
    public updateActivity() {
        this.lastActivity = hrtime()[0];
    }
    
    constructor(
        private readonly server: VarHubServer,
        public readonly roomId: string,
    ) {
    }
    
    handleInPackage(client: VarHubClient, inPackage: InPackage): string | Buffer | ArrayBufferView {
        throw new Error("room commands is not implemented yet")
    }
}
