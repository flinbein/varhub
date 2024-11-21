export class MapOfSet {
    #map = new Map;
    has(key) {
        return this.#map.has(key);
    }
    get(key) {
        return this.#map.get(key);
    }
    deleteAll(key) {
        return this.#map.delete(key);
    }
    get size() {
        return this.#map.size;
    }
    add(key, value) {
        let set = this.#map.get(key);
        if (!set)
            this.#map.set(key, set = new Set());
        set.add(value);
    }
    delete(key, value) {
        let set = this.#map.get(key);
        const result = set?.delete(value) ?? false;
        if (set?.size === 0)
            this.#map.delete(key);
        return result;
    }
}
