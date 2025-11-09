import {UserService} from "./user.service"
import { IAuthGraph } from './../graphql/schema.interface.gql';
import { graphAuthorization } from './../../middleware/authentication.middleware';
import { endPoint } from './user.authorization';
import { graphValidation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { GenderEnum, HUserDocument } from "../../DB/model/User.model";

export class UserResolver {
    private userService: UserService = new UserService(); 
    constructor(){}

    // query
    welcome = async (parent: unknown, args: {name: string}, context:IAuthGraph): Promise<string> => {
        await graphValidation<{name: string}>(validators.welcome, args)
        await graphAuthorization(endPoint.profile, context.user.role)
        
        return this.userService.welcome(context.user);
    };

    allUsers = async (
        parent: unknown, 
        args: {gender: GenderEnum},
        context: IAuthGraph
    ): Promise<HUserDocument[]> => {
        return await this.userService.allUsers(args, context.user);
    }

    // mutation


}