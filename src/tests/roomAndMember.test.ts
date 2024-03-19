// @ts-ignore
import { default as assert } from "node:assert";
import { describe as DESCRIBE, it, mock } from "node:test";

import { Room } from "../varhub/Room.js";

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
		room.on("memberEnter", enterEventHandler)
		const member = room.createMember("foo", "bar");
		assert.equal(enterEventHandler.mock.callCount(), 1);
		assert.deepEqual(enterEventHandler.mock.calls[0].arguments, [member, "foo", "bar"]);
		assert.deepEqual(room.getLobbyMembers(), [member]);
		assert.deepEqual(room.getJoinedMembers(), []);
	});
	
	await it("kick client", () => {
		const leaveEventHandler = mock.fn();
		const room = new Room();
		room.on("memberLeave", leaveEventHandler);
		const member = room.createMember("foo", "bar");
		assert.deepEqual(room.getLobbyMembers(), [member]);
		assert.deepEqual(room.getJoinedMembers(), []);
		
		const joinResult = room.join(member);
		assert.equal(joinResult, true);
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.deepEqual(room.getJoinedMembers(), [member]);
		assert.equal(leaveEventHandler.mock.callCount(), 0);
		
		room.kick(member, "messageToKick");
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.deepEqual(room.getJoinedMembers(), []);
		assert.equal(leaveEventHandler.mock.callCount(), 1);
		assert.deepEqual(leaveEventHandler.mock.calls[0].arguments, [member, true, "messageToKick"]);
	});
	
	await it("client disconnected from lobby", () => {
		const leaveEventHandler = mock.fn();
		const disconnectEventHandler = mock.fn();
		const enterEventHandler = mock.fn();
		const room = new Room();
		room.on("memberLeave", leaveEventHandler);
		room.on("memberEnter", enterEventHandler);
		
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.equal(enterEventHandler.mock.callCount(), 0);
		
		const member = room.createMember("foo", "bar");
		member.on("disconnect", disconnectEventHandler);
		assert.deepEqual(room.getLobbyMembers(), [member]);
		assert.equal(enterEventHandler.mock.callCount(), 1);
		assert.deepEqual(enterEventHandler.mock.calls[0].arguments, [member, "foo", "bar"]);
		
		assert.equal(leaveEventHandler.mock.callCount(), 0);
		assert.equal(disconnectEventHandler.mock.callCount(), 0);
		member.leave("justLeave");
		assert.equal(member.status, "disconnected");
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.equal(leaveEventHandler.mock.callCount(), 1);
		assert.deepEqual(leaveEventHandler.mock.calls[0].arguments, [member, false, "justLeave"]);
		assert.equal(disconnectEventHandler.mock.callCount(), 1);
		assert.deepEqual(disconnectEventHandler.mock.calls[0].arguments, [false, "justLeave"]);
	});
	
	
	await it("client disconnected from joined", () => {
		const disconnectEventHandler = mock.fn();
		const room = new Room();
		
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.deepEqual(room.getJoinedMembers(), []);
		
		const member = room.createMember("foo", "bar");
		member.on("disconnect", disconnectEventHandler)
		assert.equal(member.status, "lobby");
		
		assert.deepEqual(room.getLobbyMembers(), [member]);
		assert.deepEqual(room.getJoinedMembers(), []);

		const joinResult = room.join(member);
		assert.equal(joinResult, true);
		assert.equal(member.status, "joined");
		
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.deepEqual(room.getJoinedMembers(), [member]);

		member.leave("justLeave");
		assert.equal(member.status, "disconnected");
		
		assert.deepEqual(room.getLobbyMembers(), []);
		assert.deepEqual(room.getJoinedMembers(), []);
		
		assert.equal(disconnectEventHandler.mock.callCount(), 1);
		assert.deepEqual(disconnectEventHandler.mock.calls[0].arguments, [true, "justLeave"]);
	});
	
	await it("client events", () => {
		const joinEventHandler = mock.fn();
		const disconnectEventHandler = mock.fn();
		const eventEventHandler = mock.fn();
		
		const room = new Room();
		const member = room.createMember("foo", "bar");
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
	
})
