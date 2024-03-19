// @ts-ignore
import { default as assert } from "node:assert";
import { describe as DESCRIBE, it, Mock, mock } from "node:test";

import { Room } from "../varhub/Room.js";
import { Hub } from "../varhub/Hub.js";

const lastArgs = ({mock}: Mock<(...args: any[]) => void>) => mock.calls[mock.callCount() - 1]?.arguments;

void DESCRIBE("Hub with rooms", async () => {
	
	
	await it("register room", () => {
		const hub = new Hub();
		const room = new Room();
		const roomId = hub.addRoom(room);
		assert.notEqual(roomId, null);
		assert.equal(hub.getRoom(roomId!), room);
		
		assert.deepEqual([...hub.getRooms()], [roomId]);
	});
	
	await it("drop room", () => {
		const hub = new Hub();
		const room = new Room();
		const roomId = hub.addRoom(room);
		assert.deepEqual([...hub.getRooms()], [roomId], "hub has room");
		
		hub.dropRoom(roomId!);
		assert.deepEqual([...hub.getRooms()], [], "hub is empty");
		assert.ok(!room.destroyed, "room is not destroyed");
	});
	
	
	await it("destroy room", () => {
		const hub = new Hub();
		const room = new Room();
		const roomId = hub.addRoom(room);
		assert.deepEqual([...hub.getRooms()], [roomId], "hub has room");
		
		room.destroy();
		assert.deepEqual([...hub.getRooms()], [], "no room in hub");
		assert.ok(room.destroyed, "room is destroyed");
	});
	
	await it("multi register room", () => {
		const hub = new Hub();
		const room = new Room();
		const roomId1 = hub.addRoom(room);
		const roomId2 = hub.addRoom(room);
		const rooms = hub.getRooms();
		assert.ok(roomId1 !== roomId2, "rooms has different id");
		assert.ok(rooms.has(roomId1!), "hub has room 1");
		assert.ok(rooms.has(roomId2!), "hub has room 2");
	});
	
	await it("multi drop room", () => {
		const hub = new Hub();
		const room = new Room();
		const roomId1 = hub.addRoom(room);
		const roomId2 = hub.addRoom(room);
		const rooms = hub.getRooms();
		assert.ok(rooms.has(roomId1!), "hub has room 1");
		assert.ok(rooms.has(roomId2!), "hub has room 2");
		
		hub.dropRoom(roomId2!);
		assert.ok(rooms.has(roomId1!), "hub has room 1 - after drop");
		assert.ok(rooms.has(roomId2!), "hub dont have room 2 - afrer drop");
	});
	
	await it("multi destroy room", () => {
		const hub = new Hub();
		const room = new Room();
		hub.addRoom(room);
		hub.addRoom(room);
		room.destroy();
		
		assert.deepEqual([...hub.getRooms()], [], "no room in hub");
	});
	
	await it("one destroy room", () => {
		const hub = new Hub();
		const room1 = new Room();
		const room2 = new Room();
		const roomId1 = hub.addRoom(room1);
		hub.addRoom(room2);
		room2.destroy();
		
		assert.deepEqual([...hub.getRooms()], [roomId1], "only room1 in hub");
	});
	
	await it("hub room by integrity", () => {
		const hub = new Hub();
		const room1 = new Room();
		const room2 = new Room();
		const room3 = new Room();
		const roomId1 = hub.addRoom(room1, "X");
		const roomId2 = hub.addRoom(room2, "X");
		const roomId3 = hub.addRoom(room3, "Y");
		
		assert.deepEqual([...hub.getRoomsByIntegrity("Y")], [roomId3], "only room3 in Y");
		
		const xRooms = hub.getRoomsByIntegrity("X");
		assert.equal(xRooms.size, 2, "2 rooms in X");
		assert.ok(xRooms.has(roomId1!), "room1 in X");
		assert.ok(xRooms.has(roomId2!), "room2 in X");
		
		room1.destroy();
		
		assert.deepEqual([...hub.getRoomsByIntegrity("X")], [roomId2], "only room2 in X");
	});
	
	await it("hub room by unknown integrity", () => {
		const hub = new Hub();
		const unknownRooms = hub.getRoomsByIntegrity("UNKNOWN")
		assert.ok(unknownRooms, "unknownRooms is Set");
		assert.equal(unknownRooms.size, 0, "unknownRooms is empty Set");
	});
	
	await it("hub get integrity", () => {
		const hub = new Hub();
		const roomId1 = hub.addRoom(new Room(), "X");
		const roomId2 = hub.addRoom(new Room(), "Y");
		const roomId3 = hub.addRoom(new Room());
		
		assert.equal(hub.getRoomIntegrity(roomId1!), "X", "get integrity of room X");
		assert.equal(hub.getRoomIntegrity(roomId2!), "Y", "get integrity of room Y");
		assert.equal(hub.getRoomIntegrity(roomId3!), undefined, "no integrity");
		
		hub.dropRoom(roomId2!);
		assert.equal(hub.getRoomIntegrity(roomId2!), undefined, "Y not found now");
	});
	
	await it("hub room events", () => {
		const addEvents = mock.fn();
		const dropEvents = mock.fn();
		const hub = new Hub();
		hub.on("addRoom", addEvents);
		hub.on("dropRoom", dropEvents);
		
		const room1 = new Room();
		const room2 = new Room();
		
		const roomId1 = hub.addRoom(room1);
		assert.deepEqual(lastArgs(addEvents), [roomId1, room1], "add room 1 event");
		
		const roomId2 = hub.addRoom(room2);
		assert.deepEqual(lastArgs(addEvents), [roomId2, room2], "add room 2 event");
		
		assert.equal(dropEvents.mock.callCount(), 0, "no drop events");
		
		room1.destroy();
		assert.deepEqual(lastArgs(dropEvents), [roomId1, room1], "drop room 1 event");
		
		hub.dropRoom(roomId2!);
		assert.deepEqual(lastArgs(dropEvents), [roomId2, room2], "drop room 2 event");
		
		room1.destroy();
		room2.destroy();
		hub.dropRoom(roomId1!);
		hub.dropRoom(roomId2!);
		assert.equal(dropEvents.mock.callCount(), 2, "no extra drop events");
	});
	
})
