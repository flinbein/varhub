export class ApiHelperController {
    #room;
    #apiConstructorMap;
    #apiInstance = new Map;
    constructor(room, apiConstructorMap) {
        this.#room = room;
        this.#apiConstructorMap = apiConstructorMap;
        room.on("destroy", () => {
            for (const api of this.#apiInstance.values()) {
                api.destroy();
            }
            this.#apiInstance.clear();
        });
    }
    getOrCreateApi(name, config) {
        if (this.#room.destroyed)
            return null;
        const existsApi = this.#apiInstance.get(name);
        if (existsApi)
            return existsApi;
        const apiConstructor = this.#apiConstructorMap[name];
        if (!apiConstructor)
            return null;
        const api = new apiConstructor(config);
        if (api)
            this.#apiInstance.set(name, api);
        return api;
    }
}
