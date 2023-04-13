type CheckTypeFn<T = any> = (arg: unknown) => arg is T;
type TypeChecker = CheckTypeFn | readonly [...TypeChecker[]] | {[key: string]: TypeChecker} |
	null | boolean | number | string | undefined
;

type CheckAssert<T extends readonly TypeChecker[]> = {
	(arg: unknown): arg is TypeExtract<T[number]>
	assert: <const A>(arg: A) => A & TypeExtract<T[number]>
}

type TypeExtract<T extends TypeChecker> =
	T extends (arg: any) => arg is infer KT
		? KT
		: T extends object
			? { -readonly [K in keyof T]: T[K] extends TypeChecker ? TypeExtract<T[K]> : unknown }
			: T
;

type TupleTypeExtract<A extends readonly TypeChecker[]> =
	A extends readonly [infer H extends TypeChecker, ...(infer T extends TypeChecker[])]
		? TypeExtract<H> & TupleTypeExtract<T>
		: unknown;

type TypeCheck = {
	<const T extends readonly TypeChecker[]>(...args: T): CheckAssert<T>,
	
	readonly string: CheckTypeFn<string>
	readonly number: CheckTypeFn<number>
	readonly int: CheckTypeFn<number>
	readonly any: CheckTypeFn<unknown>
	readonly bool: CheckTypeFn<boolean>
	readonly optionalOf: <T extends TypeChecker>(arg: T) => CheckTypeFn<TypeExtract<T>|undefined>
	readonly allOf: <const T extends readonly TypeChecker[]>(...args: T) => CheckTypeFn<TupleTypeExtract<T>>
	readonly arrayOf: <T extends TypeChecker[]>(...args: T) => CheckTypeFn<TypeExtract<T[number]>[]>
	readonly mapOf: <T extends TypeChecker[]>(...args: T) => CheckTypeFn<Partial<Record<string, TypeExtract<T[number]>>>>
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

function mainT(...checkers: TypeChecker[]){
	function check(item: unknown){
		for (let checker of checkers) {
			if (checkType(checker, item)) return true;
		}
		return false;
	}
	check.assert = (item: unknown) => {
		if (check(item)) return item;
		throw new Error("wrong type format");
	}
	return check;
}

const T = mainT as unknown as TypeCheck;
export default T;

mainT.string = (value: unknown) => typeof value === "string"

mainT.number = (value: unknown) => typeof value === "number"

mainT.int = (value: unknown) => typeof value === "number" && Number.isInteger(value)

mainT.any = (_: unknown) => true;
mainT.bool = (value: unknown) => typeof value === "boolean"

mainT.optionalOf = (t: TypeChecker) => (value: unknown) => value === undefined || checkType(t, value)

mainT.arrayOf = (...t: TypeChecker[]) => {
	const check = mainT(...t);
	return (value: unknown) => {
		if (!Array.isArray(value)) return false;
		for (const item of value) {
			if (!check(item)) return false;
		}
		return true;
	}
}

mainT.mapOf = (...t: TypeChecker[]) => {
	const check = mainT(...t);
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
mainT.allOf = (...checkers: TypeChecker[]) => (value: unknown) => {
	for (const checker of checkers) {
		if (!checkType(checker, value)) return false;
	}
	return true;
}
