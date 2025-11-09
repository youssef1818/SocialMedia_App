import {Router} from "express";
import authService from './auth.service';
import * as validators from "./auth.validation";
import { validation } from './../../middleware/validation.middleware';


const router: Router = Router();

router.post("/signup", validation(validators.signup) ,authService.signup);
router.post("/login", validation(validators.login) ,authService.login);

router.post("/signup-gmail", validation(validators.signupWithGmail) ,authService.signupWithGmail);
router.post("/login-gmail", validation(validators.signupWithGmail) ,authService.loginWithGmail);

router.patch("/confirm-email", validation(validators.confirmEmail) ,authService.confirmEmail);

router.patch("/send-reset-password", validation(validators.sendForgotPasswordCode) ,authService.sendForgotPasswordCode);
router.patch("/verify-reset-password", validation(validators.verifyForgotPasswordCode) ,authService.verifyForgotPasswordCode);
router.patch("/send-reset-password", validation(validators.sendForgotPasswordCode) ,authService.sendForgotPasswordCode);
router.patch("/reset-password", validation(validators.resetPassword) ,authService.resetPassword);



export default router;