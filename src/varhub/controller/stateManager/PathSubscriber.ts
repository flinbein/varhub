type Step = string;

class SubPathSubscriber<E extends any[] = []> {
	
	#subscriptions = new Map<number, (...args: E) => void>;
	#delegates = new Map<Step, SubPathSubscriber<E>>;
	
	public isEmpty(){
		return this.#subscriptions.size === 0 && this.#delegates.size === 0;
	}
	
	protected _subscribe([key, ...tail]: Step[], id: number, listener: (...args: E) => void) {
		if (key === undefined) {
			this.#subscriptions.set(id, listener);
			return;
		}
		let delegate = this.#delegates.get(key);
		if (!delegate) this.#delegates.set(key, delegate = new SubPathSubscriber<E>());
		delegate._subscribe(tail, id, listener);
	}
	
	protected _unsubscribe([key, ...tail]: Step[], id: number): boolean {
		if (key === undefined) {
			return this.#subscriptions.delete(id);
		}
		let delegate = this.#delegates.get(key);
		if (!delegate) return false;
		const result = delegate._unsubscribe(tail, id);
		if (delegate.isEmpty()) this.#delegates.delete(key);
		return result;
	}
	
	emit([key, ...tail]: Step[], ...args: E){
		for (let listener of this.#subscriptions.values()) listener(...args);
		if (key === undefined) {
			for (let delegate of this.#delegates.values()) delegate.emit(tail, ...args);
			return;
		}
		this.#delegates.get(key)?.emit(tail, ...args);
	}
}

export class PathSubscriber<E extends any[] = []> extends SubPathSubscriber<E> {
	
	#subscribersHash = new Map<number, [playerName: string, path: Step[], listener: (...args: E) => void]>;
	#playersHash = new Map<string, Set<number>>;
	
	#nextId = ((id) => () => id++)(1)
	
	subscribe(playerName: string, path: Step[], listener: (...args: E) => void): number {
		const id = this.#nextId();
		this.#subscribersHash.set(id, [playerName, path, listener]);
		
		let playerSet = this.#playersHash.get(playerName);
		if (!playerSet) this.#playersHash.set(playerName, playerSet = new Set())
		playerSet.add(id);
		
		this._subscribe(path, id, listener);
		return id;
	}
	
	unsubscribe(id: number): boolean {
		const data = this.#subscribersHash.get(id);
		this.#subscribersHash.delete(id);
		if (!data) return false;
		const [playerName, path] = data;
		let playerSet = this.#playersHash.get(playerName);
		if (playerSet) {
			playerSet.delete(id);
			if (playerSet.size === 0) this.#playersHash.delete(playerName);
		}
		return this._unsubscribe(path, id);
	}
	
	unsubscribeAll(playerName: string) {
		const idSet = this.#playersHash.get(playerName);
		if (idSet) for (let id of idSet) this.unsubscribe(id);
	}
}
