import { Router } from "express";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import userService from "./user.service";
import * as validators from "./user.validation"
import { validation } from './../../middleware/validation.middleware';
import { TokenEnum } from "../../utils/security/token.security";
import { cloudFileUpload, fileValidation, StorageEnum } from './../../utils/multer/cloud.multer';
import { endPoint } from "./user.authorization";
import chatRouter from "../chat/chat.controller"

const router = Router();
router.use("/:userId/chat", chatRouter)

router.get("/", authentication(), userService.getProfile);
router.post("/logout", authentication(), validation(validators.logout) , userService.logout);

router.get("/dashboard", authorization(endPoint.dashboard),userService.dashboard);

router.patch("/:userId/change-role", authorization(endPoint.dashboard), validation(validators.changeRole)  , userService.changeRole);

router.post("/:userId/send-friend-request", authentication(), validation(validators.sendFriendRequest)  , userService.sendFriendRequest);
router.patch("/accept-friend-request/:requestId", authentication(), validation(validators.acceptFriendRequest)  , userService.acceptFriendRequest);

router.post("/refresh-token", authentication(TokenEnum.refresh), userService.refreshToken);

router.patch("/upload-image", authentication(), userService.profileImage);
router.patch("/upload-files", authentication(), cloudFileUpload({validation: fileValidation.image, storageApproach: StorageEnum.disk}).array("images", 2) , userService.uploadFiles);

router.delete("/delete-image", authentication(),userService.deleteImage);
router.delete("/delete-files", authentication(), userService.deleteFiles);
router.delete("/delete-folder", authentication(), userService.deleteFolder);

router.delete("{/:userId}/freeze-account", authentication(), validation(validators.freezeAccount) ,userService.freezeAccount);

router.patch("/:userId/restore-account", authorization(endPoint.restoreAccount), validation(validators.restoreAccount) ,userService.restoreAccount);

router.delete("/:userId", authorization(endPoint.hardDeleteAccount), validation(validators.hardDeleteAccount) ,userService.hardDeleteAccount);






export default router;