type AssertDataFn<T> = <const A>(data: A, errorMessage?: string) =>
	unknown extends A ? T : A & T

export type ResolveTypeChecker<T extends CheckTypeFn> = T extends CheckTypeFn<infer R> ? R : never;

type CheckTypeFn<T = any> = (arg: unknown) => arg is T
type CheckTypeAssertFn<T = any> = {
	(arg: unknown): arg is T
	assert: AssertDataFn<T>
};
type CheckTypeWithHelpersFn<T = any> = {
	(arg: unknown): arg is T
	assert: AssertDataFn<T>
	optional: CheckTypeAssertFn<T | undefined>
};
type TypeChecker =
	| CheckTypeFn
	| readonly TypeChecker[]
	| {[key: string | number | symbol]: TypeChecker}
	| null | boolean | number | string | undefined
;

type TypeExtract<T extends TypeChecker> =
	T extends CheckTypeFn<infer KT>
		? KT
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
	<const T extends readonly TypeChecker[]>(...args: T): CheckTypeWithHelpersFn<TypeExtract<T[number]>>
	
	readonly string: CheckTypeWithHelpersFn<string>
	readonly number: CheckTypeWithHelpersFn<number>
	readonly int: CheckTypeWithHelpersFn<number>
	readonly any: CheckTypeWithHelpersFn<unknown>
	readonly bool: CheckTypeWithHelpersFn<boolean>
	
	readonly instanceOf: <T extends {new(...args: any): any}[]>(...args: T) =>
		CheckTypeWithHelpersFn<InstanceType<T[number]>>
	
	readonly optionalOf: <T extends TypeChecker>(arg: T) =>
		CheckTypeAssertFn<TypeExtract<T>|undefined>
	
	readonly allOf: <const T extends readonly TypeChecker[]>(...args: T) =>
		CheckTypeWithHelpersFn<TupleTypeExtract<T>>
	
	readonly oneOf: <const T extends readonly TypeChecker[]>(...args: T) =>
		CheckTypeWithHelpersFn<TypeExtract<T[number]>>
	
	readonly arrayOf: <const T extends readonly TypeChecker[]>(...args: T) =>
		CheckTypeWithHelpersFn<TypeExtract<T[number]>[]>
	
	readonly mapOf: <const T extends readonly TypeChecker[]>(...args: T) =>
		CheckTypeWithHelpersFn<Partial<Record<string, TypeExtract<T[number]>>>>
	
	readonly objectPartOf: <
		const T extends Record<string, TypeChecker>, const U extends TypeChecker = (arg: any) => arg is unknown
	>(map: T, others?: U) =>
		CheckTypeWithHelpersFn<TypeExtract<T> & Partial<Record<string, TypeExtract<U>>>>
	
	readonly listPartOf: <
		const T extends readonly TypeChecker[], const U extends TypeChecker = (arg: any) => arg is unknown
	>(list: T, others?: U) =>
		CheckTypeWithHelpersFn<JoinSpread<TypeExtract<T>, TypeExtract<U>>>
	
	readonly assertType: <const A, T extends TypeChecker>(type: T, data: A, errorMessage?: string) =>
		unknown extends A ? TypeExtract<T> : A & TypeExtract<T>
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
	return withHelpers((item: unknown): item is unknown => {
		for (let checker of checkers) {
			if (checkType(checker, item)) return true;
		}
		return false;
	})
}

function withHelpers<T extends (args: any) => boolean>(fn: T): T {
	const makeOptional = (f: (arg: any) => boolean) => function (data: any) {
		return data === undefined || f(data);
	};
	const makeAssert = (f: (arg: any) => boolean) => function (data: any, errorMessage: any) {
		return T.assertType(f as any, data, errorMessage);
	};
	(fn as any)["assert"] = makeAssert(fn);
	const optional = (fn as any)["optional"] = makeOptional(fn);
	(optional as any)["assert"] = makeAssert(optional);
	return fn as any;
}

export default T as unknown as TypeCheck;

T.oneOf = T;
T.string = withHelpers((value: unknown) => typeof value === "string")

T.number = withHelpers((value: unknown) => typeof value === "number")

T.int = withHelpers((value: unknown) => typeof value === "number" && Number.isInteger(value))

T.any = withHelpers((value: unknown): value is unknown => true);
T.bool = withHelpers((value: unknown) => typeof value === "boolean")

T.instanceOf = (...instance: {new (...args: any): any}[]) => withHelpers((value: unknown) => {
	for (let instanceElement of instance) {
		if (value instanceof instanceElement) return true;
	}
	return false;
})

T.optionalOf = (t: TypeChecker) => withHelpers((value: unknown) => value === undefined || checkType(t, value))

T.arrayOf = (...t: TypeChecker[]) => {
	const check = T(...t);
	return withHelpers((value: unknown) => {
		if (!Array.isArray(value)) return false;
		for (const item of value) {
			if (!check(item)) return false;
		}
		return true;
	})
}

T.listPartOf = (t: TypeChecker[], u?: TypeChecker) => {
	return withHelpers((value: unknown) => {
		if (!Array.isArray(value)) return false;
		if (value.length < t.length) return false;
		const tail = value.slice(0, t.length);
		if (!checkType(t, tail)) return false;
		const head = value.slice(t.length);
		if (u) for (const item of head) {
			if (!checkType(u, item)) return false;
		}
		return true;
	})
}

T.objectPartOf = (t: Record<string, TypeChecker>, u?: TypeChecker) => {
	const typeCheckKeys = Object.keys(t);
	return withHelpers((value: unknown) => {
		if (value == null) return false;
		if (typeof value !== "object") return false;
		for (let typeCheckKey of typeCheckKeys) {
			if (!(typeCheckKey in value)) return false;
		}
		for (const [key, item] of Object.entries(value)) {
			const checker = (key in t) ? t[key] : u;
			if (!checker) continue;
			if (!checkType(checker, item)) return false;
		}
		return true;
	})
}

T.mapOf = (...t: TypeChecker[]) => {
	const check = T(...t);
	return withHelpers((value: unknown) => {
		if (!value) return false;
		if (!(typeof value === "object")) return false;
		if (Array.isArray(value)) return false;
		for (const item of Object.values(value)) {
			if (!check(item)) return false;
		}
		return true;
	})
}
T.allOf = (...checkers: TypeChecker[]) => withHelpers((value: unknown) => {
	for (const checker of checkers) {
		if (!checkType(checker, value)) return false;
	}
	return true;
})
T.assertType = (type: TypeChecker, value: unknown, errorMessage = "wrong data format") => {
	if (!checkType(type, value)) throw new Error(errorMessage);
	return value;
}
