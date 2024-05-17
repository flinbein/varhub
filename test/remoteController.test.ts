import { default as assert } from "node:assert";
import { describe, it, mock } from "node:test";

import { Room } from "../src/varhub/Room.js";
import { RemoteController } from "../src/controllers/RemoteController.js";

void describe("RemoteController", () => {
	
	
	it("test events", async () => {
		const room = new Room();
		const main = room.createConnection().enter();
		room.join(main);
		new RemoteController(room, main);
		const events: any[] = []
		main.on("event", (...data) => events.push(data));
		
		room.publicMessage = "new-message";
		assert.deepEqual(events[0], ["messageChange", "new-message", null], "got event publicMessage");
		
		const client1 = room.createConnection().enter("client1");
		assert.deepEqual(events[1], ["connectionEnter", 1, "client1"], "got event connectionEnter");
		
		room.join(client1);
		assert.deepEqual(events[2], ["connectionJoin", 1], "got event connectionJoin");
		
		client1.message("foo", "bar");
		assert.deepEqual(events[3], ["connectionMessage", 1, "foo", "bar"], "got event connectionMessage")
		
		client1.leave("leave");
		assert.deepEqual(events[4], ["connectionClosed", 1, true, "leave"], "got event connectionClosed");
	});
	
	it("test join and kick command", async () => {
		const room = new Room();
		const main = room.createConnection().enter();
		room.join(main);
		new RemoteController(room, main);
		
		const client1 = room.createConnection().enter("client1");
		assert.equal(client1.status, "lobby", "client in lobby");
		main.message("join", client1.id);
		assert.equal(client1.status, "joined", "client joined");
		main.message("kick", client1.id);
		assert.equal(client1.status, "disconnected", "client off");
	});
	
	it("test publicMessage command", async () => {
		const room = new Room();
		const main = room.createConnection().enter();
		room.join(main);
		new RemoteController(room, main);
		
		main.message("publicMessage", "new-message");
		assert.equal(room.publicMessage, "new-message", "publicMessage set");
	});
	
	it("test destroy command", async () => {
		const room = new Room();
		const main = room.createConnection().enter();
		room.join(main);
		new RemoteController(room, main);
		
		main.message("destroy");
		assert.ok(room.destroyed, "room destroyed");
		assert.ok(!main.connected, "main disconnected");
	});
	
})
