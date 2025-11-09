import { sign, verify } from "jsonwebtoken";
import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { HUserDocument, RoleEnum, UserModel } from "../../DB/model/User.model";
import {
  BadRequestException,
  UnauthorizedException,
} from "../response/error.response";
import { UserRepository } from "../../DB/repository/user.repository";
import { v4 as uuid } from "uuid";
import { HTokenDocument, TokenModel } from "../../DB/model/Token.model";
import { TokenRepository } from "../../DB/repository/token.repository";

export enum SignatureLevelEnum {
  Bearer = "Bearer",
  System = "System",
}

export enum TokenEnum {
  access = "access",
  refresh = "refresh",
}

export enum LogoutEnum {
  all = "all",
  only = "only",
}

export const generateToken = async ({
  payload,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
  options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
}: {
  payload: object;
  secret?: Secret;
  options?: SignOptions;
}): Promise<string> => {
  return sign(payload, secret, options);
};

export const verifyToken = async ({
  token,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
  token: string;
  secret?: Secret;
}): Promise<JwtPayload> => {
  return verify(token, secret) as JwtPayload;
};

export const detectSignatureLevel = async (
  role: RoleEnum = RoleEnum.user
): Promise<SignatureLevelEnum> => {
  let signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer;
  switch (role) {
    case RoleEnum.admin:
    case RoleEnum.superAdmin:
      signatureLevel = SignatureLevelEnum.System;
      break;

    default:
      signatureLevel = SignatureLevelEnum.Bearer;
      break;
  }
  return signatureLevel;
};

export const getSignatures = async (
  signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
  let signatures: { access_signature: string; refresh_signature: string } = {
    access_signature: "",
    refresh_signature: "",
  };
  switch (signatureLevel) {
    case SignatureLevelEnum.System:
      signatures.access_signature = process.env
        .ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
      break;

    default:
      signatures.access_signature = process.env
        .ACCESS_USER_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_USER_TOKEN_SIGNATURE as string;
      break;
  }
  return signatures;
};

export const createLoginCredentials = async (user: HUserDocument) => {
  const signatureLevel = await detectSignatureLevel(user.role);
  const signatures = await getSignatures(signatureLevel);
  const jwtid = uuid();

  const access_token = await generateToken({
    payload: { id: user._id },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
  });

  const refresh_token = await generateToken({
    payload: { id: user._id },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
  });

  return { access_token, refresh_token };
};

export const decodedToken = async ({
  authorization,
  tokenType = TokenEnum.access,
}: {
  authorization: string;
  tokenType?: TokenEnum;
}) => {
  const userModel = new UserRepository(UserModel);
  const tokenModel = new TokenRepository(TokenModel);

  const [bearerKey, token] = authorization.split(" ");

  if (!token || !bearerKey) {
    throw new UnauthorizedException("Missing or malformed token");
  }

  const signatures = await getSignatures(bearerKey as SignatureLevelEnum);
    const decoded = await verifyToken({ 
      token,
      secret: tokenType === TokenEnum.refresh ? signatures.refresh_signature : signatures.access_signature, 
    });


  if (!decoded?.id || !decoded?.iat) {
    throw new BadRequestException("Invalid token payload");
  }

  if(await tokenModel.findOne({filter:{jti:decoded.jti}})){
    throw new UnauthorizedException("Token Expired");
  }

  const user = await userModel.findOne({ filter: { _id: decoded.id } });
  if (!user) {
    throw new BadRequestException("Not Registered Account");
  }

  if(user.changeCredentialsTime?.getTime() || 0 > decoded.iat * 1000) {
    throw new UnauthorizedException("Token Expired");
  }

  return { user, decoded };
};

export const createRevokeToken = async (
  decoded: JwtPayload
): Promise<HTokenDocument> => {
  const tokenModel = new TokenRepository(TokenModel);
  const [result] =
    (await tokenModel.create({
      data: [
        {
          jti: decoded.jti as string,
          expiresIn:
            (decoded.iat as number) +
            Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
          userId: decoded.id,
        },
      ],
    })) || [];

  if (!result) {
    throw new BadRequestException("Token Revocation Failed");
  }
  return result;
};
