// @ts-nocheck
import { target, clientMap, send, broadcast, close, isPublished, publish, unpublish, setPublicMessage, getPublicMessage  } from "varhub:inner"
export default Object.freeze({
	getClients: () => [...clientMap.values()],
	getClientById: (id) => clientMap.get(id),
	addEventListener: target.addEventListener.bind(target),
	removeEventListener: target.removeEventListener.bind(target),
	send,
	broadcast,
	close,
	isPublished,
	publish,
	unpublish,
	getPublicMessage,
	setPublicMessage
})
