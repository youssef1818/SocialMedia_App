import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";

import { AllowCommentsEnum, AvailabilityEnum } from "../../DB/model/Post.model";

import { GraphQLOneUserResponse } from "../user/user.types.gql";

export const GraphQLAllowCommentsEnum = new GraphQLEnumType({
    name:"AllowCommentsEnum",
    values: {
        allow: {value: AllowCommentsEnum.allow},
        deny: {value: AllowCommentsEnum.deny},
    },
});

export const GraphQLAvailabilityEnum= new GraphQLEnumType({
    name:"AvailabilityEnum",
    values: {
        public: {value: AvailabilityEnum.public},
        friends: {value: AvailabilityEnum.friends},
        onlyme: {value: AvailabilityEnum.onlyMe},
    },
});

export const GraphQLOnePostResponse = new GraphQLObjectType({
    name:"OnePostResponse",
    fields: {
        _id: {type:GraphQLID},
        createdBy: {type:GraphQLOneUserResponse},

        content: {type:GraphQLString},
            attachments: {type:new GraphQLList(GraphQLString)},
            assetsFolderId: {type:GraphQLString},
        
            allowComments: {type: GraphQLAllowCommentsEnum},
            availability: {type: GraphQLAvailabilityEnum},
        
            tags: {type:new GraphQLList(GraphQLID)},
            likes: {type:new GraphQLList(GraphQLID)},
        
        
            freezedAt: {type: GraphQLString},
            freezedBy: {type:GraphQLID},
        
            restoredAt: {type: GraphQLString},
            restoredBy: {type:GraphQLID},
        
            createdAt: {type: GraphQLString},
            updatedAt: {type: GraphQLString},
        
    }
})

export const allPosts = new GraphQLObjectType({
    name:"allPosts",
    fields: {
        docsCount:{type: GraphQLInt},
        limit:{type: GraphQLInt},
        pagesCount:{type: GraphQLInt},
        currentPage: {type: GraphQLInt},
        result: {type: new GraphQLList(GraphQLOnePostResponse)}
    }
});