import { HUserDocument } from "../../DB/model/User.model";
import { HChatDocument } from "../../DB/model/Chat.model";


export interface IProfileImageResponse {
    url: string;
}

export interface IUserResponse {
    user: Partial<HUserDocument>;
    groups?: Partial<HChatDocument>[];
}