import { default as assert } from "node:assert";
import { describe, it, mock } from "node:test";

import { Room } from "../src/varhub/Room.js";
import { TimeoutDestroyController } from "../src/controllers/TimeoutDestroyController.js";

void describe("TimeoutDestroyController", () => {
	
	
	it("destroy new room", async () => {
		const room = new Room();
		new TimeoutDestroyController(room, 15);
		await new Promise(r => setTimeout(r, 8));
		assert.ok(!room.destroyed, "room not destroyed");
		await new Promise(r => setTimeout(r, 8));
		assert.ok(room.destroyed, "room destroyed");
	});
	
	
	it("destroy room with connection", async () => {
		const room = new Room();
		new TimeoutDestroyController(room, 15);
		await new Promise(r => setTimeout(r, 5));
		
		assert.ok(!room.destroyed, "room not destroyed");
		const connection = room.createConnection().enter();
		await new Promise(r => setTimeout(r, 30));
		
		assert.ok(!room.destroyed, "room not destroyed with connection");
		connection.leave();
		await new Promise(r => setTimeout(r, 8));
		
		assert.ok(!room.destroyed, "room not destroyed after leave");
		await new Promise(r => setTimeout(r, 8));
		
		assert.ok(room.destroyed, "room not destroyed after leave and timeout");
	});
	
})
