"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const user_repository_1 = require("../../DB/repository/user.repository");
const User_model_1 = require("../../DB/model/User.model");
const post_repository_1 = require("../../DB/repository/post.repository");
const Post_model_1 = require("../../DB/model/Post.model");
const Comment_model_1 = require("./../../DB/model/Comment.model");
const comment_repository_1 = require("./../../DB/repository/comment.repository");
const success_response_1 = require("../../utils/response/success.response");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const post_service_1 = require("./../post/post.service");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
class CommentService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    postModel = new post_repository_1.PostRepository(Post_model_1.PostModel);
    commentModel = new comment_repository_1.CommentRepository(Comment_model_1.CommentModel);
    constructor() { }
    createComment = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                allowComments: Post_model_1.AllowCommentsEnum.allow,
                $or: (0, post_service_1.postAvailability)(req.user),
            },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("post not found or comments are disabled");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } }))
                .length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("one or more tagged users not found");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
                files: req.files,
            });
        }
        const [comment] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    createdBy: req.user?._id,
                },
            ],
        })) || [];
        if (!comment) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to create Comment");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    replyOnComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
                postId,
            },
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            allowComments: Post_model_1.AllowCommentsEnum.allow,
                            $or: (0, post_service_1.postAvailability)(req.user),
                        },
                    },
                ],
            },
        });
        if (!comment?.postId) {
            throw new error_response_1.NotFoundException("failed to find matching result");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } }))
                .length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("one or more tagged users not found");
        }
        let attachments = [];
        if (req.files?.length) {
            const post = comment.postId;
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
                files: req.files,
            });
        }
        const [reply] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    commentId,
                    createdBy: req.user?._id,
                },
            ],
        })) || [];
        if (!reply) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("failed to reply");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
}
exports.commentService = new CommentService();
