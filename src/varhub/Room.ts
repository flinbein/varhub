import { Buffer } from "buffer";
import { hrtime } from "process";
import ModuleSandbox from "sandboxer";
import {VarHubServer} from "./VarHubServer.js";
import { VarHubClient } from "./VarHubClient.js";
import { InPackage } from "./utils/Package.js";
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
    }
	
	public async init(data: Partial<Record<string, {url?: string|undefined, source?: string|undefined, evaluate?: boolean|undefined}>>){
		const names = Object.keys(data);
		const sandboxDescriptor: Parameters<typeof ModuleSandbox.create>[0] = {};
		await Promise.all(Object.entries(data).map(async ([name, desc]) => {
			if (!desc) return;
			const source = await this.resolveModuleSource(desc);
			sandboxDescriptor[name] = {
				source,
				evaluate: desc.evaluate,
				links: names.filter(s => s !==name).concat("room")
			}
		}))
		sandboxDescriptor.room = { source: "" }
		const sandbox = await ModuleSandbox.create(sandboxDescriptor);
	}
	
	private async resolveModuleSource({url, source}: {url?: string, source?: string} = {}){
		if (source) return source;
		if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
			const response = await fetch(url);
			if (!response.ok) throw new Error("Fetch error: "+url);
			return await response.text();
		}
		throw new Error("Invalid module source descriptor");
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
