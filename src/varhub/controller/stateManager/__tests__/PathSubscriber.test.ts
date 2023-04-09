import {PathSubscriber} from "../PathSubscriber.js";

let sub = new PathSubscriber<any[]>();
beforeEach(() => sub = new PathSubscriber<any[]>());


test("new sub is empty", () => {
	expect(sub.isEmpty()).toBeTruthy();
});

test("subscription id is positive", () => {
	const subId = sub.subscribe("player-1", [], () => {});
	expect(subId).toBeTruthy();
});

test("string and number is different", () => {
	const listenerString = jest.fn();
	const listenerNumber = jest.fn();
	sub.subscribe("player-1", ["1"], listenerString);
	sub.subscribe("player-1", [1], listenerNumber);
	sub.emit(["1"], "string");
	sub.emit([1], "number");
	expect(listenerString).toBeCalledTimes(1);
	expect(listenerString).toBeCalledWith("string");
	expect(listenerNumber).toBeCalledTimes(1);
	expect(listenerNumber).toBeCalledWith("number");
});

test("emit throws error on bad subscriber", () => {
	sub.subscribe("player-1", [], () => {
		throw new Error();
	});
	expect(() => {
		sub.emit([]);
	}).toThrow(Error);
});

test("root listener", () => {
	expect(sub.isEmpty()).toBeTruthy();
	const listener = jest.fn();
	sub.subscribe("player-1", [], listener);
	sub.emit(["A", 12, "B"]);
	sub.emit([]);
	expect(listener).toBeCalledTimes(2);
});

test("same listener", () => {
	const listener = jest.fn();
	sub.subscribe("player-1", ["A"], listener);
	sub.subscribe("player-2", ["B"], listener);
	sub.emit(["A"]); // 1: as player-1
	sub.emit(["B"]); // 1: as player-2
	sub.emit(["C"]); // 0
	expect(listener).toBeCalledTimes(2);
});

test("same listener + unsubscribe", () => {
	const listener = jest.fn();
	const subId = sub.subscribe("player-1", ["A"], listener);
	sub.subscribe("player-2", ["A"], listener);
	
	sub.emit(["A"]); // 2: 1 as player-1 + 1 as player-2
	sub.emit(["B"]); // 0
	sub.unsubscribe(subId);
	sub.emit(["A"]); // 1: as player-2
	expect(listener).toBeCalledTimes(3);
});

test("separate listener", () => {
	const listener1 = jest.fn();
	const listener2 = jest.fn();
	sub.subscribe("player-1", ["A"], listener1);
	sub.subscribe("player-1", ["B"], listener2);
	sub.emit(["A"], "a");
	sub.emit(["B"], "b");
	expect(listener1).toBeCalledWith("a");
	expect(listener1).toBeCalledTimes(1);
	expect(listener2).toBeCalledWith("b");
	expect(listener2).toBeCalledTimes(1);
});

test("subscribe + unsubscribe", () => {
	const listener = jest.fn();
	expect(sub.isEmpty()).toBeTruthy();
	const subId = sub.subscribe("player-1", ["A"], listener);
	expect(sub.isEmpty()).toBeFalsy();
	sub.emit(["wrong"]);
	sub.emit([]);
	sub.emit(["A"]);
	sub.emit(["A", "B"]);
	sub.unsubscribe(subId);
	sub.emit(["wrong"]);
	sub.emit([]);
	sub.emit(["A"]);
	sub.emit(["A", "B"]);
	expect(listener).toBeCalledTimes(3);
	expect(sub.isEmpty()).toBeTruthy();
});

test("trees", () => {
	const listener1 = jest.fn();
	const listener2 = jest.fn();
	sub.subscribe("player-1", ["A","B","C"], listener1);
	sub.subscribe("player-2", ["A","X","Y"], listener2);
	
	sub.emit(["A","B"])
	expect(listener1).toBeCalledTimes(1);
	expect(listener2).toBeCalledTimes(0);
	listener1.mockClear();
	listener2.mockClear();
	
	sub.emit(["A","X"])
	expect(listener1).toBeCalledTimes(0);
	expect(listener2).toBeCalledTimes(1);
	listener1.mockClear();
	listener2.mockClear();
	
	sub.emit(["A","X","Y","Z"])
	expect(listener1).toBeCalledTimes(0);
	expect(listener2).toBeCalledTimes(1);
	listener1.mockClear();
	listener2.mockClear();
	
	sub.emit(["A"])
	expect(listener1).toBeCalledTimes(1);
	expect(listener2).toBeCalledTimes(1);
	listener1.mockClear();
	listener2.mockClear();
	
	sub.emit(["Z"])
	expect(listener1).toBeCalledTimes(0);
	expect(listener2).toBeCalledTimes(0);
	listener1.mockClear();
	listener2.mockClear();
});

test("deep subscribe + unsubscribe", () => {
	const listener = jest.fn();
	expect(sub.isEmpty()).toBeTruthy();
	const subId = sub.subscribe("player-1", ["A", "B"], listener);
	expect(sub.isEmpty()).toBeFalsy();
	sub.emit(["wrong"]);
	sub.emit(["A"]);
	sub.emit(["A", "B", "C"]);
	sub.unsubscribe(subId);
	sub.emit(["wrong"]);
	sub.emit(["A"]);
	sub.emit(["A", "B", "C"]);
	expect(listener).toBeCalledTimes(2);
	expect(sub.isEmpty()).toBeTruthy();
});

describe('player subscriptions', function () {
	test("unsubscribe player", () => {
		const listener = jest.fn();
		sub.subscribe("player-1", ["A", "B"], listener);
		sub.emit(["A"]);
		sub.unsubscribeAll("player-1");
		sub.emit(["A"]);
		expect(listener).toBeCalledTimes(1);
		expect(sub.isEmpty()).toBeTruthy();
	});
	
	test("unsubscribe dif players", () => {
		const listener1 = jest.fn();
		const listener2 = jest.fn();
		sub.subscribe("player-1", ["A", "B"], listener1);
		sub.subscribe("player-2", ["C", "D"], listener2);
		sub.emit([]);
		sub.emit(["A"]);
		sub.emit(["C"]);
		sub.unsubscribeAll("player-1");
		sub.emit([]);
		expect(listener1).toBeCalledTimes(2);
		expect(listener2).toBeCalledTimes(3);
		expect(sub.isEmpty()).toBeFalsy();
		sub.unsubscribeAll("player-2");
		expect(sub.isEmpty()).toBeTruthy();
	})
});
