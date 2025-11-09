"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const graphql_1 = require("graphql");
const post_schema_gql_1 = __importDefault(require("../post/post.schema.gql"));
const user_schema_gql_1 = __importDefault(require("../user/user.schema.gql"));
const query = new graphql_1.GraphQLObjectType({
    name: "RootSchemaQuery",
    fields: {
        ...user_schema_gql_1.default.registerQuery(),
        ...post_schema_gql_1.default.registerQuery(),
    },
});
const mutation = new graphql_1.GraphQLObjectType({
    name: "RootSchemaMutation",
    fields: {
        ...user_schema_gql_1.default.registerMutation(),
        ...post_schema_gql_1.default.registerMutation(),
    },
});
exports.schema = new graphql_1.GraphQLSchema({ query, mutation });
