import { Room } from "../Room.js";

export function getRoomData(room: Room): string {
	
	return JSON.stringify({
		roomId: room.roomId,
		title: room.title,
	})
}
