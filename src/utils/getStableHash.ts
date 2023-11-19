import {createHash, type BinaryToTextEncoding, type Hash} from "node:crypto";
export function getStableHash(obj: any, algorithm: string, encoding: BinaryToTextEncoding = "hex"): string {
	const hash = createHash(algorithm);
	updateHash(obj, hash);
	return hash.digest(encoding);
}

function updateHash(obj: any, hash: Hash){
	if (obj === null) hash.update("N");
	if (Array.isArray(obj)) {
		hash.update("A");
		hash.update(Uint32Array.of(obj.length));
		for (let element of obj) updateHash(element, hash)
		return;
	}
	if (typeof obj === "object") {
		hash.update("O");
		const keys = Object.keys(obj).sort();
		hash.update(Uint32Array.of(keys.length));
		for (let key of keys) {
			updateHash(key, hash);
			updateHash(obj[key], hash);
		}
		return;
	}
	hash.update(typeof obj);
	hash.update(String(obj));
}
