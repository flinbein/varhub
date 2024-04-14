export class ApiHelperController {
    #room;
    #apiSource;
    #apiInstance = new Map;
    #destroyHandler;
    #disposed = false;
    constructor(room, apiSource) {
        this.#room = room;
        this.#apiSource = apiSource;
        this.#destroyHandler = () => this[Symbol.dispose]();
        room.on("destroy", this.#destroyHandler);
    }
    getOrCreateApi(name) {
        if (this.#disposed)
            return;
        if (this.#room.destroyed)
            return;
        const existsApi = this.#apiInstance.get(name);
        if (existsApi)
            return existsApi;
        const apiConstructor = this.#apiSource[name];
        if (!apiConstructor)
            return;
        const api = new apiConstructor(this.#room);
        if (api)
            this.#apiInstance.set(name, api);
        return api;
    }
    getApi(name) {
        return this.#apiInstance.get(name);
    }
    [Symbol.dispose]() {
        this.#disposed = true;
        this.#room.off("destroy", this.#destroyHandler);
        for (const api of this.#apiInstance.values()) {
            try {
                api[Symbol.dispose]();
            }
            catch { }
        }
        this.#apiInstance.clear();
    }
}
