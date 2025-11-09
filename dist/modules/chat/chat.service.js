"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const chat_repository_1 = require("./../../DB/repository/chat.repository");
const Chat_model_1 = require("./../../DB/model/Chat.model");
const user_repository_1 = require("./../../DB/repository/user.repository");
const User_model_1 = require("./../../DB/model/User.model");
const success_response_1 = require("./../../utils/response/success.response");
const error_response_1 = require("./../../utils/response/error.response");
const gateway_1 = require("../gateway/gateway");
const s3_config_1 = require("./../../utils/multer/s3.config");
class ChatService {
    chatModel = new chat_repository_1.ChatRepository(Chat_model_1.ChatModel);
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    getChat = async (req, res) => {
        const { userId } = req.params;
        const { page, size } = req.query;
        const chat = await this.chatModel.findOneChat({
            filter: {
                participants: {
                    $all: [
                        req.user?._id,
                        mongoose_1.Types.ObjectId.createFromHexString(userId),
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
            throw new error_response_1.BadRequestException("failed to find the chat");
        }
        return (0, success_response_1.successResponse)({ res, data: { chat } });
    };
    createChatGroup = async (req, res) => {
        const { group, participants } = req.body;
        const dbParticipants = participants.map((participants) => {
            return mongoose_1.Types.ObjectId.createFromHexString(participants);
        });
        const users = await this.userModel.find({
            filter: {
                _id: { $in: dbParticipants },
                friends: { $in: req.user?._id },
            },
        });
        if (participants.length != users.length) {
            throw new error_response_1.NotFoundException("some or all recipient is invalid");
        }
        let group_image = undefined;
        const roomId = group.replaceAll(/\s+/g, "_") + "_" + (0, uuid_1.v4)();
        if (req.file) {
            group_image = await (0, s3_config_1.uploadFile)({
                file: req.file,
                path: `chat/${roomId}`,
            });
        }
        dbParticipants.push(req.user?._id);
        const [newGroup] = (await this.chatModel.create({
            data: [
                {
                    createdBy: req.user?._id,
                    group,
                    roomId,
                    group_image: group_image,
                    messages: [],
                    participants: dbParticipants,
                },
            ],
        })) || [];
        if (!newGroup) {
            if (group_image) {
                await (0, s3_config_1.deleteFile)({ Key: group_image });
            }
            throw new error_response_1.BadRequestException("failed to create this group");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, data: { chat: newGroup } });
    };
    getChatGroup = async (req, res) => {
        const { groupId } = req.params;
        const { page, size } = req.query;
        const chat = await this.chatModel.findOneChat({
            filter: {
                _id: mongoose_1.Types.ObjectId.createFromHexString(groupId),
                participants: { $in: req.user?._id, },
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
            throw new error_response_1.BadRequestException("failed to find the chat");
        }
        return (0, success_response_1.successResponse)({ res, data: { chat } });
    };
    sayHi = ({ message, socket, callback, io }) => {
        try {
            callback ? callback(`hello from BE to FE`) : undefined;
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
    sendMessage = async ({ content, socket, sendTo, io }) => {
        try {
            const createdBy = socket.credentials?.user._id;
            const user = await this.userModel.findOne({
                filter: {
                    _id: mongoose_1.Types.ObjectId.createFromHexString(sendTo),
                    friends: { $in: createdBy },
                },
            });
            if (!user) {
                throw new error_response_1.NotFoundException("invalid recipient friend");
            }
            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    participants: {
                        $all: [
                            createdBy,
                            mongoose_1.Types.ObjectId.createFromHexString(sendTo),
                        ],
                    },
                    group: { $exists: false },
                },
                update: {
                    $addToSet: { messages: { content, createdBy } },
                },
            });
            if (!chat) {
                const [newChat] = (await this.chatModel.create({
                    data: [
                        {
                            createdBy,
                            messages: [{ content, createdBy }],
                            participants: [
                                createdBy,
                                mongoose_1.Types.ObjectId.createFromHexString(sendTo)
                            ],
                        },
                    ],
                })) || [];
                if (!newChat) {
                    throw new error_response_1.BadRequestException("failed to create chat");
                }
            }
            ;
            io?.to(gateway_1.connectedSockets.get(createdBy.toString())).emit("successMessage", { content });
            io?.to(gateway_1.connectedSockets.get(sendTo)).emit("newMessage", { content, from: socket.credentials?.user });
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
    joinRoom = async ({ roomId, socket, io }) => {
        try {
            const chat = await this.chatModel.findOne({
                filter: {
                    roomId,
                    group: { $exists: true },
                    participants: { $in: socket.credentials?.user._id },
                },
            });
            if (!chat) {
                throw new error_response_1.NotFoundException("failed to find matching room");
            }
            socket.join(chat.roomId);
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
    sendGroupMessage = async ({ content, socket, groupId, io }) => {
        try {
            const createdBy = socket.credentials?.user._id;
            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    _id: mongoose_1.Types.ObjectId.createFromHexString(groupId),
                    participants: { $in: createdBy },
                    group: { $exists: true },
                },
                update: {
                    $addToSet: { messages: { content, createdBy } },
                },
            });
            if (!chat) {
                throw new error_response_1.BadRequestException("failed to find matching room ");
            }
            ;
            io?.to(gateway_1.connectedSockets.get(createdBy.toString())).emit("successMessage", { content });
            socket?.to(chat.roomId).emit("newMessage", {
                content,
                from: socket.credentials?.user,
                groupId,
            });
        }
        catch (error) {
            socket.emit("custom_error", error);
        }
    };
}
exports.ChatService = ChatService;
exports.default = new ChatService();
