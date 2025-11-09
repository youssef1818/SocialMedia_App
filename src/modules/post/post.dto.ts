import {z} from "zod";
import { likePost } from "./post.validation";

export type LikePostQueryDto = z.infer<typeof likePost.query>