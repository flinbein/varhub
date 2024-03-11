import { describe, it } from "node:test";
import assert from "node:assert";

import { Room_ } from "../varhub/Room_";

console.log("TEST-GO", Room_);

describe("Room_ create", async () => {
	const room = new Room_({ttlOnEmpty: 10, ttlOnInit: 1000});
	await it("init-test", async () => {
		void({
			hooks: {
				getClients: "getClients",
				kick: true,
			}
		})
		await room.init({
			modules: {
				testModule: {
					evaluate: true,
					type: "js",
					source: `
					import room from "varhub:room";

					room.addEventListener("join", (event) => {
						if (event.messages[0] !== "roomPass") event.preventDefault();
					});

					export function getClients(){
						console.log(this.client.id, "requests clients list");
						return [...room.getClients().map(s => s.id)];
					}

					export function kick(name, reason){
						console.log(this.client.id, "call kick", name);
						return room.getClientById(name)?.kick(reason) ?? false;
					}

					export function getWrongData(){
						return () => {};
					}

					export function throwError(message){
						throw new Error(message);
					}

					export function nope(){

					}
				`,
					hooks: "*",
				},
				"inner:timer": {
					type: "js",
					evaluate: true,
					source: undefined,
					hooks: ["syncTime"]
				}
			},
			config: undefined,
			integrity: undefined,
			integrityRequired: undefined
		});

		const time1 = await room.call("AndreyQ", "syncTime");
		const time2 = await room.call("AndreyQ", "syncTime");
		assert.notEqual(time1, time2);


		const client1Connected = await room.addMember("AndreyQ", "roomPass", 12);
		assert.equal(client1Connected, true);

		const client2Connected = await room.addMember("CoolHacher99", "wrong-pass");
		assert.equal(client2Connected, false);

		const client3Connected = await room.addMember("MYXOMOPX", "roomPass");
		assert.equal(client3Connected, true);

		const resultClients1 = await room.call("AndreyQ", "getClients");
		assert.deepEqual(resultClients1, ["AndreyQ", "MYXOMOPX"]);

		const resultKick1 = await room.call("AndreyQ", "kick", "MYXOMOPX");
		assert.deepEqual(resultKick1, true);

		const resultKick2 = await room.call("AndreyQ", "kick", "MYXOMOPX", "again");
		assert.deepEqual(resultKick2, false);

		const resultClients2 = await room.call("AndreyQ", "getClients");
		assert.deepEqual(resultClients2, ["AndreyQ"]);

		await assert.rejects(room.call("AndreyQ", "getWrongData"));

		try {
			await room.call("AndreyQ", "throwError", "xx");
			assert.equal("Throws error", "No errors on call throwError")
		} catch (error) {
			await assert.equal((error as any)?.message, "xx");
		}

		const resultClients3 = await room.call("AndreyQ", "getClients");
		assert.deepEqual(resultClients3, ["AndreyQ"]);

		const resultNope = await room.call("AndreyQ", "nope");
		assert.equal(resultNope, undefined);

		for (const clientId of room.getClients()) {
			room.removeClient(clientId);
		}

		await new Promise(r => setTimeout(r, 50)); // wait 50ms, but ttlOnEmpty = 10ms
		assert.equal(room.status, "closed");
	})
})
