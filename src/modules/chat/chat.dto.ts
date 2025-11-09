import { Server } from 'socket.io';
import { IAuthSocket } from './../gateway/gateway.interface';
import {z} from 'zod';
import { createChatGroup, getChat, getChatGroup } from './chat.validation';

export type IGetChatParamsDto = z.infer<typeof getChat.params>
export type IGetChatGroupParamsDto = z.infer<typeof getChatGroup.params>
export type IGetChatQueryParamsDto = z.infer<typeof getChat.query>
export type ICreateChatGroupDto = z.infer<typeof createChatGroup.body>

export interface IMainDto {
    socket:IAuthSocket;
    callback?:any;
    io?: Server;
}

export interface ISayHiDto extends IMainDto {
    message: string;
}

export interface ISendMessageDto extends IMainDto {
    content: string;
    sendTo: string;
}

export interface IJoinRoomDto extends IMainDto {
    roomId: string;
}
    
    export interface ISendGroupMessageDto extends IMainDto {
        content: string;
        groupId: string;
    }