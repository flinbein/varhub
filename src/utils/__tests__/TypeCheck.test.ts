import T from "../TypeCheck.js"

const isDate = (value: unknown): value is Date => value instanceof Date;

test("T.any", () => {
	const isAny = T.any;
	expect(isAny(false)).toBe(true);
	expect(isAny(true)).toBe(true);
	expect(isAny("")).toBe(true);
	expect(isAny("str")).toBe(true);
	expect(isAny(4)).toBe(true);
	expect(isAny.optional(4)).toBe(true);
	expect(isAny.optional(undefined)).toBe(true);
});

test("T empty", () => {
	const isNever = T();
	expect(isNever(undefined)).toBe(false);
	expect(isNever(null)).toBe(false);
	expect(isNever(true)).toBe(false);
	expect(isNever(true)).toBe(false);
	expect(isNever(false)).toBe(false);
	expect(isNever("")).toBe(false);
	expect(isNever({x:1})).toBe(false);
	expect(isNever(4)).toBe(false);
	expect(isNever.optional(4)).toBe(false);
	expect(isNever.optional(undefined)).toBe(true);
});

test("T.bool", () => {
	const isBoolean = T.bool;
	expect(isBoolean(false)).toBe(true);
	expect(isBoolean(true)).toBe(true);
	expect(isBoolean("")).toBe(false);
	expect(isBoolean("str")).toBe(false);
	expect(isBoolean(4)).toBe(false);
	expect(isBoolean.optional(true)).toBe(true);
	expect(isBoolean.optional(2)).toBe(false);
	expect(isBoolean.optional(undefined)).toBe(true);
});

test("T.number", () => {
	const isNumber = T.number;
	expect(isNumber(false)).toBe(false);
	expect(isNumber(true)).toBe(false);
	expect(isNumber("")).toBe(false);
	expect(isNumber("str")).toBe(false);
	expect(isNumber(4)).toBe(true);
	expect(isNumber(0)).toBe(true);
	expect(isNumber(NaN)).toBe(true);
	expect(isNumber(0.21)).toBe(true);
	expect(isNumber.optional(0.21)).toBe(true);
	expect(isNumber.optional(null)).toBe(false);
	expect(isNumber.optional(undefined)).toBe(true);
});

test("T.int", () => {
	const isInt = T.int;
	expect(isInt(false)).toBe(false);
	expect(isInt(true)).toBe(false);
	expect(isInt("")).toBe(false);
	expect(isInt("2")).toBe(false);
	expect(isInt(4)).toBe(true);
	expect(isInt(0)).toBe(true);
	expect(isInt(NaN)).toBe(false);
	expect(isInt(0.21)).toBe(false);
	expect(isInt.optional(0.21)).toBe(false);
	expect(isInt.optional(4)).toBe(true);
	expect(isInt.optional(undefined)).toBe(true);
});

test("T string", () => {
	const isString = T.string;
	expect(isString(null)).toBe(false);
	expect(isString(true)).toBe(false);
	expect(isString("")).toBe(true);
	expect(isString("2")).toBe(true);
	expect(isString(4)).toBe(false);
	expect(isString(undefined)).toBe(false);
	expect(isString.optional("x")).toBe(true);
	expect(isString.optional(null)).toBe(false);
	expect(isString.optional(undefined)).toBe(true);
});

test("T.optional string", () => {
	const isMaybeString = T.optionalOf(T.string);
	expect(isMaybeString(null)).toBe(false);
	expect(isMaybeString(true)).toBe(false);
	expect(isMaybeString("")).toBe(true);
	expect(isMaybeString("2")).toBe(true);
	expect(isMaybeString(4)).toBe(false);
	expect(isMaybeString(undefined)).toBe(true);
});

test("T.optional value", () => {
	const isMaybeValue = T.optionalOf("value");
	expect(isMaybeValue(null)).toBe(false);
	expect(isMaybeValue(true)).toBe(false);
	expect(isMaybeValue("")).toBe(false);
	expect(isMaybeValue("value")).toBe(true);
	expect(isMaybeValue(4)).toBe(false);
	expect(isMaybeValue(undefined)).toBe(true);
});

