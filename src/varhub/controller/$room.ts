import { target, clients, kick, send, close } from "varhub:inner"
export default Object.freeze({
	getClients: () => new Set(clients),
	addEventListener: target.addEventListener.bind(target),
	removeEventListener: target.removeEventListener.bind(target),
	kick,
	send,
	close
})
