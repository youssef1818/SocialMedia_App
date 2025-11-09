import * as validators from './auth.validation';
import { z } from "zod";

export type ISignupBodyInputDto = z.infer<typeof validators.signup.body>;
export type ILoginBodyInputDto = z.infer<typeof validators.login.body>;
export type IConfirmEmailBodyInputDto = z.infer<typeof validators.confirmEmail.body>;

export type IGmailDto = z.infer<typeof validators.signupWithGmail.body>;

export type ISendForgotPasswordCodeDto = z.infer<typeof validators.sendForgotPasswordCode.body>;
export type IVerifyForgotPasswordCodeDto = z.infer<typeof validators.verifyForgotPasswordCode.body>;
export type IResetPasswordDto = z.infer<typeof validators.resetPassword.body>;