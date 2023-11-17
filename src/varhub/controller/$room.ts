// @ts-nocheck
import { target, clientMap, send, broadcast, close } from "varhub:inner"
export default Object.freeze({
	getClients: () => [...clientMap.values()],
	getClientById: (id) => clientMap.get(id),
	addEventListener: target.addEventListener.bind(target),
	removeEventListener: target.removeEventListener.bind(target),
	send,
	broadcast,
	close
})
