import { Buffer } from "buffer";

export class SyncBufferReader {
	index = 0;
	constructor(private buffer: Buffer) {}
	
	private assertSize(bytesSize: number): void {
		if (this.buffer.length < this.index + bytesSize) {
			throw new Error("wrong binary state-data format");
		}
	}
	
	readUInt8(): number {
		this.assertSize(1)
		return this.buffer.readUInt8(this.index++);
	}
	
	readUInt32LE(): number {
		this.assertSize(4);
		const result = this.buffer.readUint32LE(this.index);
		this.index += 4;
		return result;
	}
	
	readDoubleLE(): number{
		this.assertSize(8);
		const result = this.buffer.readDoubleLE(this.index);
		this.index += 8;
		return result;
	}
	
	skip(size = 1): void{
		this.assertSize(size);
		this.index += size;
	}
	
	readBuffer(size: number): Buffer{
		this.assertSize(size);
		const result = this.buffer.subarray(this.index, this.index + size);
		this.index += size;
		return result;
	}
	
	readArrayBuffer(size: number): ArrayBuffer {
		const {buffer, byteLength, byteOffset} = this.readBuffer(size);
		return buffer.slice(byteOffset, byteOffset + byteLength)
	}
	
	readUintSizeAndBuffer(multiplier = 1): Buffer{
		const size = this.readUInt32LE();
		const byteLength = size * multiplier;
		return this.readBuffer(byteLength);
	}
	
	readUintSizeAndArrayBuffer(multiplier = 1): ArrayBuffer {
		const {buffer, byteLength, byteOffset} = this.readUintSizeAndBuffer(multiplier);
		return buffer.slice(byteOffset, byteOffset + byteLength)
	}
	
}
