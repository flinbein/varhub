// @ts-nocheck
let hooks;
export function init(sentHooks){
	hooks = sentHooks;
}
export const target = new EventTarget;

export const clientMap = new Map();

class Client {
	#id;
	#joinTime = performance.now();
	get id(){
		return this.#id
	}
	get online(){
		return clientMap.has(this.#id);
	}
	get joinTime(){
		return this.#joinTime
	}
	constructor(id) {
		this.#id = id;
	}
	send(...msg){
		send([this.#id], ...msg);
	}
	kick(message){
		return kick(this.#id, message);
	}
}

class JoinEvent extends Event {
	#client;
	#messages;
	get client() {return this.#client}
	get message() {return this.#messages[0]}
	get messages() {return this.#messages}
	constructor(client, ...messages) {
		super("join", {cancelable: true});
		this.#client = client;
		this.#messages = messages;
	}
}
class LeaveEvent extends Event {
	#client;
	get client() {return this.#client}
	constructor(client) {
		super("leave", {cancelable: false});
		this.#client = client;
	}
}
export function onJoin(clientId, ...messages){
	const client = new Client(clientId)
	const event = new JoinEvent(client, ...messages);
	target.dispatchEvent(event);
	if (event.defaultPrevented) return;
	clientMap.set(clientId, client);
	return client;
}

export function onLeave(clientId, client){
	clientMap.delete(clientId);
	const event = new LeaveEvent(client);
	target.dispatchEvent(event);
}

function kick(clientId, message){
	if (!clientMap.has(clientId)) return false;
	clientMap.delete(clientId);
	hooks.kick(clientId, message);
	onLeave(clientId);
	return true;
}

export function send(clientIdList, ...message){
	if (!Array.isArray(clientIdList)) clientIdList = [clientIdList];
	clientIdList = clientIdList.map(clientInfo => clientInfo instanceof Client ? clientInfo.id : clientInfo);
	hooks.send(clientIdList, ...message);
}

export function broadcast(...message){
	hooks.send([...clientMap.keys()], ...message);
}

export function close(reason){
	hooks.close(reason);
}

