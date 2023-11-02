type CheckTypeFn<T = any> = (arg: unknown) => arg is T;
type TypeChecker =
	| CheckTypeFn
	| readonly TypeChecker[]
	| {[key: string | number | symbol]: TypeChecker}
	| null | boolean | number | string | undefined
;

type TypeExtract<T extends TypeChecker> =
	T extends CheckTypeFn<infer KT>
		? KT
		: T extends any[] ? {[K in keyof T]: T[K] extends TypeChecker ? TypeExtract<T[K]> : never}
		: T extends object
			? { -readonly [K in keyof T]: T[K] extends TypeChecker ? TypeExtract<T[K]> : never }
			: T
;

type JoinSpread<T, A> = T extends any[] ? [...T, ...A[]] : ["not-a-array", T]

type TupleTypeExtract<A extends readonly TypeChecker[]> =
	A extends readonly [infer H extends TypeChecker, ...(infer T extends TypeChecker[])]
		? TypeExtract<H> & TupleTypeExtract<T>
		: unknown;

type TypeCheck = {
	<const T extends readonly TypeChecker[]>(...args: T): CheckTypeFn<TypeExtract<T[number]>>
	
	readonly string: CheckTypeFn<string>
	readonly number: CheckTypeFn<number>
	readonly int: CheckTypeFn<number>
	readonly any: CheckTypeFn<unknown>
	readonly bool: CheckTypeFn<boolean>
	
	readonly optionalOf: <T extends TypeChecker>(arg: T) => CheckTypeFn<TypeExtract<T>|undefined>
	readonly allOf: <const T extends readonly TypeChecker[]>(...args: T) => CheckTypeFn<TypeExtract<T[number]>>
	readonly oneOf: <const T extends readonly TypeChecker[]>(...args: T) => CheckTypeFn<TypeExtract<T[number]>>
	readonly arrayOf: <const T extends readonly TypeChecker[]>(...args: T) => CheckTypeFn<TypeExtract<T[number]>[]>
	readonly mapOf: <const T extends readonly TypeChecker[]>(...args: T) => CheckTypeFn<Partial<Record<string, TypeExtract<T[number]>>>>
	
	readonly spreadOf: <const T extends readonly TypeChecker[], const U extends TypeChecker = (arg: any) => arg is any>(args: T, spread?: U) => CheckTypeFn<JoinSpread<TypeExtract<T>, TypeExtract<U>>>
	
	readonly assert: <const A, T extends TypeChecker>(data: A, type: T, errorMessage?: string) => unknown extends A ? TypeExtract<T> : A & TypeExtract<T>
}

function checkType(checker: TypeChecker, item: unknown): boolean  {
	if (typeof checker === "function") return checker(item) as boolean;
	if (Array.isArray(checker)) {
		if (!Array.isArray(item)) return false;
		if (item.length > checker.length) return false;
		for (let i = 0; i < checker.length; i++) {
			const checkerElement: TypeChecker = checker[i];
			if (!checkType(checkerElement, item[i])) return false;
		}
		return true;
	}
	if (checker !== null && typeof checker === "object"){
		if (item == null) return false;
		if (typeof item !== "object") return false;
		if (Array.isArray(item)) return false;
		for (const key of Object.keys(checker)) {
			const checkerElement: TypeChecker = (checker as any)[key];
			const itemElement = (item as any)[key];
			if (!checkType(checkerElement, itemElement)) return false;
		}
		return true;
	}
	return Object.is(checker, item);
}

function T(...checkers: TypeChecker[]){
	return (item: unknown) => {
		for (let checker of checkers) {
			if (checkType(checker, item)) return true;
		}
		return false;
	}
}

export default T as unknown as TypeCheck;

T.oneOf = T;
T.string = (value: unknown) => typeof value === "string"

T.number = (value: unknown) => typeof value === "number"

T.int = (value: unknown) => typeof value === "number" && Number.isInteger(value)

T.any = (_: unknown) => true;
T.bool = (value: unknown) => typeof value === "boolean"

T.optionalOf = (t: TypeChecker) => (value: unknown) => value === undefined || checkType(t, value)

T.arrayOf = (...t: TypeChecker[]) => {
	const check = T(...t);
	return (value: unknown) => {
		if (!Array.isArray(value)) return false;
		for (const item of value) {
			if (!check(item)) return false;
		}
		return true;
	}
}

T.spreadOf = (t: TypeChecker[], u?: TypeChecker) => {
	return (value: unknown) => {
		if (!Array.isArray(value)) return false;
		if (value.length < t.length) return false;
		const tail = value.slice(0, t.length);
		if (!checkType(t, tail)) return false;
		const head = value.slice(t.length);
		if (u) for (const item of head) {
			if (!checkType(u, item)) return false;
		}
		return true;
	}
}

T.mapOf = (...t: TypeChecker[]) => {
	const check = T(...t);
	return (value: unknown) => {
		if (!value) return false;
		if (!(typeof value === "object")) return false;
		if (Array.isArray(value)) return false;
		for (const item of Object.values(value)) {
			if (!check(item)) return false;
		}
		return true;
	}
}
T.allOf = (...checkers: TypeChecker[]) => (value: unknown) => {
	for (const checker of checkers) {
		if (!checkType(checker, value)) return false;
	}
	return true;
}
T.assert = (value: unknown, type: TypeChecker, errorMessage = "wrong data format") => {
	if (!checkType(type, value)) throw new Error(errorMessage);
	return value;
}
