let hooks;
export const target = new EventTarget;

export const clients = new Set();
class JoinEvent extends Event {
	#clientId;
	#messages;
	get clientId() {return this.#clientId}
	get messages() {return this.#messages}
	constructor(clientId, ...messages) {
		super("join", {cancelable: true});
		this.#clientId = clientId;
		this.#messages = messages;
	}
}
class LeaveEvent extends Event {
	#clientId;
	get clientId() {return this.#clientId}
	constructor(clientId) {
		super("leave", {cancelable: true});
		this.#clientId = clientId;
	}
}
export function init(sentHooks){
	hooks = sentHooks;
}
export function onJoin(clientId, ...messages){
	const event = new JoinEvent(clientId, ...messages);
	target.dispatchEvent(event);
	if (event.defaultPrevented) return false
	clients.add(clientId);
	return true;
}

export function onLeave(clientId){
	clients.delete(clientId);
	const event = new LeaveEvent(clientId);
	target.dispatchEvent(event);
}

export function kick(clientId, message){
	if (!clients.has(clientId)) return false;
	clients.delete(clientId);
	hooks.kick.call(undefined, clientId, message);
	onLeave(clientId);
	return true;
}

export function send(clientId, ...message){
	hooks.send.call(undefined, clientId, ...message);
}
export function close(reason){
	hooks.close.call(undefined, reason);
}

