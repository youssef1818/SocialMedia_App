"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allPosts = exports.GraphQLOnePostResponse = exports.GraphQLAvailabilityEnum = exports.GraphQLAllowCommentsEnum = void 0;
const graphql_1 = require("graphql");
const Post_model_1 = require("../../DB/model/Post.model");
const user_types_gql_1 = require("../user/user.types.gql");
exports.GraphQLAllowCommentsEnum = new graphql_1.GraphQLEnumType({
    name: "AllowCommentsEnum",
    values: {
        allow: { value: Post_model_1.AllowCommentsEnum.allow },
        deny: { value: Post_model_1.AllowCommentsEnum.deny },
    },
});
exports.GraphQLAvailabilityEnum = new graphql_1.GraphQLEnumType({
    name: "AvailabilityEnum",
    values: {
        public: { value: Post_model_1.AvailabilityEnum.public },
        friends: { value: Post_model_1.AvailabilityEnum.friends },
        onlyme: { value: Post_model_1.AvailabilityEnum.onlyMe },
    },
});
exports.GraphQLOnePostResponse = new graphql_1.GraphQLObjectType({
    name: "OnePostResponse",
    fields: {
        _id: { type: graphql_1.GraphQLID },
        createdBy: { type: user_types_gql_1.GraphQLOneUserResponse },
        content: { type: graphql_1.GraphQLString },
        attachments: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        assetsFolderId: { type: graphql_1.GraphQLString },
        allowComments: { type: exports.GraphQLAllowCommentsEnum },
        availability: { type: exports.GraphQLAvailabilityEnum },
        tags: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        likes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        freezedAt: { type: graphql_1.GraphQLString },
        freezedBy: { type: graphql_1.GraphQLID },
        restoredAt: { type: graphql_1.GraphQLString },
        restoredBy: { type: graphql_1.GraphQLID },
        createdAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
    }
});
exports.allPosts = new graphql_1.GraphQLObjectType({
    name: "allPosts",
    fields: {
        docsCount: { type: graphql_1.GraphQLInt },
        limit: { type: graphql_1.GraphQLInt },
        pagesCount: { type: graphql_1.GraphQLInt },
        currentPage: { type: graphql_1.GraphQLInt },
        result: { type: new graphql_1.GraphQLList(exports.GraphQLOnePostResponse) }
    }
});
