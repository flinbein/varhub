import { default as assert } from "node:assert";
import { describe as DESCRIBE, it, Mock, mock } from "node:test";

import { Room } from "../varhub/Room.js";
import { Player, PlayerController } from "../controllers/PlayerController.js";
import { RPCController } from "../controllers/RPCController.js";
import { ApiHelper, ApiHelperController } from "../controllers/ApiHelperController.js";

class CounterApi implements ApiHelper {
	constructor(public counter: number) {}
	destroy() {
		this.counter = 0;
	}
	
	call(arg: number){
		return this.counter += arg;
	}
}

const apiHelpers = {
	"counter": CounterApi
}

class ChatController {
	playerController: PlayerController;
	rpcController: RPCController;
	apiHelperController: ApiHelperController;
	counterApi: CounterApi;
	constructor(room: Room) {
		this.playerController = new PlayerController(room);
		this.apiHelperController = new ApiHelperController(room, apiHelpers);
		
		this.counterApi = this.apiHelperController.getOrCreateApi("counter", 1000) as CounterApi;
		
		this.rpcController = new RPCController(room, (connection, [method, ...args]) => {
			const player = this.playerController.getPlayerOfConnection(connection);
			if (!player) return;
			const playerId = this.playerController.getPlayerId(player);
			if (method === "broadcast") {
				for (let p of this.playerController.getPlayers().values()) {
					p.sendEvent("$rpcEvent", "message", playerId, args[0]);
				}
				return true;
			} else if (method === "private") {
				const recipientPlayer = this.playerController.getPlayerById(args[0]);
				if (!recipientPlayer) return false;
				if (!recipientPlayer.online) return false;
				recipientPlayer.sendEvent("$rpcEvent", "privateMessage", playerId, args[1]);
				return true;
			} else if (method === "changeCounter") {
				const result = this.counterApi.call(args[0]);
				this.playerController.broadcastEvent("$rpcEvent", "counter", result);
				return result;
			} else if (method === "getCounter") {
				return this.counterApi.call(0);
			} else if (method === "getPlayers") {
				return new Set(this.playerController.getPlayers().keys());
			} else {
				throw new Error("unknown method "+method);
			}
		});
	}
}

const lastArgs = ({mock}: Mock<(...args: any[]) => void>) => mock.calls[mock.callCount() - 1]?.arguments;
const argsN = ({mock}: Mock<(...args: any[]) => void>, n: number) => mock.calls[n]?.arguments;

