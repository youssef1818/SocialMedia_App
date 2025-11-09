import {Server as HttpServer } from 'node:http';
import { decodedToken, TokenEnum } from '../../utils/security/token.security';
import { Server} from "socket.io";
import { IAuthSocket } from './gateway.interface';
import { ChatGateway } from './../chat/chat.gateway';
import { BadRequestException } from '../../utils/response/error.response';

export const connectedSockets = new Map<string, string[]>();
let io: undefined | Server = undefined;
export const initializeIo = (httpServer: HttpServer ) => {
  // initialize socket server
    io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  //middleware 
  //listen to => http://localhost:3000/
  io.use(async (socket: IAuthSocket, next) => {
    try {
      const { user, decoded } = await decodedToken({
        authorization: socket.handshake?.auth.authorization || "",
        tokenType: TokenEnum.access,
      });

      const userTabes = connectedSockets.get(user._id.toString()) || [];
      console.log({userTabes});
      userTabes.push(socket.id);
      
      connectedSockets.set(user._id.toString(), userTabes);
      socket.credentials = { user, decoded };
      next();
    } catch (error: any) {
      next(error);
    }
  });

  //disconnection
  function disconnection(socket: IAuthSocket, io: Server){
    return socket.on("disconnect", () => {
      const userId = socket.credentials?.user._id?.toString() as string;
      let remainingTabs = connectedSockets.get(userId)?.filter((tab: string) => {
        return tab !== socket.id;
      }) || [];
      if(remainingTabs.length) {
        connectedSockets.set(userId, remainingTabs)
      }else{
        connectedSockets.delete(userId);
        getIo().emit("offline_user", userId);
      };
        console.log(`a user dis-connected from: ${socket.id}`);
        console.log({"After logout": connectedSockets});
    });
  }

  // listen to => http://localhost:3000/
  const chatGateway: ChatGateway = new ChatGateway();
  io.on("connection", (socket: IAuthSocket) => {
      console.log(`a user connected to: ${socket.id}`);
      
    chatGateway.register(socket, getIo());
    
    // handle disconnection
    disconnection(socket, getIo());
    
  });
};

export const getIo = (): Server => {
    if (!io) {
        throw new BadRequestException("Socket.io not initialized");
    }
    return io;
}
