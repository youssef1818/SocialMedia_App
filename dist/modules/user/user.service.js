"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_repository_1 = require("../../DB/repository/user.repository");
const User_model_1 = require("../../DB/model/User.model");
const token_security_1 = require("../../utils/security/token.security");
const error_response_1 = require("../../utils/response/error.response");
const success_response_1 = require("../../utils/response/success.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const s3_events_1 = require("./../../utils/multer/s3.events");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const post_repository_1 = require("./../../DB/repository/post.repository");
const Post_model_1 = require("../../DB/model/Post.model");
const chat_repository_1 = require("./../../DB/repository/chat.repository");
const Chat_model_1 = require("../../DB/model/Chat.model");
const friendRequest_repository_1 = require("../../DB/repository/friendRequest.repository");
const FriendRequest_model_1 = require("../../DB/model/FriendRequest.model");
class UserService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    postModel = new post_repository_1.PostRepository(Post_model_1.PostModel);
    chatModel = new chat_repository_1.ChatRepository(Chat_model_1.ChatModel);
    friendRequestModel = new friendRequest_repository_1.FriendRequestRepository(FriendRequest_model_1.FriendRequestModel);
    constructor() { }
    getProfile = async (req, res) => {
        const user = await this.userModel.findOne({
            filter: { _id: req.decoded?.id },
            options: {
                populate: [
                    {
                        path: "friends",
                        select: "firstName lastName email gender profilePicture",
                    },
                ],
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User Not Found");
        }
        const groups = await this.chatModel.find({
            filter: {
                participants: { $in: req.user?._id },
                group: { $exists: true },
            },
        });
        return (0, success_response_1.successResponse)({ res, data: { user, groups } });
    };
    dashboard = async (req, res) => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} }),
        ]);
        return (0, success_response_1.successResponse)({ res, data: { results } });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRoles = [role, User_model_1.RoleEnum.superAdmin];
        if (req.user?.role === User_model_1.RoleEnum.admin) {
            denyRoles.push(User_model_1.RoleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRoles }
            },
            update: {
                role,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User Not Found or you are not allowed to change this user role");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        if (String(userId) === String(req.user?._id)) {
            throw new error_response_1.BadRequestException("you can't send a friend request to yourself");
        }
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            }
        });
        if (checkFriendRequestExist) {
            throw new error_response_1.ConflictException("you have already sent a friend request to this user or you have a pending friend request from this user");
        }
        const user = await this.userModel.findOne({
            filter: {
                _id: userId
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User Not Found");
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [
                {
                    createdBy: req.user?._id,
                    sendTo: userId,
                },
            ],
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("failed to send friend request");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201, message: "friend request sent successfully" });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                sendTo: req.user?._id,
                acceptedAt: { $exists: false },
            },
            update: {
                acceptedAt: new Date(),
            }
        });
        if (!friendRequest) {
            throw new error_response_1.NotFoundException("friend request not found");
        }
        await Promise.all([
            await this.userModel.updateOne({
                filter: { _id: friendRequest.createdBy },
                update: {
                    $addToSet: { friends: friendRequest.sendTo },
                },
            }),
            await this.userModel.updateOne({
                filter: { _id: friendRequest.sendTo },
                update: {
                    $addToSet: { friends: friendRequest.createdBy },
                },
            }),
        ]);
        return (0, success_response_1.successResponse)({ res, message: "friend request accepted successfully" });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (!userId && req.user?.role !== User_model_1.RoleEnum.admin) {
            throw new error_response_1.ForbiddenException("not authorized user");
        }
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false }
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialsTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1,
                },
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("User Not Found or failed to update this resource");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId,
                freezedBy: { $ne: userId }
            },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1,
                },
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("User Not Found or failed to restore this resource");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true }
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("User Not Found or failed to hard delete this resource");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return (0, success_response_1.successResponse)({ res, message: "User deleted successfully", statusCode: 204 });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        const update = {};
        let statusCode = 200;
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: req.decoded?.id },
            update,
        });
        return (0, success_response_1.successResponse)({ res, message: "user logout successfully", statusCode });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    profileImage = async (req, res) => {
        const { ContentType, originalname } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            originalname,
            path: `users/${req.decoded?.id}`,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?.id,
            update: {
                profileImage: key,
                tempProfileImage: req.user?.profileImage,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("failed to update user profile image");
        }
        s3_events_1.s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            key,
            expiresIn: 30000
        });
        return (0, success_response_1.successResponse)({ res, message: "Done", data: { url } });
    };
    uploadFiles = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            storageApproach: cloud_multer_1.StorageEnum.disk,
            files: req.files,
            path: `users/${req.decoded?.id}/cover`
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("failed to update user profile image");
        }
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return (0, success_response_1.successResponse)({ res, message: "Done", data: { user } });
    };
    deleteImage = async (req, res) => {
        const { Key } = req.query;
        const result = await (0, s3_config_1.deleteFile)({ Key });
        return res.json({
            message: "Done",
            data: { result },
        });
    };
    deleteFiles = async (req, res) => {
        const result = await (0, s3_config_1.deleteFiles)({
            urls: req.body.urls,
            Quiet: req.body.Quiet,
        });
        return res.json({
            message: "Done",
            data: { result },
        });
    };
    deleteFolder = async (req, res) => {
        const { path, Quiet } = req.body;
        const result = await (0, s3_config_1.deleteFolderByPrefix)({
            path,
            Quiet,
        });
        return res.json({
            message: "Done",
            data: { result },
        });
    };
    welcome = (user) => {
        console.log({ user });
        return "hello GQL";
    };
    allUsers = async (args, authUser) => {
        return await this.userModel.find({ filter: {
                _id: { $ne: authUser._id },
                gender: args.gender,
            } });
    };
}
exports.UserService = UserService;
exports.default = new UserService();