test("T.arrayOf 1,2,3", () => {
	const isArrayOf123 = T.arrayOf(1, 2, 3);
	
	expect(isArrayOf123(null)).toBe(false);
	expect(isArrayOf123(true)).toBe(false);
	expect(isArrayOf123("")).toBe(false);
	expect(isArrayOf123(4)).toBe(false);
	expect(isArrayOf123(undefined)).toBe(false);
	
	expect(isArrayOf123([1,2,3])).toBe(true);
	expect(isArrayOf123([1,2,2,1])).toBe(true);
	expect(isArrayOf123([3])).toBe(true);
	expect(isArrayOf123([])).toBe(true);
	expect(isArrayOf123([1,2,4])).toBe(false);
	expect(isArrayOf123(["3"])).toBe(false);
	expect(isArrayOf123.optional(["3"])).toBe(false);
	expect(isArrayOf123.optional([1,2,3])).toBe(true);
	expect(isArrayOf123.optional(undefined)).toBe(true);
});

test("T.mapOf of 1,2,3", () => {
	const isMapOf123 = T.mapOf(1, 2, 3);
	
	expect(isMapOf123(true)).toBe(false);
	expect(isMapOf123(null)).toBe(false);
	expect(isMapOf123(4)).toBe(false);
	expect(isMapOf123(undefined)).toBe(false);
	expect(isMapOf123("")).toBe(false);
	
	expect(isMapOf123([1,2,3])).toBe(false);
	expect(isMapOf123([])).toBe(false);
	expect(isMapOf123({})).toBe(true);
	expect(isMapOf123({a: 1, b:2, c: 3, d: 3})).toBe(true);
	expect(isMapOf123({a: 1, b:2, c: 3, d: 0})).toBe(false);
	expect(isMapOf123.optional({a: 1, b:2, c: 3, d: 3})).toBe(true);
	expect(isMapOf123.optional(undefined)).toBe(true);
	expect(isMapOf123({a: 1, b:2, c: 3, d: 0})).toBe(false);
});

test("T.objectPartOf", () => {
	const isCorrectItem = T.objectPartOf({x: T.string, y: T.number}, T.bool);
	
	expect(isCorrectItem(true)).toBe(false);
	expect(isCorrectItem({})).toBe(false);
	expect(isCorrectItem({x: "a"})).toBe(false);
	expect(isCorrectItem({y: 1})).toBe(false);
	expect(isCorrectItem({x: "a", y: 1})).toBe(true);
	
	expect(isCorrectItem({x: "a", y: 1, z: true})).toBe(true);
	expect(isCorrectItem({x: "a", y: true, z: true})).toBe(false);
	expect(isCorrectItem({x: "a", y: 1, z: true, m: 1})).toBe(false);
	expect(isCorrectItem({x: "a", y: 1, m: 1})).toBe(false);
	expect(isCorrectItem.optional({x: "a", y: 1, z: true})).toBe(true);
	expect(isCorrectItem.optional(undefined)).toBe(true);
	expect(isCorrectItem.optional({x: "a", y: 1, m: 1})).toBe(false);
});

test("T.objectPartOf any", () => {
	const isCorrectItem = T.objectPartOf({x: T.string, y: T.number});
	
	expect(isCorrectItem(false)).toBe(false);
	expect(isCorrectItem({})).toBe(false);
	expect(isCorrectItem({x: "a", y: 1})).toBe(true);
	expect(isCorrectItem({y: 1})).toBe(false);
	expect(isCorrectItem({x: "a"})).toBe(false);
	
	expect(isCorrectItem({x: "a", y: 1, z: true})).toBe(true);
	expect(isCorrectItem({x: "a", y: true, z: true})).toBe(false);
	expect(isCorrectItem({x: "a", y: 1, z: true, m: 1})).toBe(true);
	expect(isCorrectItem({x: "a", y: 1, m: 1})).toBe(true);
});

test("T.allOf", () => {
	const isValidObject = T.allOf({x: T.number}, {y: T.string});
	
	expect(isValidObject({z: 12})).toBe(false);
	expect(isValidObject(undefined)).toBe(false);
	
	expect(isValidObject({x: 0, y: ""})).toBe(true);
	expect(isValidObject({x: 0, y: "", z: true})).toBe(true);
	expect(isValidObject({x: 0})).toBe(false);
	expect(isValidObject({y: ""})).toBe(false);
	expect(isValidObject({x: "", y: 0})).toBe(false);
	expect(isValidObject.optional({x: "", y: 0})).toBe(false);
	expect(isValidObject.optional({x: 0, y: "", z: true})).toBe(true);
	expect(isValidObject.optional(undefined)).toBe(true);
});

