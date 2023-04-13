import { EventEmitter } from "events";

type EventsType = Record<string|symbol, [...any[]] | ((...args: any[]) => any)>;
type EventArgs<T extends [...any[]] | ((...args: any[]) => any)> = T extends ((...args: any[]) => any) ? Parameters<T> : T
declare class _TypeEmitter<T extends EventsType = never> {
	protected emit<K extends keyof T>(eventName: K, ...args: EventArgs<T[K]>): void
	protected removeAllListeners(eventName?: keyof T): void
	on<K extends keyof T>(eventName: K, listener: (...args: EventArgs<T[K]>) => void): void
	off<K extends keyof T>(eventName: K, listener: (...args: EventArgs<T[K]>) => void): void
	once<K extends keyof T>(eventName: K, listener: (...args: EventArgs<T[K]>) => void): void
}

export const TypeEmitter = EventEmitter as any as typeof _TypeEmitter;
export type TypeEmitter<T extends EventsType = never> = _TypeEmitter<T>;
