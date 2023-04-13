export type StateStep = string|number
export type StatePath = readonly StateStep[]

export class StateManager {
	private state = null;
}
