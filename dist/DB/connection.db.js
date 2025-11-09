"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_model_1 = require("./model/User.model");
const connectDB = async () => {
    try {
        const result = await (0, mongoose_1.connect)(process.env.DB_URI, {
            serverSelectionTimeoutMS: 30000,
        });
        await User_model_1.UserModel.syncIndexes();
        console.log(result.model);
        console.log("DB connected ");
    }
    catch (error) {
        console.log('failed to connect to DB');
    }
};
exports.default = connectDB;
