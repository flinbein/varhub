import { Room } from "../varhub/Room.js";

export class ApiHelperController {
	readonly #room: Room;
	readonly #apiConstructorMap: Record<string, new (config?: any) => ApiHelper>;
	readonly #apiInstance = new Map<string, ApiHelper>;
	
	constructor(room: Room, apiConstructorMap: Record<string, new (config?: any) => ApiHelper>) {
		this.#room = room;
		this.#apiConstructorMap = apiConstructorMap;
		
		room.on("destroy", () => {
			for (const api of this.#apiInstance.values()) {
				api.destroy();
			}
			this.#apiInstance.clear();
		})
	}
	
	getOrCreateApi(name: string, config?: any) {
		if (this.#room.destroyed) return null;
		const existsApi = this.#apiInstance.get(name);
		if (existsApi) return existsApi;
		
		const apiConstructor = this.#apiConstructorMap[name];
		if (!apiConstructor) return null;
		const api = new apiConstructor(config);
		if (api) this.#apiInstance.set(name, api);
		return api;
	}
	
	getApi(name: string){
		return this.#apiInstance.get(name) ?? null;
	}
	
}

export interface ApiHelper {
	call(...args: any): any;
	destroy(): void;
}
