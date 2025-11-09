import type { NextFunction, Request, Response } from "express";
import { BadRequestException, ForbiddenException } from "../utils/response/error.response";
import { decodedToken, TokenEnum } from "../utils/security/token.security";
import { RoleEnum } from "../DB/model/User.model";
import { GraphQLError } from "graphql";

export const authentication = (tokenType:TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if(!req.headers.authorization){
        throw new BadRequestException("Validation Error", {
            key: "headers",
            issues: [{path:["authorization"], message:"Authorization required"}],
        });
    }
    const {decoded, user} = await decodedToken({
        authorization: req.headers.authorization,
    });
    req.user = user;
    req.decoded = decoded;
    next();
  };
};

export const authorization = (accessRoles: RoleEnum[] = [], tokenType:TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if(!req.headers.authorization){
        throw new BadRequestException("Validation Error", {
            key: "headers",
            issues: [{path:["authorization"], message:"Missing Authorization "}],
        });
    }
    const {decoded, user} = await decodedToken({
        authorization: req.headers.authorization,
        tokenType,
    });

    if(!accessRoles.includes(user.role)){
      throw new ForbiddenException("Not Authorized Account")
    }
    req.user = user;
    req.decoded = decoded;
    next();
  };
};

export const graphAuthorization = async(
  accessRoles: RoleEnum[] = [], 
  role: RoleEnum,
) => {
  if(!accessRoles.includes(role)){
    throw new GraphQLError("Not Authorized Account", {
      extensions: {statusCode: 403},
    });
  }
};
