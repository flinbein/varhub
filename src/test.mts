import { describe, it, mock } from "node:test";
import assert from "node:assert";

import { Room } from "./varhub/Room.js";

describe("Room create", async () => {
	const room = new Room(mock.fn(), mock.fn(), mock.fn());
	
	await it("init-test", async () => {
		void({
			hooks: {
				getClients: "getClients",
				kick: true,
			}
		})
		await room.init({
			testModule: {
				evaluate: true,
				type: "js",
				source: `
					import room from "varhub:room";
					
					room.addEventListener("join", (event) => {
						if (event.messages[0] !== "roomPass") event.preventDefault();
					});
					
					export function getClients(){
						console.log(this.clientId, "requests clients list");
						return [...room.getClients()];
					}
					
					export function kick(name){
						console.log(this.clientId, "call kick", name);
						return room.kick(name);
					}
					
					export function getWrongData(){
						return () => {};
					}
					
					export function throwError(message){
						throw new Error(message);
					}
				`,
				hooks: ["getClients", "kick", "getWrongData", "throwError"]
			},
			"inner:timer": {
				type: "js",
				evaluate: true,
				source: undefined,
				hooks: ["syncTime"]
			}
		});
		
		const time1 = await room.call("AndreyQ", "syncTime");
		console.log("TIME1", time1);
		const time2 = await room.call("AndreyQ", "syncTime");
		console.log("TIME2", time2);
		
		const client1Connected = await room.addClient("AndreyQ", "roomPass", 12);
		assert.equal(client1Connected, true);
		
		const client2Connected = await room.addClient("CoolHacher99", "wrong-pass");
		assert.equal(client2Connected, false);
		
		const client3Connected = await room.addClient("MYXOMOPX", "roomPass");
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
		console.log("END-TEST");
	})
})