test("T any of type", () => {
	const isBooleanOrString = T(T.bool, T.string);
	
	expect(isBooleanOrString(false)).toBe(true);
	expect(isBooleanOrString(true)).toBe(true);
	expect(isBooleanOrString("")).toBe(true);
	expect(isBooleanOrString("str")).toBe(true);
	expect(isBooleanOrString(4)).toBe(false);
	expect(isBooleanOrString.optional(4)).toBe(false);
	expect(isBooleanOrString.optional("str")).toBe(true);
	expect(isBooleanOrString.optional(undefined)).toBe(true);
});

test("T custom", () => {
	const isCorrectItem = T({
		id: T.int,
		created: isDate,
		modified: T.optionalOf(isDate)
	});
	
	expect(isCorrectItem(4)).toBe(false);
	expect(isCorrectItem(undefined)).toBe(false);
	expect(isCorrectItem({})).toBe(false);
	expect(isCorrectItem({
		id: 1,
		created: new Date(),
		modified: new Date(),
	})).toBe(true);
	expect(isCorrectItem({
		id: 1,
		created: new Date(),
		modified: new Date(),
		otherField: true,
	})).toBe(true);
	expect(isCorrectItem({
		id: 1,
		created: new Date(),
	})).toBe(true);
	expect(isCorrectItem({
		id: 1,
		created: new Date(),
		modified: undefined
	})).toBe(true);
	expect(isCorrectItem({
		id: 1,
		created: "wrong param", // wrong
		modified: new Date(),
	})).toBe(false);
	expect(isCorrectItem({
		id: 1,
		created: new Date(),
		modified: "wrong param", // wrong
	})).toBe(false);
	expect(isCorrectItem({
		id: 1.32, // wrong
		created: new Date(),
		modified: new Date(),
	})).toBe(false);
	expect(isCorrectItem({
		id: 1,
		modified: new Date(),
	})).toBe(false);
});

test("T tuple", () => {
	const isCorrectItem = T([T.int, isDate, T.optionalOf(T.any)]);
	
	expect(isCorrectItem([1, 2, 3])).toBe(false);
	expect(isCorrectItem([1, new Date()])).toBe(true);
	expect(isCorrectItem([1.25, new Date()])).toBe(false);
	expect(isCorrectItem([1, new Date(), "any"])).toBe(true);
	expect(isCorrectItem([1, new Date(), "any", "anyother"])).toBe(false);
	expect(isCorrectItem([1, "invalid", "any"])).toBe(false);
});

test("T spread", () => {
	const isCorrectItem = T.listPartOf([T.number, T.bool], T.string);
	
	expect(isCorrectItem([1])).toBe(false);
	expect(isCorrectItem([1, 2])).toBe(false);
	expect(isCorrectItem([1, true])).toBe(true);
	expect(isCorrectItem([1, true, "foo"])).toBe(true);
	expect(isCorrectItem([1, true, "foo", "bar"])).toBe(true);
	expect(isCorrectItem([1, 2, "foo", "bar"])).toBe(false);
	expect(isCorrectItem([1, true, "foo", 12])).toBe(false);
	expect(isCorrectItem.optional([1, true, "foo", 12])).toBe(false);
	expect(isCorrectItem.optional([1, true, "foo", "bar"])).toBe(true);
	expect(isCorrectItem.optional(undefined)).toBe(true);
});

test("T instanceOf", () => {
	const isCorrectItem = T.instanceOf(Promise, Date);
	
	expect(isCorrectItem(new Date(1))).toBe(true);
	expect(isCorrectItem(Promise.resolve(1))).toBe(true);
	expect(isCorrectItem(1)).toBe(false);
	expect(isCorrectItem([2])).toBe(false);
	expect(isCorrectItem.optional(Promise.resolve(1))).toBe(true);
	expect(isCorrectItem.optional([2])).toBe(false);
	expect(isCorrectItem.optional(undefined)).toBe(true);
});

