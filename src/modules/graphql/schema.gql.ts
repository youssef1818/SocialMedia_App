import { GraphQLObjectType, GraphQLSchema } from "graphql";
import {default as postGQLSchema} from "../post/post.schema.gql";
import {default as userGQLSchema} from "../user/user.schema.gql";

const query = new GraphQLObjectType({
    name: "RootSchemaQuery",
    fields: {
        ...userGQLSchema.registerQuery(), 
        ...postGQLSchema.registerQuery(),
    },
});

const mutation = new GraphQLObjectType({
    name: "RootSchemaMutation",
    fields: {
        ...userGQLSchema.registerMutation(),
        ...postGQLSchema.registerMutation(),
    },
});



export const schema = new GraphQLSchema({query, mutation});