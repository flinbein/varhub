import {parse, serialize, XJData} from "../XJMapper.js"

test("parse-serialize null", () => {
	expect(parse(serialize(null))[0]).toBeNull();
});

describe('parse-serialize boolean', function () {
	test("false", () => expect(parse(serialize(false))[0]).toBe(false));
	test("true", () => expect(parse(serialize(true))[0]).toBe(true));
});

describe('parse-serialize number', function () {
	test("0", () => expect(parse(serialize(0))[0]).toBe(0));
	test("0x01", () => expect(parse(serialize(0x01))[0]).toBe(0x01));
	test("0x0f", () => expect(parse(serialize(0x0f))[0]).toBe(0x0f));
	test("0x10", () => expect(parse(serialize(0x10))[0]).toBe(0x10));
	test("-1", () => expect(parse(serialize(-1))[0]).toBe(-1));
	test("Pi", () => expect(parse(serialize(Math.PI))[0]).toBe(Math.PI));
	test("max", () => expect(parse(serialize(Number.MAX_VALUE))[0]).toBe(Number.MAX_VALUE));
	test("min", () => expect(parse(serialize(Number.MIN_VALUE))[0]).toBe(Number.MIN_VALUE));
	test("max safe", () => expect(parse(serialize(Number.MAX_SAFE_INTEGER))[0]).toBe(Number.MAX_SAFE_INTEGER));
	test("min safe", () => expect(parse(serialize(Number.MIN_SAFE_INTEGER))[0]).toBe(Number.MIN_SAFE_INTEGER));
	test("eps", () => expect(parse(serialize(Number.EPSILON))[0]).toBe(Number.EPSILON));
	test("inf", () => expect(parse(serialize(Number.POSITIVE_INFINITY))[0]).toBe(Number.POSITIVE_INFINITY));
	test("neg inf", () => expect(parse(serialize(Number.NEGATIVE_INFINITY))[0]).toBe(Number.NEGATIVE_INFINITY));
	test("nan", () => expect(parse(serialize(Number.NaN))[0]).toBeNaN());
});

describe('parse-serialize bigint', function () {
	test("0n", () => expect(parse(serialize(0n))[0]).toBe(0n));
	test("medium", () => expect(parse(serialize(1234567890n))[0]).toBe(1234567890n));
	test("negative", () => expect(parse(serialize(-1234567890n))[0]).toBe(-1234567890n));
	test("rly big", () => {
		const value = 12345678901234567890123456789012345678901234567890123456789012345678901234567890n;
		expect(parse(serialize(value))[0]).toBe(value);
	});
});


describe('parse-serialize string', function () {
	test("empty", () => {
		expect(parse(serialize(""))[0]).toBe("");
	});
	
	test("long", () => {
		const value = "Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства!"
		expect(parse(serialize(value))[0]).toBe(value);
	});
	
	test("unicode", () => {
		const value = "🐲🐲🐲"
		expect(parse(serialize(value))[0]).toBe(value);
	});
});

describe('array-buffer', function () {
	test("empty", () => {
		const data = serialize(new ArrayBuffer(0));
		const buf = parse(data)[0] as ArrayBuffer;
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBe(0);
	});
	
	test("equals", () => {
		const binArray = Uint8Array.of(0, 1, 2, 3, 253, 254, 255);
		const source = binArray.buffer.slice(binArray.byteOffset, binArray.byteLength);
		const buf = parse(serialize(source))[0] as ArrayBuffer;
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBe(source.byteLength);
		const sourceView = new Uint8Array(source);
		const bufView = new Uint8Array(buf);
		for(let i=0; i<sourceView.byteLength; i++){
			expect(sourceView[i]).toBe(bufView[i]);
		}
	});
});

