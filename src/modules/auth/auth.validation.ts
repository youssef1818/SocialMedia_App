import { z } from "zod";
import { generalFields } from "../../middleware/validation.middleware";

export const login = {
  body: z.strictObject({
    email: generalFields.email,
    password: generalFields.password,
  }),
};

export const signup = {
  body: login.body
    .extend({
      username: generalFields.username,
      confirmPassword: generalFields.confirmPassword,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
    }),
};

export const signupWithGmail = {
  body: z.strictObject({
    idToken: z.string(),
  }),
};

export const confirmEmail = {
  body: z.strictObject({
    email: generalFields.email,
    otp: generalFields.otp,
  }),
};

export const sendForgotPasswordCode = {
  body: z.strictObject({
    email: generalFields.email,
  }),
};

export const verifyForgotPasswordCode = {
  body: sendForgotPasswordCode.body.extend({
    otp: generalFields.otp,
  }),
};

export const resetPassword = {
  body: verifyForgotPasswordCode.body.extend({
    password: generalFields.password,
    confirmPassword: generalFields.confirmPassword,
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
  })
};
