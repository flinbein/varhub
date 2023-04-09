import { configureStore } from "@reduxjs/toolkit";
import { StateArray, StateObject, StateValue } from "./StateMapper.js";
import { StatePath, StateStep } from "./StateManager.js";
import { createStateRecord, isStateRecord } from "./utils/path.js";
import * as Path from "path";

class RootState{
	constructor(
		public readonly value: StateValue = null,
		public readonly lastScore = new Number(0),
	) {}
}

export function createStore(value: StateValue = null) {
	return configureStore({reducer: reducer});
}

const WMinPatch = new WeakMap<any, Number>;
const WNewPatch = new WeakMap<any, [Number, Set<String>]>;
const WMapPatch = new WeakMap<StateObject, Record<string, Number>>;
const WArrayPatch = new WeakMap<StateArray, Array<Number>>;


// Map: <min-patch: number, new-patch: [number, Set<string>], Map<key, last-patch>>
// Array: <min-patch, new-patch: [number, Set<string>],  Array<key, last-patch>>,
// root: last-patch
function reducer(root: RootState = new RootState(), patch: Patch): RootState {
	let {lastScore, value} = root;
	for (let command of patch.commands) {
		[value, lastScore] = smallReducer(value, lastScore, command.path, command.action, new Number(patch.score));
	}
	if (value === root.value && lastScore === root.lastScore) return root;
	return new RootState(value, lastScore);
}

function smallReducer(value: StateValue, valueStore: Number, path: StatePath, action: PatchAction, patchScore: Number): [StateValue, Number]{
	const step = path[0], tailPath = path.slice(1);
	if (step) {
		if (typeof step === "string") {
			if (isStateRecord(value)) {
				const minPatch = WMinPatch.get(value);
				if (minPatch != null && minPatch >= patchScore && minPatch !== patchScore) throw storeNotSync();
				if (step in value) {
					const keyPatch = WMapPatch.get(value)?.[step];
					if (keyPatch != null && keyPatch >= patchScore && keyPatch !== patchScore) throw storeNotSync();
				} else {
				
				}
				// TODO тут я ёбнулся.
				const [nextState, nextPatch] = smallReducer(value[step])
				return [createStateRecord({
					...value,
					[step]: nextState
				}), nextPatch];
			}
		}
	}
}

export type Patch = {
	score: number,
	type: "patch",
	commands: PatchCommand[];
}

export type PatchActionsMap = {
	set: { key: StateStep, value: StateValue };
	delete: { key: StateStep };
	test: {};
	splice: { start: number, deleteCount: number, items: StateValue[] };
}
export type PatchAction = {
	[key in keyof PatchActionsMap]: {type: key} & PatchActionsMap[key]
}[keyof PatchActionsMap]
export type PatchCommand = {
	path: StatePath,
	action: PatchAction
}

function storeNotSync(){
	throw new Error("store not synchronised")
}
