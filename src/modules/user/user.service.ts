import { Request, Response } from "express";

import { UserRepository } from "../../DB/repository/user.repository";

import { GenderEnum, HUserDocument, IUser, RoleEnum, UserModel } from "../../DB/model/User.model";

import { Types, UpdateQuery } from "mongoose";
import {
  createLoginCredentials,
  createRevokeToken,
  LogoutEnum,
} from "../../utils/security/token.security";

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "../../utils/response/error.response";
import { successResponse } from "../../utils/response/success.response";

import { IFreezeAccountDTO, ILogoutDTO, IRestoreAccountDTO, IHardDeleteAccounttDTO } from "./user.dto";

import { JwtPayload } from "jsonwebtoken";
import { uploadFiles, createPreSignedUploadLink, deleteFile, deleteFiles, deleteFolderByPrefix } from "../../utils/multer/s3.config";
import { s3Event } from './../../utils/multer/s3.events';
import { StorageEnum } from "../../utils/multer/cloud.multer";

import { IProfileImageResponse, IUserResponse } from './user.entities';
import { ILoginResponse } from '../auth/auth.entities';

import { PostRepository } from './../../DB/repository/post.repository';
import { PostModel } from "../../DB/model/Post.model";

import { ChatRepository } from './../../DB/repository/chat.repository';
import { ChatModel } from "../../DB/model/Chat.model";

import { FriendRequestRepository } from "../../DB/repository/friendRequest.repository";
import { FriendRequestModel } from "../../DB/model/FriendRequest.model";


export class UserService {
  private userModel: UserRepository = new UserRepository(UserModel);
  private postModel: PostRepository = new PostRepository(PostModel);
  private chatModel: ChatRepository = new ChatRepository(ChatModel);
  private friendRequestModel = new FriendRequestRepository(FriendRequestModel);
  constructor() {}

  getProfile = async (req: Request, res: Response): Promise<Response> => {
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
      throw new NotFoundException("User Not Found");
    }

