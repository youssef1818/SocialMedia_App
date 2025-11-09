import type { Request, Response } from "express";
import {
  IConfirmEmailBodyInputDto,
  IGmailDto,
  ILoginBodyInputDto,
  ISendForgotPasswordCodeDto,
  IVerifyForgotPasswordCodeDto,
  IResetPasswordDto,
  ISignupBodyInputDto,
} from "./auth.dto";
import { ProviderEnum, UserModel } from "./../../DB/model/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import {
  AppError,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "./../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "./../../utils/email/email.event";
import { generateOtpNumber } from "./../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from './auth.entities';


class AuthenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

  private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_ID?.split(",") || [],
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new BadRequestException("failed to verify this google account");
    }
    return payload;
  }

  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailDto = req.body;
    const { email } = await this.verifyGmailAccount(idToken);
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.google,
      },
    });
    if (!user) {
      throw new NotFoundException(
        "not registered account or registered with another provider"
      );
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({res, message: "User login by gmail Successfully", data: { credentials }});
  };

  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailDto = req.body;
    const { email, family_name, given_name, picture } = await this.verifyGmailAccount(
      idToken
    );
    const user = await this.userModel.findOne({
      filter: { email },
    });
    if (user) {
      if (user.provider === ProviderEnum.google) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException("Email exist");
    }

    const [newUser] =
      (await this.userModel.create({
        data: [
          {
            email: email as string,
            firstName: given_name as string,
            lastName: family_name as string,
            profileImage: picture as string,
            confirmedAt: new Date(),
            provider: ProviderEnum.google,
          },
        ],
      })) || [];

    if (!newUser) {
      throw new BadRequestException("failed to create user with gmail");
    }

    const credentials = await createLoginCredentials(newUser);

    return successResponse<ILoginResponse>({res, message: "User Signup with gmail Successfully", data: { credentials }, statusCode: 201});
  };

  /**
   *
   * @param req - Express.Request
   * @param res - Express.Response
   * @returns Promise<Response>
   * @example()
   * return {message:user signup successfully, statusCode:201}
   */

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { username, email, password }: ISignupBodyInputDto = req.body;

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      options: {
        lean: true,
      },
    });

    if (checkUserExist) {
      throw new ConflictException("Email exist");
    }

    const otp = generateOtpNumber();
    const user = await this.userModel.createUser({
      data: [
        {
          username,
          email,
          password,
          confirmEmailOtp: `${otp}`,
        },
      ],
    });
    return successResponse({res, message: "user signup successfully", statusCode: 201, data:{user}});
  };

  /**
   *
   * @param req - Express.Request
   * @param res - Express.Response
   * @returns Promise<Response>
   * @example()
   * return {message:Done, statusCode:201}
   */

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputDto = req.body;

    const user = await this.userModel.findOne({
      filter: { email },
    });

    if (!user) {
      throw new NotFoundException("invalid login data");
    }

    if (!user.confirmedAt) {
      throw new AppError("verify your account first", 401);
    }

    if (!(await compareHash(password, user.password))) {
      throw new NotFoundException("invalid login data");
    }

    if (user.changeCredentialsTime) {
      await this.userModel.updateOne({
        filter: { _id: user._id },
        update: { $unset: { changeCredentialsTime: "" } },
      });
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({res, message: "User login Successfully", data: { credentials }});
  };

  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IConfirmEmailBodyInputDto = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        confirmEmailOtp: { $exists: true },
        confirmedAt: { $exists: false },
      },
    });

    if (!user) {
      throw new NotFoundException("Invalid account");
    }

    if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
      throw new AppError("invalid confirmation code", 400);
    }

    await this.userModel.updateOne({
      filter: { email },
      update: {
        confirmedAt: new Date(),
        $unset: { confirmEmailOtp: 1 },
      },
    });

    return successResponse({res, message: "email confirmed successfully" });
  };

  sendForgotPasswordCode = async (req: Request, res: Response): Promise<Response> => {
    const { email }: ISendForgotPasswordCodeDto = req.body;

    const user = await this.userModel.findOne({
      filter: { 
        email,
        provider: ProviderEnum.system ,
        confirmedAt: {$exists:true},
      },
    });

    if (!user) {
      throw new NotFoundException("invalid account");
    }
    const otp = generateOtpNumber();
    const result = await this.userModel.updateOne({
      filter: {email},
      update: {
        resetPasswordOtp: await generateHash(String(otp))
      }
    });

    if(!result.matchedCount){
      throw new BadRequestException("failed to send code");
    }

    emailEvent.emit("resetPassword", {
      to: email,
      otp,
    });

    return successResponse({res, message: " code sent " });
  };

  verifyForgotPasswordCode = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IVerifyForgotPasswordCodeDto = req.body;

    const user = await this.userModel.findOne({
      filter: { 
        email,
        provider: ProviderEnum.system ,
        resetPasswordOtp: {$exists:true},
      },
    });

    if (!user) {
      throw new NotFoundException("invalid account");
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("invalid code");
    }

    return successResponse({res, message: " code verified " });
  };

  resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp, password }: IResetPasswordDto = req.body;

    const user = await this.userModel.findOne({
      filter: { 
        email,
        provider: ProviderEnum.system ,
        resetPasswordOtp: {$exists:true},
      },
    });

    if (!user) {
      throw new NotFoundException("invalid account");
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("invalid code");
    }

    const result = await this.userModel.updateOne({
      filter:{email},
      update:{
        password: await generateHash(password),
        $set:{changeCredentialsTime: new Date()},
        $unset: {resetPasswordOtp:1},
      }
    });

    if(!result.matchedCount) {
      throw new BadRequestException("failed to reset password");
    }

    return successResponse({res, message: " password changed successfully " });
  };

}

export default new AuthenticationService();
