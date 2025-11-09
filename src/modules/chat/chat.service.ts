import { Request, Response } from "express";
import { Types } from "mongoose";
import {v4 as uuid} from 'uuid';

import { ICreateChatGroupDto, IGetChatParamsDto, IGetChatQueryParamsDto, ISayHiDto, ISendMessageDto, IGetChatGroupParamsDto, IJoinRoomDto, ISendGroupMessageDto } from "./chat.dto";
import { IGetChatResponse } from "./chat.entities";
import { ChatRepository } from "./../../DB/repository/chat.repository";
import { ChatModel } from "./../../DB/model/Chat.model";

import { UserRepository } from "./../../DB/repository/user.repository";
import { UserModel } from "./../../DB/model/User.model";

import { successResponse } from "./../../utils/response/success.response";
import { NotFoundException, BadRequestException} from "./../../utils/response/error.response";

import { connectedSockets } from "../gateway/gateway";
import { deleteFile, uploadFile } from './../../utils/multer/s3.config';

export class ChatService {
  private chatModel: ChatRepository = new ChatRepository(ChatModel);
  private userModel: UserRepository = new UserRepository(UserModel);
  constructor() {}

  // REST
  
  getChat = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IGetChatParamsDto;
    const { page, size }: IGetChatQueryParamsDto = req.query;

    const chat = await this.chatModel.findOneChat({
      filter: {
        participants: {
          $all: [
            req.user?._id as Types.ObjectId,
            Types.ObjectId.createFromHexString(userId),
          ],
        },
        group: { $exists: false },
      },
      options: {
        populate: [
          {
            path: "participants",
            select: "firstName lastName email gender profileImage",
          },
        ],
      },
      page,
      size,
    });

    if (!chat) {
      throw new BadRequestException("failed to find the chat");
    }

    return successResponse<IGetChatResponse>({ res, data: { chat } });
  };

  createChatGroup = async (req: Request, res: Response): Promise<Response> => {
    const { group, participants }: ICreateChatGroupDto = req.body;
    const dbParticipants = participants.map((participants: string) => {
      return Types.ObjectId.createFromHexString(participants);
    });

    const users = await this.userModel.find({
      filter: {
        _id: {$in: dbParticipants},
        friends: {$in: req.user?._id as Types.ObjectId},
      },
    });
    if(participants.length != users.length){
      throw new NotFoundException("some or all recipient is invalid");
    }

    let group_image: string | undefined = undefined;
    const roomId = group.replaceAll(/\s+/g, "_") + "_" + uuid();
    if(req.file){
      group_image = await uploadFile({
        file: req.file as Express.Multer.File,
        path: `chat/${roomId}`,
      });
    }

    dbParticipants.push(req.user?._id as Types.ObjectId);
    const [newGroup] = (await this.chatModel.create({
      data:[
        {
          createdBy: req.user?._id as Types.ObjectId,
          group,
          roomId,
          group_image: group_image as string,
          messages: [],
          participants: dbParticipants,
        },
      ],
    })) || [];
    if(!newGroup){
      if(group_image){
        await deleteFile({Key: group_image});
      }
      throw new BadRequestException("failed to create this group");
    }

    return successResponse<IGetChatResponse>({ res, statusCode:201,data:{chat: newGroup} });
  };

  getChatGroup = async (req: Request, res: Response): Promise<Response> => {
    const { groupId } = req.params as IGetChatGroupParamsDto;
    const { page, size }: IGetChatQueryParamsDto = req.query;

    const chat = await this.chatModel.findOneChat({
      filter: {
        _id: Types.ObjectId.createFromHexString(groupId),
        participants: {$in: req.user?._id as Types.ObjectId,},
        group: { $exists: true },
      },
      options: {
        populate: [
          {
            path: "messages.createdBy",
            select: "firstName lastName email gender profileImage",
          },
        ],
      },
      page,
      size,
    });

    if (!chat) {
      throw new BadRequestException("failed to find the chat");
    }

    return successResponse<IGetChatResponse>({ res, data: { chat } });
  };
  // IO
  sayHi = ({ message, socket, callback, io }: ISayHiDto) => {
    try {
      callback ? callback(`hello from BE to FE`) : undefined;
    } catch (error) {
      socket.emit("custom_error", error);
    }
  };

// -----------OVO---------------

  // send OVO message
  sendMessage = async ({ content, socket, sendTo, io }: ISendMessageDto) => {
    try {
      const createdBy = socket.credentials?.user._id as Types.ObjectId;

      const user = await this.userModel.findOne({
        filter: {
          _id: Types.ObjectId.createFromHexString(sendTo),
          friends: { $in: createdBy },
        },
      });
      if (!user) {
        throw new NotFoundException("invalid recipient friend");
      }

      const chat = await this.chatModel.findOneAndUpdate({
        filter: {
          participants: {
            $all: [
              createdBy as Types.ObjectId,
              Types.ObjectId.createFromHexString(sendTo),
            ],
          },
          group: { $exists: false },
        },
        update: {
            $addToSet:{ messages: {content, createdBy} },
        },
      });
      if(!chat){
        const [newChat] = ( await this.chatModel.create({
            data: [
                {
                    createdBy,
                    messages: [{content, createdBy}],
                    participants:
                    [
                        createdBy as Types.ObjectId,
                        Types.ObjectId.createFromHexString(sendTo)
                    ],
                },
            ],
        })) || [];

        if(!newChat){
            throw new BadRequestException("failed to create chat");
        }
      };

      io?.to( connectedSockets.get( createdBy.toString() as string ) as string[] ).emit("successMessage", {content})

      io?.to( connectedSockets.get( sendTo ) as string[] ).emit("newMessage", {content, from: socket.credentials?.user})


    } catch (error) {
      socket.emit("custom_error", error);
    }
  };


// ----------OVM-------------

  // join OVM room
  joinRoom = async ({ roomId, socket, io }: IJoinRoomDto) => {
    try {
      const chat = await this.chatModel.findOne({
        filter: {
          roomId,
          group: {$exists: true},
          participants: {$in: socket.credentials?.user._id},
        },
      });
      if(!chat){
        throw new NotFoundException("failed to find matching room");
      }

      socket.join(chat.roomId as string);

    } catch (error) {
      socket.emit("custom_error", error);
    }
  };

  // send OVM message
  sendGroupMessage = async ({ content, socket, groupId, io }: ISendGroupMessageDto) => {
    try {
      const createdBy = socket.credentials?.user._id as Types.ObjectId;

      const chat = await this.chatModel.findOneAndUpdate({
        filter: {
          _id: Types.ObjectId.createFromHexString(groupId),
          participants: {$in: createdBy as Types.ObjectId},
          group: { $exists: true },
        },
        update: {
            $addToSet:{ messages: {content, createdBy} },
        },
      });
      if(!chat){
            throw new BadRequestException("failed to find matching room ");
      };

      io?.to( connectedSockets.get( createdBy.toString() as string ) as string[] ).emit("successMessage", {content})

      socket?.to( chat.roomId as string ).emit("newMessage", {
        content, 
        from: socket.credentials?.user, 
        groupId,
      })

    } catch (error) {
      socket.emit("custom_error", error);
    }
  };
}

export default new ChatService();
