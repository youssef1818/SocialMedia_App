"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvent = void 0;
const chat_service_1 = require("./chat.service");
class ChatEvent {
    chatService = new chat_service_1.ChatService();
    constructor() { }
    sayHi = (socket, io) => {
        return socket.on("sayHi", (data, callback) => {
            return this.chatService.sayHi({ message: data, socket, callback, io });
        });
    };
    sendMessage = (socket, io) => {
        return socket.on("sendMessage", (data) => {
            return this.chatService.sendMessage({ ...data, socket, io });
        });
    };
    joinRoom = (socket, io) => {
        return socket.on("join_room", (data) => {
            return this.chatService.joinRoom({ ...data, socket, io });
        });
    };
    sendGroupMessage = (socket, io) => {
        return socket.on("sendGroupMessage", (data) => {
            return this.chatService.sendGroupMessage({ ...data, socket, io });
        });
    };
}
exports.ChatEvent = ChatEvent;
