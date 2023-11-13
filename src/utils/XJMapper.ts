import { Buffer } from "buffer";
import { SyncBufferReader } from "./SyncBufferReader.js";

export type XJPrimitive =
	| null /*00*/ | boolean /*01,02*/ | number /*03 or 0xf_*/ | bigint /*04*/ | string /*05*/
	| ArrayBuffer /*06*/
	| Int8Array /*07*/ | Int16Array /*08*/ | Int32Array /*09*/
	| Uint8Array  /*0a*/ | Uint16Array  /*0b*/ | Uint32Array  /*0c*/ | Uint8ClampedArray  /*0d*/
	| Float32Array  /*0e*/ | Float64Array  /*0f*/ | BigInt64Array  /*10*/ | BigUint64Array  /*11*/
export type XJArray = readonly XJData[]  /*12*/
export type XJRecord = { readonly [key: string]: XJData }  /*13*/

export type XJData = Error /*14*/ | XJPrimitive | XJArray | XJRecord;

export function serialize(...val: XJData[]): Buffer {
	return Buffer.concat(val.flatMap(data => _serialize(data)));
}

function _serialize(val: XJData, pool?: Set<any>): Buffer[] {
	if (pool?.has(val)) throw new Error("wrong xj format: recursive");
	
	if (val === null) return [Buffer.of(0x00)];
	if (typeof val === "boolean") return [Buffer.of(val ? 0x02 : 0x01)];
	if (typeof val === "number") {
		if (Number.isInteger(val) && val >= 0 && val <= 0x0f) return [Buffer.of(0xf0 + val)]; // small integers
		const buffer = Buffer.alloc(8);
		buffer.writeDoubleLE(val);
		return [Buffer.of(0x03), buffer];
	}
	if (typeof val === "bigint") {
		const [ignored_type, ...dataBin] = _serialize(val.toString(10));
		return [Buffer.of(0x04), ...dataBin];
	}
	if (typeof val === "string") {
		const stringBuffer = Buffer.from(val, "utf-8")
		return [
			Buffer.of(0x05),
			Buffer.from((Uint32Array.of(stringBuffer.length)).buffer),
			Buffer.from(val, "utf-8")
		];
	}
	if (val instanceof ArrayBuffer) return [Buffer.of(0x06),Buffer.from((Uint32Array.of(val.byteLength)).buffer), Buffer.from(val)];
	if (val instanceof Int8Array) return [Buffer.of(0x07), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Int16Array) return [Buffer.of(0x08), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Int32Array) return [Buffer.of(0x09), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Uint8Array) return [Buffer.of(0x0a), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Uint16Array) return [Buffer.of(0x0b), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Uint32Array) return [Buffer.of(0x0c), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Uint8ClampedArray) return [Buffer.of(0x0d), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Float32Array) return [Buffer.of(0x0e), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof Float64Array) return [Buffer.of(0x0f), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof BigInt64Array) return [Buffer.of(0x10), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (val instanceof BigUint64Array) return [Buffer.of(0x11), Buffer.from((Uint32Array.of(val.length)).buffer), Buffer.from(val.buffer, val.byteOffset, val.byteLength)];
	if (Array.isArray(val)) return [
		Buffer.of(0x12),
		Buffer.from((Uint32Array.of(val.length)).buffer),
		...val.flatMap(item => _serialize(item, new Set(pool).add(val)))
	];
	if (val instanceof Error) {
		const [/*ignored_type*/, ...dataName] = _serialize(String(val.name));
		const [/*ignored_type*/, ...dataMessage] = _serialize(String(val.message));
		const [/*ignored_type*/, ...dataStack] = _serialize(String(val.stack));
		let causeData = [Buffer.of(0x00)]
		if (val.cause !== undefined) try {
			const causeSerialized = _serialize(val.cause as any);
			causeData = [Buffer.of(0x01), ...causeSerialized];
		} catch {}
		return [
			Buffer.of(0x14),
			...dataName,
			...dataMessage,
			...dataStack,
			...causeData
		];
	}
	if (typeof val === "object") {
		const names = Object.getOwnPropertyNames(val).sort();
		const closedVal = val as XJRecord;
		return [
			Buffer.of(0x13),
			Buffer.from((Uint32Array.of(names.length)).buffer),
			...names.flatMap((key) => {
				const [ignored_type, ...dataBin] = _serialize(key);
				return [...dataBin, ..._serialize(closedVal[key], new Set(pool).add(val))]
			})
		];
	}
	throw new Error("wrong xj format: wrong type");
}

export function parse(data: Buffer, maxCount = Infinity): readonly XJData[] {
	const result: XJData[] = []
	const reader = new SyncBufferReader(data);
	while (maxCount --> 0 && reader.hasBytes()) result.push(_parse(reader));
	return result;
}

function _parse(data: SyncBufferReader, type?: number|null): XJData {
	if (type == null) type = data.readUInt8();
	if (type === 0x00) return null;
	if (type === 0x01) return false;
	if (type === 0x02) return true;
	if (type === 0x03) return data.readDoubleLE();
	if (type === 0x04) return BigInt(_parse(data, 0x05) as string);
	if (type === 0x05) return data.readUintSizeAndBuffer().toString("utf-8");
	if (type === 0x06) return data.readUintSizeAndArrayBuffer()
	if (type === 0x07 /*Int8Array*/ ) return new Int8Array(data.readUintSizeAndArrayBuffer());
	if (type === 0x08 /*Int16Array*/ ) return new Int16Array(data.readUintSizeAndArrayBuffer(2));
	if (type === 0x09 /*Int32Array*/ ) return new Int32Array(data.readUintSizeAndArrayBuffer(4));
	if (type === 0x0a /*Uint8Array*/ ) return new Uint8Array(data.readUintSizeAndArrayBuffer());
	if (type === 0x0b /*Uint16Array*/ ) return new Uint16Array(data.readUintSizeAndArrayBuffer(2));
	if (type === 0x0c /*Uint32Array*/ ) return new Uint32Array(data.readUintSizeAndArrayBuffer(4));
	if (type === 0x0d /*Uint8ClampedArray*/ ) return new Uint8ClampedArray(data.readUintSizeAndArrayBuffer());
	if (type === 0x0e /*Float32Array*/ ) return new Float32Array(data.readUintSizeAndArrayBuffer(4));
	if (type === 0x0f /*Float64Array*/ ) return new Float64Array(data.readUintSizeAndArrayBuffer(8));
	if (type === 0x10 /*BigInt64Array*/ ) return new BigInt64Array(data.readUintSizeAndArrayBuffer(8));
	if (type === 0x11 /*BigUint64Array*/ ) return new BigUint64Array(data.readUintSizeAndArrayBuffer(8));
	if (type === 0x12 /*Array*/ ) return Array.from({length: data.readUInt32LE()}).map(() => _parse(data));
	if (type === 0x13 /*Object*/ ) {
		const result = Object.create(null);
		let size = data.readUInt32LE();
		while (size --> 0) Object.defineProperty(result, _parse(data, 0x05) as string, {
			value: _parse(data)
		})
		return result;
	}
	if (type === 0x14 /*Error*/ ) {
		const name = data.readUintSizeAndBuffer().toString("utf-8");
		const message = data.readUintSizeAndBuffer().toString("utf-8");
		const stack = data.readUintSizeAndBuffer().toString("utf-8");
		
		const hasCause = data.readUInt8();
		let result: Error;
		if (!hasCause) {
			result = new Error(message);
		} else {
			const cause = _parse(data);
			result = new Error(message, {cause});
		}
		result.name = name;
		result.stack = stack;
		return result;
	}
	if (type >= 0xf0 && type <= 0xff) return type - 0xf0; // small integers
	throw new Error("wrong binary state-data format");
}

