import {z} from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";
import { RoleEnum } from "../../DB/model/User.model";
import { generalFields } from "../../middleware/validation.middleware";

export const welcome = z.object({
    name: z.string().min(2),
});

export const logout = {
    body:z.strictObject({
        flag:z.enum(LogoutEnum).default(LogoutEnum.only)
    }),
}

export const sendFriendRequest = {
    params:z.strictObject({
        userId: generalFields.id,
    }),
}

export const acceptFriendRequest = {
    params:z.strictObject({
        requestId: generalFields.id,
    }),
}

export const changeRole = {
    params:sendFriendRequest.params,
    body:z.strictObject({
        role: z.enum(RoleEnum),
    }),

}

export const freezeAccount = {
    params:z.object({
        userId: z.string().optional(),
    }).optional().refine((data) => {
        return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
    },
    {
        error: "invalid userId format",
        path: ["userId"],
    }),
}

export const restoreAccount = {
    params:z.object({
        userId: z.string(),
    }).refine((data) => {
        return Types.ObjectId.isValid(data.userId);
    },
    {
        error: "invalid userId format",
        path: ["userId"],
    }),
}

export const hardDeleteAccount = restoreAccount;