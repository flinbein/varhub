import { Room } from "../Room.js"
// todo: ADD MOCK = Sandboxer
describe('room-create', function () {
	test("false", async () => {
		const onCloseMock = jest.fn;
		const room = new Room("12345", onCloseMock);
		await room.init({});
		expect(room.id).toBe("12345");
	});
});
