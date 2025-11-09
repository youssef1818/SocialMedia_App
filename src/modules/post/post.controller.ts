import { Router } from "express";
import { authentication } from './../../middleware/authentication.middleware';
import {postService} from "./post.service";
import * as validators from "./post.validation";
import { cloudFileUpload, fileValidation } from './../../utils/multer/cloud.multer';
import { validation } from './../../middleware/validation.middleware';
import  commentRouter  from '../comment/comment.controller';

const router = Router();
router.use("/:postId/comment", commentRouter)


router.post("/", authentication(), cloudFileUpload({validation: fileValidation.image}).array("attachments", 2), validation(validators.createPost) ,postService.createPost);

router.get("/", authentication(),postService.postList);

router.patch("/:postId", authentication(), cloudFileUpload({validation: fileValidation.image}).array("attachments", 2), validation(validators.updatePost) ,postService.updatePost);

router.patch("/:postId/like", authentication(), validation(validators.likePost) ,postService.likePost);


export default router;