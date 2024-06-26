import { default as assert } from "node:assert";
import { describe as DESCRIBE, it, mock } from "node:test";

import { Room } from "../src/varhub/Room.js";

void DESCRIBE("Room and member", async () => {
	
	await it("destroy event", () => {
		const eventHandler = mock.fn();
		const room = new Room();
		room.on("destroy", eventHandler);
		assert.equal(room.destroy(), true);
		assert.equal(room.destroy(), false); 
		assert.equal(room.destroy(), false);
		assert.equal(eventHandler.mock.callCount(), 1);
	})
	
	await it("enter client", () => {
		const enterEventHandler = mock.fn();
		const room = new Room();
		room.on("connectionEnter", enterEventHandler)
		const member = room.createConnection().enter("foo", "bar");
		assert.equal(enterEventHandler.mock.callCount(), 1);
		assert.deepEqual(enterEventHandler.mock.calls[0].arguments, [member, "foo", "bar"]);
		assert.deepEqual(room.getLobbyConnections(), [member]);
		assert.deepEqual(room.getJoinedConnections(), []);
	});
	
	await it("kick client", () => {
		const leaveEventHandler = mock.fn();
		const room = new Room();
		room.on("connectionClosed", leaveEventHandler);
		const member = room.createConnection().enter("foo", "bar");
		assert.deepEqual(room.getLobbyConnections(), [member]);
		assert.deepEqual(room.getJoinedConnections(), []);
		
		const joinResult = room.join(member);
		assert.equal(joinResult, true);
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.deepEqual(room.getJoinedConnections(), [member]);
		assert.equal(leaveEventHandler.mock.callCount(), 0);
		
		room.kick(member, "messageToKick");
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.deepEqual(room.getJoinedConnections(), []);
		assert.equal(leaveEventHandler.mock.callCount(), 1);
		assert.deepEqual(leaveEventHandler.mock.calls[0].arguments, [member, true, "messageToKick"]);
	});
	
	await it("client disconnected from lobby", () => {
		const leaveEventHandler = mock.fn();
		const disconnectEventHandler = mock.fn();
		const enterEventHandler = mock.fn();
		const room = new Room();
		room.on("connectionClosed", leaveEventHandler);
		room.on("connectionEnter", enterEventHandler);
		
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.equal(enterEventHandler.mock.callCount(), 0);
		
		const member = room.createConnection().enter("foo", "bar");
		member.on("disconnect", disconnectEventHandler);
		assert.deepEqual(room.getLobbyConnections(), [member]);
		assert.equal(enterEventHandler.mock.callCount(), 1);
		assert.deepEqual(enterEventHandler.mock.calls[0].arguments, [member, "foo", "bar"]);
		
		assert.equal(leaveEventHandler.mock.callCount(), 0);
		assert.equal(disconnectEventHandler.mock.callCount(), 0);
		member.leave("justLeave");
		assert.equal(member.status, "disconnected");
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.equal(leaveEventHandler.mock.callCount(), 1);
		assert.deepEqual(leaveEventHandler.mock.calls[0].arguments, [member, false, "justLeave"]);
		assert.equal(disconnectEventHandler.mock.callCount(), 1);
		assert.deepEqual(disconnectEventHandler.mock.calls[0].arguments, [false, "justLeave"]);
	});
	
	
	await it("client disconnected from joined", () => {
		const disconnectEventHandler = mock.fn();
		const room = new Room();
		
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.deepEqual(room.getJoinedConnections(), []);
		
		const member = room.createConnection().enter("foo", "bar");
		member.on("disconnect", disconnectEventHandler)
		assert.equal(member.status, "lobby");
		
		assert.deepEqual(room.getLobbyConnections(), [member]);
		assert.deepEqual(room.getJoinedConnections(), []);

		const joinResult = room.join(member);
		assert.equal(joinResult, true);
		assert.equal(member.status, "joined");
		
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.deepEqual(room.getJoinedConnections(), [member]);

		member.leave("justLeave");
		assert.equal(member.status, "disconnected");
		
		assert.deepEqual(room.getLobbyConnections(), []);
		assert.deepEqual(room.getJoinedConnections(), []);
		
		assert.equal(disconnectEventHandler.mock.callCount(), 1);
		assert.deepEqual(disconnectEventHandler.mock.calls[0].arguments, [true, "justLeave"]);
	});
	
	await it("client events", () => {
		const joinEventHandler = mock.fn();
		const disconnectEventHandler = mock.fn();
		const eventEventHandler = mock.fn();
		
		const room = new Room();
		const member = room.createConnection().enter("foo", "bar");
		member.on("join", joinEventHandler)
		member.on("event", eventEventHandler)
		member.on("disconnect", disconnectEventHandler);
		
		room.join(member);
		assert.deepEqual(joinEventHandler.mock.calls[0].arguments, []);
		
		member.sendEvent("a", "b", "c")
		assert.deepEqual(eventEventHandler.mock.calls[0].arguments, ["a", "b", "c"]);
		
		room.kick(member, "kickedNow");
		assert.deepEqual(disconnectEventHandler.mock.calls[0].arguments, [true, "kickedNow"]);
		
		room.kick(member, "kickedNow");
		assert.equal(disconnectEventHandler.mock.callCount(), 1);
	});
	
	await it("client events on join", () => {
		const room = new Room();
		room.on("connectionEnter", (con) => con.sendEvent("you entered"));
		const member = room.createConnection();
		let events: any[][] = [];
		member.on("event", (...e) => events.push(e));
		member.enter();
		room.join(member);
		assert.equal(events.length, 1, "got 1 event");
		assert.deepEqual(events[0], ["you entered"], "got event");
	});
	
})
