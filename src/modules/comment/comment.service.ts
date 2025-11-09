import { Request, Response } from "express";
import { Types } from "mongoose";

import { UserRepository } from "../../DB/repository/user.repository";
import { HUserDocument, UserModel } from "../../DB/model/User.model";

import { PostRepository } from "../../DB/repository/post.repository";
import { AllowCommentsEnum, HPostDocument, PostModel } from "../../DB/model/Post.model";

import { CommentModel } from './../../DB/model/Comment.model';
import { CommentRepository } from './../../DB/repository/comment.repository';

import { successResponse } from "../../utils/response/success.response";
import {
  BadRequestException,
  NotFoundException,
} from "../../utils/response/error.response";

import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { postAvailability } from './../post/post.service';
import { StorageEnum } from "../../utils/multer/cloud.multer";

class CommentService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private commentModel = new CommentRepository(CommentModel);
  constructor() {}

  createComment = async (req: Request, res: Response): Promise<Response> => {
    const {postId} = req.params as unknown as {postId: Types.ObjectId};
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        allowComments: AllowCommentsEnum.allow,
        $or: postAvailability(req.user as HUserDocument),
      },
    });

    if(!post){
      throw new NotFoundException("post not found or comments are disabled");
    }

    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } }))
        .length !== req.body.tags.length
    ) {
      throw new NotFoundException("one or more tagged users not found");
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
        files: req.files as Express.Multer.File[],
      });
    }

    const [comment] =
      (await this.commentModel.create({
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
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("failed to create Comment");
    }

    return successResponse({ res, statusCode: 201 });
  };
  
  replyOnComment = async (req: Request, res: Response): Promise<Response> => {
    const {postId, commentId} = req.params as unknown as {
      postId: Types.ObjectId;
      commentId: Types.ObjectId;
    };

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
              allowComments: AllowCommentsEnum.allow ,
              $or: postAvailability(req.user as HUserDocument),
            },
          },
        ],
      },
    });

    if(!comment?.postId){
      throw new NotFoundException("failed to find matching result");
    }

    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } }))
        .length !== req.body.tags.length
    ) {
      throw new NotFoundException("one or more tagged users not found");
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      const post = comment.postId as Partial<HPostDocument>;
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
        files: req.files as Express.Multer.File[],
      });
    }

    const [reply] =
      (await this.commentModel.create({
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
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("failed to reply");
    }

    return successResponse({ res, statusCode: 201 });
  };
  


}

export const commentService = new CommentService();