test("T spread with array", () => {
	const isCorrectItem = T.listPartOf([T.oneOf("open", "close"), T.bool], T.string);
	
	expect(isCorrectItem(["open"])).toBe(false);
	expect(isCorrectItem(["open", true])).toBe(true);
	expect(isCorrectItem(["open", true, "ok", "foo"])).toBe(true);
	expect(isCorrectItem(["close", false, "ok", "foo"])).toBe(true);
	expect(isCorrectItem(["ERROR", true, "ok", "foo"])).toBe(false);
	expect(isCorrectItem(["ERROR", true, "ok", "foo"])).toBe(false);
	expect(isCorrectItem(["close", false, "ok", 12])).toBe(false);
	expect(isCorrectItem.optional(["close", false, "ok", "foo"])).toBe(true);
	expect(isCorrectItem.optional(["ERROR", false, "ok", "foo"])).toBe(false);
	expect(isCorrectItem.optional(undefined)).toBe(true);
});

test("T spread any", () => {
	const isCorrectItem = T.listPartOf([T.number, T.bool]);
	
	expect(isCorrectItem([1])).toBe(false);
	expect(isCorrectItem([1, 3])).toBe(false);
	expect(isCorrectItem([1, true])).toBe(true);
	expect(isCorrectItem([1, true, 3])).toBe(true);
	expect(isCorrectItem([1, true, "foo", "bar"])).toBe(true);
	expect(isCorrectItem([1, 2, "foo", "bar"])).toBe(false);
	expect(isCorrectItem([1, true, "foo", 12])).toBe(true);
});

test("T assertions", () => {
	const testDate = new Date();
	const xyMap = {x:1, y: true};
	const numArr = [1,2,3];
	
	expect(T.string.assert("x")).toBe("x");
	expect(T.number.assert(2.2)).toBe(2.2);
	expect(T.int.assert(2)).toBe(2);
	expect(T.any.assert([1,2])).toEqual([1,2]);
	expect(T.bool.assert(true)).toBe(true);
	expect(T.instanceOf(Date).assert(testDate)).toBe(testDate);
	expect(T.optionalOf(2).assert(undefined)).toBe(undefined);
	expect(T.optionalOf(2).assert(2)).toBe(2);
	expect(T.allOf(T.number, T.int).assert(2)).toBe(2);
	expect(T.oneOf(T.number, T.string).assert("x")).toBe("x");
	expect(T.oneOf(T.number, T.string).assert(2)).toBe(2);
	expect(T.arrayOf(T.number).assert(numArr)).toBe(numArr);
	expect(T.mapOf(T.number, T.bool).assert(xyMap)).toBe(xyMap);
	expect(T.objectPartOf({x: T.number}, T.bool).assert(xyMap)).toBe(xyMap);
	expect(T.listPartOf([1], T.number).assert(numArr)).toBe(numArr);
	expect(T.listPartOf([1], T.number).optional.assert(numArr)).toBe(numArr);
	expect(T.listPartOf([1], T.number).optional.assert(undefined)).toBe(undefined);
});

test("T negative assertions", () => {
	const expectedError =new Error("wrong data format");
	
	expect(() => T.string.assert(4)).toThrow(expectedError);
	expect(() => T.number.assert("x")).toThrow(expectedError);
	expect(() => T.int.assert(true)).toThrow(expectedError);
	expect(() => T.bool.assert(3)).toThrow(expectedError);
	expect(() => T.instanceOf(Date).assert(12)).toThrow(expectedError);
	expect(() => T.optionalOf(2).assert(3)).toThrow(expectedError);
	expect(() => T.allOf(T.number, T.int).assert(12.2)).toThrow(expectedError);
	expect(() => T.oneOf(T.number, T.string).assert(false)).toThrow(expectedError);
	expect(() => T.arrayOf(T.int).assert([1,2,3,4.4])).toThrow(expectedError);
	expect(() => T.mapOf(T.number, T.bool).assert({x: 1, y: true, z: "er"})).toThrow(expectedError);
	expect(() => T.objectPartOf({x: T.number}, T.bool).assert({x: 1, y: 2})).toThrow(expectedError);
	expect(() => T.listPartOf([1], T.number).assert([2,3])).toThrow(expectedError);
	
	expect(() => T.string.assert(4, "fooBar")).toThrow(new Error("fooBar"));
});
