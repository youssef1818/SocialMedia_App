"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allUsers = exports.welcome = exports.GraphQLOneUserResponse = exports.GraphQLRoleEnum = exports.GraphQLProviderEnum = exports.GraphQLGenderEnum = void 0;
const graphql_1 = require("graphql");
const User_model_1 = require("../../DB/model/User.model");
exports.GraphQLGenderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLGenderEnum",
    values: {
        male: { value: User_model_1.GenderEnum.male },
        female: { value: User_model_1.GenderEnum.female },
    },
});
exports.GraphQLProviderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLProviderEnum",
    values: {
        google: { value: User_model_1.ProviderEnum.google },
        system: { value: User_model_1.ProviderEnum.system },
    },
});
exports.GraphQLRoleEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLRoleEnum",
    values: {
        user: { value: User_model_1.RoleEnum.user },
        admin: { value: User_model_1.RoleEnum.admin },
        superAdmin: { value: User_model_1.RoleEnum.superAdmin },
    },
});
exports.GraphQLOneUserResponse = new graphql_1.GraphQLObjectType({
    name: "OneUserResponse",
    fields: {
        _id: { type: graphql_1.GraphQLID },
        slug: { type: graphql_1.GraphQLString },
        firstName: { type: graphql_1.GraphQLString },
        lastName: { type: graphql_1.GraphQLString },
        username: { type: graphql_1.GraphQLString },
        email: { type: graphql_1.GraphQLString },
        confirmEmailOtp: { type: graphql_1.GraphQLString },
        confirmedAt: { type: graphql_1.GraphQLString },
        password: { type: graphql_1.GraphQLString },
        resetPasswordOtp: { type: graphql_1.GraphQLString },
        changeCredentialsTime: { type: graphql_1.GraphQLString },
        profileImage: { type: graphql_1.GraphQLString },
        tempProfileImage: { type: graphql_1.GraphQLString },
        coverImages: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        phone: { type: graphql_1.GraphQLString },
        address: { type: graphql_1.GraphQLString },
        gender: { type: exports.GraphQLGenderEnum },
        role: { type: exports.GraphQLRoleEnum },
        provider: { type: exports.GraphQLProviderEnum },
        createdAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
        freezedAt: { type: graphql_1.GraphQLString },
        freezedBy: { type: graphql_1.GraphQLID },
        restoredAt: { type: graphql_1.GraphQLString },
        restoredBy: { type: graphql_1.GraphQLID },
        friends: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
    },
});
exports.welcome = new graphql_1.GraphQLNonNull(graphql_1.GraphQLString);
exports.allUsers = new graphql_1.GraphQLList(exports.GraphQLOneUserResponse);
