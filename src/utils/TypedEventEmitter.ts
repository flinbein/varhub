import EventEmitter from "events";

declare class TypedEventEmitter <T extends {[key: string|symbol]: unknown[]}> {
	on<E extends keyof T>(eventName: E, handler: (...args: T[E]) => void): this;
	prependListener<E extends keyof T>(eventName: E, handler: (...args: T[E]) => void): this;
	once<E extends keyof T>(eventName: E, handler: (...args: T[E]) => void): this;
	prependOnceListener<E extends keyof T>(eventName: E, handler: (...args: T[E]) => void): this;
	off<E extends keyof T>(eventName: E, handler: (...args: T[E]) => void): this;
	protected emit<E extends keyof T>(eventName: E, ...args: T[E]): boolean;
	protected removeAllListeners<E extends keyof T>(eventName?: E): boolean;
}
export default EventEmitter as any as typeof TypedEventEmitter;
