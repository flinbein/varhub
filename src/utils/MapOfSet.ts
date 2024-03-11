export class MapOfSet<K, V> {
	
	#map = new Map<K, Set<V>>
	has(key: K){
		return this.#map.has(key);
	}
	get(key: K) {
		return this.#map.get(key);
	}
	deleteAll(key: K) {
		return this.#map.delete(key);
	}
	get size(){
		return this.#map.size;
	}
	add(key: K, value: V){
		let set = this.#map.get(key);
		if (!set) this.#map.set(key, set = new Set());
		set.add(value);
	}
	delete(key: K, value: V){
		let set = this.#map.get(key);
		return set?.delete(value) ?? false;
	}
}
