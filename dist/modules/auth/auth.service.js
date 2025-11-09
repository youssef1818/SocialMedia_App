"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("./../../DB/model/User.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const error_response_1 = require("./../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("./../../utils/email/email.event");
const otp_1 = require("./../../utils/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const success_response_1 = require("../../utils/response/success.response");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("failed to verify this google account");
        }
        return payload;
    }
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.google,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("not registered account or registered with another provider");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, message: "User login by gmail Successfully", data: { credentials } });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: { email },
        });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.google) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException("Email exist");
        }
        const [newUser] = (await this.userModel.create({
            data: [
                {
                    email: email,
                    firstName: given_name,
                    lastName: family_name,
                    profileImage: picture,
                    confirmedAt: new Date(),
                    provider: User_model_1.ProviderEnum.google,
                },
            ],
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("failed to create user with gmail");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return (0, success_response_1.successResponse)({ res, message: "User Signup with gmail Successfully", data: { credentials }, statusCode: 201 });
    };
    signup = async (req, res) => {
        let { username, email, password } = req.body;
        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            options: {
                lean: true,
            },
        });
        if (checkUserExist) {
            throw new error_response_1.ConflictException("Email exist");
        }
        const otp = (0, otp_1.generateOtpNumber)();
        const user = await this.userModel.createUser({
            data: [
                {
                    username,
                    email,
                    password,
                    confirmEmailOtp: `${otp}`,
                },
            ],
        });
        return (0, success_response_1.successResponse)({ res, message: "user signup successfully", statusCode: 201, data: { user } });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: { email },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid login data");
        }
        if (!user.confirmedAt) {
            throw new error_response_1.AppError("verify your account first", 401);
        }
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.NotFoundException("invalid login data");
        }
        if (user.changeCredentialsTime) {
            await this.userModel.updateOne({
                filter: { _id: user._id },
                update: { $unset: { changeCredentialsTime: "" } },
            });
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, message: "User login Successfully", data: { credentials } });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.AppError("invalid confirmation code", 400);
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: { confirmEmailOtp: 1 },
            },
        });
        return (0, success_response_1.successResponse)({ res, message: "email confirmed successfully" });
    };
    sendForgotPasswordCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.system,
                confirmedAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid account");
        }
        const otp = (0, otp_1.generateOtpNumber)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp))
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("failed to send code");
        }
        email_event_1.emailEvent.emit("resetPassword", {
            to: email,
            otp,
        });
        return (0, success_response_1.successResponse)({ res, message: " code sent " });
    };
    verifyForgotPasswordCode = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.system,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("invalid code");
        }
        return (0, success_response_1.successResponse)({ res, message: " code verified " });
    };
    resetPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.system,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("invalid code");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                $set: { changeCredentialsTime: new Date() },
                $unset: { resetPasswordOtp: 1 },
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("failed to reset password");
        }
        return (0, success_response_1.successResponse)({ res, message: " password changed successfully " });
    };
}
exports.default = new AuthenticationService();
