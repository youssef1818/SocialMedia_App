import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Types, UpdateQuery } from "mongoose";  

import { UserRepository } from "../../DB/repository/user.repository";
import { HUserDocument, UserModel } from "../../DB/model/User.model";

import { PostRepository } from "../../DB/repository/post.repository";
import {
  AvailabilityEnum,
  HPostDocument,
  LikeActionEnum,
  PostModel,
} from "../../DB/model/Post.model";

import { successResponse } from "../../utils/response/success.response";
import {
  BadRequestException,
  NotFoundException,
} from "../../utils/response/error.response";

import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";

import { LikePostQueryDto } from "./post.dto";

import { connectedSockets, getIo } from './../gateway/gateway';
import { GraphQLError } from "graphql";

export const postAvailability = (user: HUserDocument) => {
  return [
    { availability: AvailabilityEnum.public },
    {
      availability: AvailabilityEnum.onlyMe,
      createdBy: user._id,
    },
    {
      availability: AvailabilityEnum.friends,
      createdBy: { $in: [...(user.friends || []), user._id] },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: user._id },
    },
  ];
};

export class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  constructor() {}

  postList = async (req: Request, res: Response): Promise<Response> => {
    let { page, size } = req.query as unknown as {
      page: number;
      size: number;
    };

    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(req.user as HUserDocument),
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: "reply",
                match: {
                  freezedAt: { $exists: false },
                },
              },
            ],
          },
        ],
      },
      page,
      size,
    });

    return successResponse({ res, data: { posts } });
  };

  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryDto;

    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: req.user?._id },
    };
    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: req.user?._id } };
    }
    const post = await this.postModel.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: postAvailability(req.user as HUserDocument),
      },
      update,
    });
    if (!post) {
      throw new NotFoundException("post not found");
    }

    if(action !== LikeActionEnum.unlike){
      getIo().to(connectedSockets.get(post.createdBy.toString()) as string[]).emit("likePost", {postId, userId: req.user?._id});
    }

    return successResponse({ res });
  };

  createPost = async (req: Request, res: Response): Promise<Response> => {
    if (
      req.body.tags?.length &&
      (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } }))
        .length !== req.body.tags.length
    ) {
      throw new NotFoundException("one or more tagged users not found");
    }

    let attachments: string[] = [];
    let assetsFolderId: string = uuid();
    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }

    const [post] =
      (await this.postModel.create({
        data: [
          {
            ...req.body,
            attachments,
            assetsFolderId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];

    if (!post) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("failed to create post");
    }

    return successResponse({ res, statusCode: 201 });
  };

  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        createdBy: req.user?._id,
      },
    });
    if (!post) {
      throw new NotFoundException("post not found");
    }
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: {
            _id: { $in: req.body.tags, $ne: req.user?._id },
          },
        })
      ).length !== req.body.tags.length
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

    const updatedPost = await this.postModel.updateOne({
      filter: { _id: post._id },
      update: [
        {
          $set: {
            content: req.body.content,
            allowComments: req.body.allowComments || post.allowComments,
            availability: req.body.availability || post.availability,

            attachments: {
              $setUnion: [
                {
                  $setDifference: [
                    "$attachments",
                    req.body.removedAttachments || [],
                  ],
                },
                attachments,
              ],
            },

            tags: {
              $setUnion: [
                {
                  $setDifference: [
                    "$tags",
                    (req.body.removedTags || []).map((tag: string) => {
                      return Types.ObjectId.createFromHexString(tag);
                    }),
                  ],
                },
                (req.body.tags || []).map((tag: string) => {
                  return Types.ObjectId.createFromHexString(tag);
                }),
              ],
            },
          },
        },
      ],
    });

    if (!updatedPost.matchedCount) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("failed to update post");
    } else {
      if (req.body.removedAttachments?.length) {
        await deleteFiles({ urls: req.body.removedAttachments });
      }
    }

    return successResponse({ res });
  };

  // GQL

  allPosts = async (
    {page, size}: {page:number; size:number}, 
    authUser: HUserDocument,
  ): Promise<{
      docsCount?:number;
      limit?:number;
      pagesCount?:number;
      currentPage?: number | undefined;
      result: HPostDocument[];
    }> => {

    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(authUser),
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: "reply",
                match: {
                  freezedAt: { $exists: false },
                },
              },
            ],
          },
        ],
      },
      page,
      size,
    });

    return posts;
  };

  likeGraphPost = async (
    {postId, action}:{postId: string; action: LikeActionEnum},
    authUser: HUserDocument,
  ): Promise<HPostDocument> => {
    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: authUser._id },
    };
    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: authUser._id } };
    }
    const post = await this.postModel.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: postAvailability(authUser),
      },
      update,
    });
    if (!post) {
      throw new GraphQLError("post not found", {extensions: {statusCode: 404}});
    }

    if(action !== LikeActionEnum.unlike){
      getIo().to(connectedSockets.get(post.createdBy.toString()) as string[]).emit("likePost", {postId, userId: authUser._id});
    }

    return post;
  };


}

export const postService = new PostService();
