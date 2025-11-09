import {Router} from 'express';
import chatService from "./chat.service";
import { authentication } from './../../middleware/authentication.middleware';
import { validation } from './../../middleware/validation.middleware';
import * as validators from "./chat.validation"
import { cloudFileUpload, fileValidation } from './../../utils/multer/cloud.multer';

const router = Router({mergeParams: true});

router.get("/",authentication(), validation(validators.getChat), chatService.getChat)

router.get("/group/:groupId",authentication(),validation(validators.getChatGroup), chatService.getChatGroup)

router.post("/group",authentication(), cloudFileUpload({validation: fileValidation.image}).single("attachment"),validation(validators.createChatGroup), chatService.createChatGroup)



export default router