"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePost = exports.updatePost = exports.createPost = void 0;
const zod_1 = require("zod");
const Post_model_1 = require("../../DB/model/Post.model");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
exports.createPost = {
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generalFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        availability: zod_1.z.enum(Post_model_1.AvailabilityEnum).default(Post_model_1.AvailabilityEnum.public),
        allowComments: zod_1.z.enum(Post_model_1.AllowCommentsEnum).default(Post_model_1.AllowCommentsEnum.allow),
        tags: zod_1.z.array(validation_middleware_1.generalFields.id).max(10).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({ code: "custom", message: "content or attachments is required", path: ["content"] });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({ code: "custom", message: "duplicated tagged users", path: ["tags"] });
        }
    }),
};
exports.updatePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id,
    }),
    body: zod_1.z.strictObject({
        content: zod_1.z.string().min(2).max(500000).optional(),
        availability: zod_1.z.enum(Post_model_1.AvailabilityEnum).optional(),
        allowComments: zod_1.z.enum(Post_model_1.AllowCommentsEnum).optional(),
        attachments: zod_1.z.array(validation_middleware_1.generalFields.file(cloud_multer_1.fileValidation.image)).max(2).optional(),
        removedAttachments: zod_1.z.array(zod_1.z.string()).optional(),
        tags: zod_1.z.array(validation_middleware_1.generalFields.id).optional(),
        removedTags: zod_1.z.array(validation_middleware_1.generalFields.id).optional(),
    }).superRefine((data, ctx) => {
        if (!Object.values(data)?.length) {
            ctx.addIssue({
                code: "custom",
                message: "all fields are empty"
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({ code: "custom", message: "duplicated tagged users", path: ["tags"] });
        }
        if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
            ctx.addIssue({ code: "custom", message: "some of removed tags are duplicated", path: ["removedTags"] });
        }
    }),
};
exports.likePost = {
    params: zod_1.z.strictObject({
        postId: validation_middleware_1.generalFields.id,
    }),
    query: zod_1.z.strictObject({
        action: zod_1.z.enum(Post_model_1.LikeActionEnum).default(Post_model_1.LikeActionEnum.like),
    })
};
