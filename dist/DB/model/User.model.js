"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.ProviderEnum = exports.RoleEnum = exports.GenderEnum = void 0;
const mongoose_1 = require("mongoose");
const error_response_1 = require("../../utils/response/error.response");
const token_repository_1 = require("./../repository/token.repository");
const Token_model_1 = require("./Token.model");
const hash_security_1 = require("./../../utils/security/hash.security");
const email_event_1 = require("./../../utils/email/email.event");
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["male"] = "male";
    GenderEnum["female"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["user"] = "user";
    RoleEnum["admin"] = "admin";
    RoleEnum["superAdmin"] = "super-admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum["google"] = "google";
    ProviderEnum["system"] = "system";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    slug: { type: String, required: true, minLength: 5, maxLength: 51 },
    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },
    password: {
        type: String,
        required: function () {
            return this.provider === ProviderEnum.google ? false : true;
        },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },
    freezedAt: Date,
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: Date,
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    friends: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    profileImage: String,
    tempProfileImage: String,
    coverImages: [String],
    phone: { type: String },
    address: { type: String },
    gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.user },
    provider: {
        type: String,
        enum: ProviderEnum,
        default: ProviderEnum.system,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
});
userSchema.virtual("username").set(function (value) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
}).get(function () {
    return this.firstName + " " + this.lastName;
});
userSchema.pre("validate", function (next) {
    if (!this.slug?.includes("-")) {
        return next(new error_response_1.BadRequestException("Invalid username format"));
    }
    next();
});
userSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await (0, hash_security_1.generateHash)(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp;
        this.confirmEmailOtp = await (0, hash_security_1.generateHash)(this.confirmEmailOtp);
    }
    next();
});
userSchema.post("save", async function (doc, next) {
    const that = this;
    if (that.wasNew && that.confirmEmailPlainOtp) {
        email_event_1.emailEvent.emit("confirmEmail", {
            to: this.email,
            otp: that.confirmEmailPlainOtp,
        });
    }
    next();
});
userSchema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
    const update = this.getUpdate();
    if (update.freezedAt) {
        this.setUpdate({ ...update, changeCredentialsTime: new Date() });
    }
});
userSchema.post(["updateOne", "findOneAndUpdate"], async function (doc, next) {
    const query = this.getQuery();
    const update = this.getUpdate();
    if (update["$set"].changeCredentialsTime) {
        const tokenModel = new token_repository_1.TokenRepository(Token_model_1.TokenModel);
        await tokenModel.deleteMany({ filter: { userId: query._id } });
    }
});
userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.UserModel = mongoose_1.models.User || (0, mongoose_1.model)("User", userSchema);
