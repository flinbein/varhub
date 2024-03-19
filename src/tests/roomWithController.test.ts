// @ts-ignore
import { default as assert } from "node:assert";
import { describe as DESCRIBE, it, Mock, mock } from "node:test";

import { Room } from "../varhub/Room.js";
import { Member } from "../varhub/Member.js";

class RoomController {
	#memberNames = new WeakMap<Member, string>();
	constructor(room: Room) {
		room.on("memberEnter", (member, name) => {
			this.#memberNames.set(member, name);
			room.join(member);
		});
		
		room.on("memberMessage", (member, msg) => {
			if (msg === "shit") {
				room.kick(member);
				return;
			}
			for (let joinedMember of room.getJoinedMembers()) {
				joinedMember.sendEvent("message", this.#memberNames.get(member), msg);
			}
		});
	}
}

const lastArgs = ({mock}: Mock<(...args: any[]) => void>) => mock.calls[mock.callCount() - 1]?.arguments;

void DESCRIBE("Room with controller", async () => {
	
	
	await it("messages", () => {
		const room = new Room();
		new RoomController(room);
		
		const userAlice = room.createMember("Alice");
		const aliceEvents = mock.fn();
		userAlice.on("event", aliceEvents);
		const userBob = room.createMember("Bob");
		const bobEvents = mock.fn();
		userBob.on("event", bobEvents);
		
		userBob.message("hi!");
		assert.deepEqual(lastArgs(aliceEvents), ["message", "Bob", "hi!"]);
		assert.deepEqual(lastArgs(bobEvents), ["message", "Bob", "hi!"]);
		
		userAlice.message("hello!");
		assert.deepEqual(lastArgs(aliceEvents), ["message", "Alice", "hello!"]);
		assert.deepEqual(lastArgs(bobEvents), ["message", "Alice", "hello!"]);
		
		userBob.message("shit"); // kick-word
		assert.equal(userBob.status, "disconnected");
		assert.deepEqual(lastArgs(aliceEvents), ["message", "Alice", "hello!"]);
		assert.deepEqual(lastArgs(bobEvents), ["message", "Alice", "hello!"]);
	});
	
})
