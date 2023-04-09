declare class TypeEmit<T extends Record<keyof any, [...any[]]> = never> {
	protected emit<K extends keyof T>(eventName: K, ...args: T[K]): void
	on<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): void
	off<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): void
	once<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): void
}
export type TypeEmitter<T extends Record<keyof any, [...any[]]> = never> = typeof TypeEmit<T>;
