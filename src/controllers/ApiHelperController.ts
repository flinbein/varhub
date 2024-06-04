import { Room } from "../varhub/Room.js";

export type ApiHelper = Record<string, any> & Disposable
export type ApiSource = Record<string, new (room: Room) => ApiHelper>

export class ApiHelperController implements Disposable {
	readonly #room: Room;
	readonly #apiSource: ApiSource;
	readonly #apiInstance = new Map<string, ApiHelper>;
	readonly #destroyHandler;
	#disposed = false;
	
	constructor(room: Room, apiSource: ApiSource) {
		this.#room = room;
		this.#apiSource = apiSource;
		this.#destroyHandler = () => this[Symbol.dispose]();
		room.on("destroy", this.#destroyHandler);
	}
	
	getOrCreateApi(name: string): ApiHelper | undefined {
		if (this.#disposed) return;
		if (this.#room.destroyed) return;
		const existsApi = this.#apiInstance.get(name);
		if (existsApi) return existsApi;
		
		const apiConstructor = this.#apiSource[name];
		if (!apiConstructor) return;
		const api = new apiConstructor(this.#room);
		if (api) this.#apiInstance.set(name, api);
		return api;
	}
	
	getApi(name: string): ApiHelper | undefined{
		return this.#apiInstance.get(name);
	}
	
	getApiNames(): string[] {
		return Object.keys(this.#apiSource);
	}
	
	[Symbol.dispose](): void {
		this.#disposed = true;
		this.#room.off("destroy", this.#destroyHandler);
		for (const api of this.#apiInstance.values()) {
			try { api[Symbol.dispose](); } catch {}
		}
		this.#apiInstance.clear();
	}
}
