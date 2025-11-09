"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePost = exports.allPosts = void 0;
const graphql_1 = require("graphql");
const Post_model_1 = require("../../DB/model/Post.model");
exports.allPosts = {
    page: {
        type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt)
    },
    size: {
        type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt)
    },
};
exports.likePost = {
    postId: {
        type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID)
    },
    action: {
        type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLEnumType({
            name: "LikeActionEnum",
            values: {
                like: { value: Post_model_1.LikeActionEnum.like },
                unlike: { value: Post_model_1.LikeActionEnum.unlike },
            },
        })),
    },
};
