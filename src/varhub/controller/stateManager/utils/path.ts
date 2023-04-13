import type { XJRecord, XJData } from "../../../../utils/XJMapper.js";
import type { StatePath, StateStep } from "../../../../utils/StateManager.js";

export function select(value: XJData|undefined, path: StatePath): XJData | undefined{
	for (let step of path) value = selectStep(value, step)
	return value;
}

export function canSet(state: XJData|undefined, path: StatePath, value: XJData): boolean {
	let requiredType: string = "";
	for (let step of path) {
		if (requiredType && typeof value !== requiredType) return false;
		if (state === undefined) return true;
		if (state == null) return false;
		
		// select string
		if (typeof step === "string") {
			if (!isStateRecord(state)) return false;
			state = state[step];
			continue;
		}
		// select number
		if (Array.isArray(state)){
			state = state[step];
			continue;
		}
		if (ArrayBuffer.isView(state) || state instanceof ArrayBuffer){
			if (typeof value !== "number") return false;
			state = null;
			continue;
		}
		return false;
	}
	return true;
	
}

function selectStep(value: XJData|undefined, step: StateStep): XJData | undefined{
	if (typeof step === "string") {
		if (value == null) return undefined;
		if (Object.getPrototypeOf(value) !== null) return undefined;
		return (value as any)[step];
	}
	if (step < 0) return undefined;
	if (Array.isArray(value) || ArrayBuffer.isView(value)) return value[step];
	if (value instanceof ArrayBuffer) return new Uint8Array(value)[step];
	return undefined;
}

export function isStateRecord(value: XJData|undefined): value is XJRecord {
	if (!value) return false;
	return Object.getPrototypeOf(value) === null
}

export function createStateRecord(value: XJRecord): XJRecord {
	const result = Object.create(null);
	for (let key in value) result[key] = value[key]
	return result;
}