    const groups = await this.chatModel.find({
      filter: {
        participants: {$in: req.user?._id as Types.ObjectId},
        group: {$exists: true},
      },
    });
    return successResponse<IUserResponse>({res, data: { user, groups }});
  };

  dashboard = async (req: Request, res: Response): Promise<Response> => {
    const results = await Promise.allSettled([
      this.userModel.find({ filter: {} }),
      this.postModel.find({ filter: {} }),
    ]);
    
    return successResponse({res, data: { results }});
  };

  changeRole = async (req: Request, res: Response): Promise<Response> => {
    
    const {userId} = req.params as unknown as {userId:Types.ObjectId};
    const {role}: {role:RoleEnum} = req.body;
    const denyRoles:RoleEnum[] = [role, RoleEnum.superAdmin];

    if(req.user?.role === RoleEnum.admin){
      denyRoles.push(RoleEnum.admin);
    }

    const user = await this.userModel.findOneAndUpdate({
      filter:{
        _id: userId as Types.ObjectId,
        role:{$nin: denyRoles}
      },
      update: {
        role,
      },
    });

    if(!user){
      throw new NotFoundException("User Not Found or you are not allowed to change this user role");
    }
    
    return successResponse({res});
  };

  sendFriendRequest = async (req: Request, res: Response): Promise<Response> => {
    const {userId} = req.params as unknown as {userId:Types.ObjectId};

    if(String(userId) === String(req.user?._id)){
      throw new BadRequestException("you can't send a friend request to yourself");
    }

    const checkFriendRequestExist = await this.friendRequestModel.findOne({
      filter: {
        createdBy: {$in: [req.user?._id, userId]},
        sendTo: {$in: [req.user?._id, userId]},
      }
    })
    if(checkFriendRequestExist){
      throw new ConflictException("you have already sent a friend request to this user or you have a pending friend request from this user");  
    }

    const user = await this.userModel.findOne({
      filter: {
        _id:userId
      },
    });
    if(!user){
      throw new NotFoundException("User Not Found");
    }

    const [friendRequest] = (await this.friendRequestModel.create({
      data: [
        {
          createdBy:req.user?._id as Types.ObjectId,
          sendTo:userId,
        },
      ],
    })) || [];
    if(!friendRequest){
      throw new BadRequestException("failed to send friend request");
    }
    
    return successResponse({res, statusCode:201, message: "friend request sent successfully"});
  };

  acceptFriendRequest = async (req: Request, res: Response): Promise<Response> => {
    const {requestId} = req.params as unknown as {requestId:Types.ObjectId};

    const friendRequest = await this.friendRequestModel.findOneAndUpdate({
      filter: {
        _id:requestId,
        sendTo: req.user?._id,
        acceptedAt: {$exists: false},
      },
      update: {
        acceptedAt: new Date(),
      }
    })
    if(!friendRequest){
      throw new NotFoundException("friend request not found");
    }

    await Promise.all([
      await this.userModel.updateOne({
        filter:{_id: friendRequest.createdBy},
        update: {
          $addToSet: { friends: friendRequest.sendTo },
       },
      }),

      await this.userModel.updateOne({
        filter:{_id: friendRequest.sendTo},
        update: {
          $addToSet: { friends: friendRequest.createdBy },
       },
      }),
    ]);
    
    return successResponse({res, message: "friend request accepted successfully"});
  };

  freezeAccount = async (req: Request, res: Response): Promise<Response> => {
    const {userId} = (req.params as IFreezeAccountDTO) || {};
    if(!userId && req.user?.role !== RoleEnum.admin){
      throw new ForbiddenException("not authorized user");
    }
    const user = await this.userModel.updateOne({
      filter: {
        _id: userId || req.user?._id,
        freezedAt: {$exists: false}
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
      throw new NotFoundException("User Not Found or failed to update this resource");
    }
    
    return successResponse<IUserResponse>({res});
  };

  restoreAccount = async (req: Request, res: Response): Promise<Response> => {
    const {userId} = (req.params as IRestoreAccountDTO);

    const user = await this.userModel.updateOne({
      filter: {
        _id: userId,
        freezedBy: {$ne: userId}
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
      throw new NotFoundException("User Not Found or failed to restore this resource");
    }
    
    return successResponse<IUserResponse>({res});
  };

  hardDeleteAccount = async (req: Request, res: Response): Promise<Response> => {
    const {userId} = req.params as IHardDeleteAccounttDTO;

    const user = await this.userModel.deleteOne({
      filter: {
        _id: userId,
        freezedAt: {$exists: true}
      },
    });

    if (!user.deletedCount) {
      throw new NotFoundException("User Not Found or failed to hard delete this resource");
    }

    await deleteFolderByPrefix({path:`users/${userId}`});
    return successResponse({res, message: "User deleted successfully", statusCode: 204});
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDTO = req.body;
    const update: UpdateQuery<IUser> = {};
    let statusCode = 200;
    switch (flag) {
      case LogoutEnum.all:
        update.changeCredentialsTime = new Date();
        break;
      default:
        await createRevokeToken(req.decoded as JwtPayload);
        statusCode = 201;
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: req.decoded?.id },
      update,
    });

    return successResponse({res, message: "user logout successfully",statusCode});
  };

  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokeToken(req.decoded as JwtPayload);

    return successResponse<ILoginResponse>({res, data: { credentials }});
  };

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    const {ContentType, originalname} : {ContentType: string, originalname: string} = req.body;
    const {url, key} = await createPreSignedUploadLink({
      ContentType,
      originalname,
      path: `users/${req.decoded?.id}`,
    });

    const user = await this.userModel.findByIdAndUpdate({
      id: req.decoded?.id as Types.ObjectId,
      update: {
        profileImage: key,
        tempProfileImage: req.user?.profileImage,
      },
    })

    if(!user){
      throw new BadRequestException("failed to update user profile image");
    }
    
    s3Event.emit("trackProfileImageUpload", {
      userId: req.user?._id,
      oldKey: req.user?.profileImage,
      key, 
      expiresIn: 30000
    })

    return successResponse<IProfileImageResponse>({res, message: "Done", data: { url }});
  };
  
  uploadFiles = async (req: Request, res: Response): Promise<Response> => {
    const urls  = await uploadFiles({
      storageApproach: StorageEnum.disk,
      files: req.files as Express.Multer.File[],
      path: `users/${req.decoded?.id}/cover`
    })

    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        coverImages: urls,
      },
    });

    if(!user){
      throw new BadRequestException("failed to update user profile image");
    }
    if(req.user?.coverImages){
      await deleteFiles({urls: req.user.coverImages});
    }

    return successResponse<IUserResponse>({res, message: "Done", data: { user }});
  };
  
  deleteImage = async (req: Request, res: Response): Promise<Response> => {
    const {Key} = req.query as {Key: string};
    const result = await deleteFile({Key});
    return res.json({
      message: "Done",
      data: { result },
    });
  };
  
  deleteFiles = async (req: Request, res: Response): Promise<Response> => {
    const result = await deleteFiles({
      urls: req.body.urls as string[],
      Quiet: req.body.Quiet as boolean,
    });
    return res.json({
      message: "Done",
      data: { result },
    });
  };
  
  deleteFolder = async (req: Request, res: Response): Promise<Response> => {
    const { path, Quiet } = req.body;
    const result = await deleteFolderByPrefix({
      path,
      Quiet,
    });
    return res.json({
      message: "Done",
      data: { result },
    });
  };

  // -----GQL-----------
  welcome = (user: HUserDocument):string => {
    console.log({user});
    return "hello GQL";
  };

  allUsers = async ( args: {gender: GenderEnum}, authUser: HUserDocument ): Promise<HUserDocument[]> => {
    return await this.userModel.find({filter: {
      _id: {$ne: authUser._id},
      gender: args.gender,
    }})
  }

}

export default new UserService();
