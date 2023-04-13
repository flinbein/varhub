import { Buffer, default as Buff } from "buffer";
export const enum OutPackageType {
	CUSTOM = 0,
	ERROR = 1,
	SUCCESS = 2,
}

export const enum InPackageType {
	CUSTOM = 0,
	CREATE_ROOM = 1,
	JOIN_ROOM = 2,
	TIME_SYNC = 3,
}


export type ResponsePackageType = OutPackageType.ERROR | OutPackageType.SUCCESS;
export type EventPackageType = Exclude<OutPackageType, ResponsePackageType>;

export interface Package {
    readonly data: Buffer;
	getBytes(): Buffer;
}

export class InPackage implements Package {
	
	private constructor(
		public readonly type: InPackageType,
		public readonly id: number,
		public readonly data: Buffer,
	) {
	}
	
	static fromBytes(data: Buffer): InPackage {
		return new this(
			data.readUInt8(0),
			data.readInt32LE(1),
			data.subarray(5)
		);
	}
	
	getBytes() {
        const header = Buffer.alloc(5);
        header.writeUInt8(this.type);
        header.writeInt32LE(this.id);
        return Buffer.concat([header, this.data]);
	}
}

export class OutResponsePackage<T extends ResponsePackageType>{
	constructor(
		public readonly type: ResponsePackageType,
		public readonly id: number,
		public readonly data: Buffer = Buffer.alloc(0),
	) {}
	
	getBytes() {
		const header = Buffer.alloc(5);
		header.writeUInt8(this.type);
		header.writeInt32LE(this.id);
		return Buffer.concat([header, this.data]);
	}
}

export class OutEventPackage<T extends EventPackageType>{
	constructor(
		public readonly type: T,
		public readonly data: Buffer = Buffer.alloc(0),
	) {}
	
	getBytes() {
		const header = Buffer.alloc(1);
		header.writeUInt8(this.type);
		return Buffer.concat([header, this.data]);
	}
}