describe('typed arrays', function () {
	
	function testTypedArray(source: Extract<XJData, { subarray: any }>) {
		expect(parse(serialize(source))[0]).toBeInstanceOf(source.constructor);
		expect(parse(serialize(source))[0]).toEqual(source);
		source = source.subarray(0,0);
		expect(parse(serialize(source))[0]).toBeInstanceOf(source.constructor);
		expect((parse(serialize(source))[0] as typeof source).length).toBe(0);
	}
	
	test("Int8Array", () => testTypedArray(Int8Array.of(0, 1, 2, 3, 254, 255)));
	test("Int16Array", () => testTypedArray(Int16Array.of(0, 1, 2, 3, 254, 255)));
	test("Int32Array", () => testTypedArray(Int32Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint8Array", () => testTypedArray(Uint8Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint16Array", () => testTypedArray(Uint16Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint32Array", () => testTypedArray(Uint32Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint8ClampedArray", () => testTypedArray(Uint8ClampedArray.of(0, 1, 2, 3, 254, 255)));
	test("Float32Array", () => testTypedArray(Float32Array.of(0, 1, 2, 3, 254, 255)));
	test("Float64Array", () => testTypedArray(Float64Array.of(0, 1, 2, 3, 254, 255)));
	test("BigInt64Array", () => testTypedArray(BigInt64Array.of(0n, 24343435234324342n)));
	test("BigUint64Array", () => testTypedArray(BigUint64Array.of(0n, 24343435234324342n)));
	
	test("synthetic buffer", () => {
		const int8Data = Uint8Array.of(0, 1, 2, 3, 254, 255, 0, 0, 0, 22);
		const buffer = int8Data.buffer;
		const int16Data = new Uint16Array(buffer, 2, 2);
		const result = parse(serialize(int16Data))[0] as typeof int16Data;
		expect(result.length).toBe(int16Data.length);
	});
});

describe('array', function () {
	test("empty", () => {
		const source = [] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBe(0);
	});
	
	test("primitives", () => {
		const source = [1, "foo", 32n] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result).toEqual(source);
	});
	
	test("deep array", () => {
		const source = [[[[[Int32Array.of(1,2)]]]]] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result[0][0][0][0][0]).toBeInstanceOf(Int32Array);
		expect(result[0][0][0][0][0].length).toBe(2);
		expect(result[0][0][0][0][0][0]).toBe(1);
		expect(result[0][0][0][0][0][1]).toBe(2);
	});
})

describe('object', function () {
	test("empty", () => {
		const source = {} as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(Object.getPrototypeOf(result)).toBe(null);
		expect(Object.getOwnPropertyNames(result)).toEqual([]);
	});
	
	test("primitives", () => {
		const source = {x: null, y: -123n, z: NaN};
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(result.x).toBeNull();
		expect(result.y).toBe(-123n);
		expect(result.z).toBeNaN();
		expect(Object.getOwnPropertyNames(result).length).toBe(3);
	});
	
	test("deep", () => {
		const source = {x: null, y: -123n, z: [3, null, {m: {x:4}, s:{x:5}}]} as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(Object.getOwnPropertyNames(result).length).toBe(3);
		expect(result.z[2].m.x).toBe(4);
		expect(result.z[2].s.x).toBe(5);
	});
})

describe('multi-value', function () {
	test("parse values", () => {
		const a = 4 as const;
		const b = 100 as const;
		const c = ["str"] as const;
		const result = parse(serialize(a, b, c));
		expect(result.length).toBe(3);
		expect(result[0]).toBe(a);
		expect(result[1]).toBe(b);
		expect(result[2]).toEqual(c);
	});
	
	test("parse values with limit", () => {
		const a = 4 as const;
		const b = 100 as const;
		const c = ["str"] as const;
		const result = parse(serialize(a, b, c), 2);
		expect(result.length).toBe(2);
		expect(result[0]).toBe(a);
		expect(result[1]).toEqual(b);
	});
	
	test("compact", () => {
		const a = 0x0f as const;
		const b = 0x00 as const;
		const c = null;
		const buf = serialize(a, b, c);
		expect(buf.length).toBe(3);
	});
})
