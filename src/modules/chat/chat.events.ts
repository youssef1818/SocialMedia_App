import { Server } from "socket.io";
import { IAuthSocket } from "./../gateway/gateway.interface";
import { ChatService } from "./chat.service";

export class ChatEvent {
  private chatService: ChatService = new ChatService();
  constructor() {}

  sayHi = (socket: IAuthSocket, io:Server) => {
    return socket.on("sayHi", (data, callback) => {
      return this.chatService.sayHi({ message: data, socket, callback, io });
    });
  };

  sendMessage = (socket: IAuthSocket, io:Server) => {
    return socket.on("sendMessage", (data: {content: string, sendTo: string}) => {
      return this.chatService.sendMessage({ ...data, socket, io });
    });
  };
  
  joinRoom = (socket: IAuthSocket, io:Server) => {
    return socket.on("join_room", (data: {roomId: string}) => {
      return this.chatService.joinRoom({ ...data, socket, io });
    });
  };
  
    sendGroupMessage = (socket: IAuthSocket, io:Server) => {
      return socket.on("sendGroupMessage", (data: {content: string, groupId: string}) => {
        return this.chatService.sendGroupMessage({ ...data, socket, io });
      });
    };

  
}