void DESCRIBE("meta controller", async () => {
	
	
	await it("player events", () => {
		const room = new Room();
		const ctrl = new ChatController(room);
		const playerJoinHdl = mock.fn();
		const playerLeaveHdl = mock.fn();
		const playerOnlineHdl = mock.fn();
		const playerOfflineHdl = mock.fn();
		
		assert.equal(ctrl.playerController.getPlayers().size, 0, "no players on init");
		ctrl.playerController.on("join", playerJoinHdl);
		ctrl.playerController.on("leave", playerLeaveHdl);
		ctrl.playerController.on("online", playerOnlineHdl);
		ctrl.playerController.on("offline", playerOfflineHdl);
		
		const alice1 = room.createConnection("Alice");
		const alicePlayer = ctrl.playerController.getPlayerById("Alice") as Player;
		assert.ok(alice1.connected, "Alice1 connected");
		assert.equal(playerJoinHdl.mock.callCount(), 1, "one join event");
		assert.deepEqual(lastArgs(playerJoinHdl), [alicePlayer], "Alice in join event");
		
		const alice2 = room.createConnection("Alice");
		assert.ok(alice2.connected, "Alice2 connected");
		assert.equal(playerJoinHdl.mock.callCount(), 1, "one join event again");
		
		alice2.leave("kick");
		assert.ok(alicePlayer.online, "alice online on kick 1/2");
		assert.equal(playerOfflineHdl.mock.callCount(), 0, "no offline events");
		
		alice1.leave("kick");
		assert.ok(!alicePlayer.online, "alice offline on kick all");
		assert.equal(playerOfflineHdl.mock.callCount(), 1, "1 offline event");
		assert.deepEqual(lastArgs(playerOfflineHdl), [alicePlayer], "Alice goes offline event");
		assert.equal(ctrl.playerController.getPlayerById("Alice"), alicePlayer, "player still in ctrl");
		
		const alice3 = room.createConnection("Alice");
		assert.equal(playerOfflineHdl.mock.callCount(), 1, "1 online event");
		assert.deepEqual(lastArgs(playerOfflineHdl), [alicePlayer], "Alice goes online event");
		
		ctrl.playerController.kick(alicePlayer);
		assert.ok(!alice3.connected, "alice3 kicked on player kick");
		assert.deepEqual(lastArgs(playerLeaveHdl), [alicePlayer], "Alice leave event");
	});
	
	await it("private messages", () => {
		const room = new Room();
		new ChatController(room);
		const aliceEvents = mock.fn();
		const bobEvents = mock.fn();
		
		const alice = room.createConnection("Alice");
		alice.on("event", aliceEvents);
		const bob = room.createConnection("Bob");
		bob.on("event", bobEvents);
		
		alice.message("$rpc", 1, "private", "Bob", "Hello");
		assert.deepEqual(lastArgs(aliceEvents), ["$rpcResult", 1, true, true], "rpc result 1 for Alice");
		assert.deepEqual(lastArgs(bobEvents), ["$rpcEvent", "privateMessage", "Alice", "Hello"], "PM for Bob");
		
		bob.leave();
		alice.message("$rpc", 2, "private", "Bob", "Hello again!");
		assert.deepEqual(lastArgs(aliceEvents), ["$rpcResult", 2, true, false], "rpc result 2 for Alice");
		assert.equal(bobEvents.mock.callCount(), 1, "No messages for Bob");
	})
	
	await it("broadcast messages", () => {
		const room = new Room();
		const bobEvents = mock.fn();
		const aliceEvents = mock.fn();
		new ChatController(room);
		
		const alice = room.createConnection("Alice");
		alice.on("event", aliceEvents);
		const bob = room.createConnection("Bob");
		bob.on("event", bobEvents);
		
		alice.message("$rpc", 1, "broadcast", "Hi there");
		assert.deepEqual(argsN(aliceEvents, 0), ["$rpcEvent", "message", "Alice", "Hi there"], "Alice got msg 1");
		assert.deepEqual(argsN(aliceEvents, 1), ["$rpcResult", 1, true, true], "rpc result 1 for Alice");
		assert.deepEqual(argsN(bobEvents, 0), ["$rpcEvent", "message", "Alice", "Hi there"], "Bob got msg 1");
		
		bob.message("$rpc", 1, "broadcast", "Hello");
		assert.deepEqual(argsN(bobEvents, 1), ["$rpcEvent", "message", "Bob", "Hello"], "Bob got msg 2");
		assert.deepEqual(argsN(bobEvents, 2), ["$rpcResult", 1, true, true], "rpc result 1 for Bob");
		assert.deepEqual(argsN(aliceEvents, 2), ["$rpcEvent", "message", "Bob", "Hello"], "Alice got msg 2");
	})
	
	await it("get players", () => {
		const room = new Room();
		new ChatController(room);
		const aliceEvents = mock.fn();
		
		const alice = room.createConnection("Alice");
		alice.on("event", aliceEvents);
		room.createConnection("Bob");
		room.createConnection("Bob");
		alice.message("$rpc", 1, "getPlayers");
		
		const rpcResult = lastArgs(aliceEvents);
		const players = rpcResult[3] as Set<string>;
		assert.equal(players.size, 2, "2 players");
		assert.ok(players.has("Alice"), "Alice is player");
		assert.ok(players.has("Bob"), "Bob is player");
	});
	
	await it("get counter", () => {
		const room = new Room();
		new ChatController(room);
		const aliceEvents = mock.fn();
		
		const alice = room.createConnection("Alice");
		alice.on("event", aliceEvents);
		alice.message("$rpc", 1, "getCounter");
		
		const rpcResult = lastArgs(aliceEvents);
		const counterValue = rpcResult[3] as Set<string>;
		assert.equal(counterValue, 1000, "base counter is 1000");
	});
	
	await it("get counter", () => {
		const room = new Room();
		new ChatController(room);
		const aliceEvents = mock.fn();
		const bobEvents = mock.fn();
		
		const alice = room.createConnection("Alice");
		alice.on("event", aliceEvents);
		const bob = room.createConnection("Bob");
		bob.on("event", bobEvents);
		alice.message("$rpc", 1, "changeCounter", 20);
		
		const rpcResult = lastArgs(aliceEvents);
		const counterValue = rpcResult[3] as Set<string>;
		assert.equal(counterValue, 1020, "next counter is 1020");
		assert.deepEqual(lastArgs(bobEvents), ["$rpcEvent", "counter", 1020], "Bob got info with new counter");
	});
})
