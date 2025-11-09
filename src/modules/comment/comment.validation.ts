import {z} from "zod";
import { generalFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";


export const createComment = {
    params: z.strictObject({postId: generalFields.id}),

    body: z.strictObject({
        content: z.string().min(2).max(500000).optional(),
        attachments: z.array(generalFields.file(fileValidation.image)).max(2).optional(),
        tags: z.array(generalFields.id).max(10).optional(),
    }).superRefine((data, ctx) => {
        if(!data.content && !data.attachments?.length){
            ctx.addIssue({code: "custom", message: "content or attachments is required", path: ["content"]});
        }
        if(data.tags?.length && data.tags.length !== [...new Set(data.tags)].length){
            ctx.addIssue({code: "custom", message: "duplicated tagged users", path: ["tags"]});
        }
    }),
};

export const replyOnComment = {
    params: createComment.params.extend({
        commentId: generalFields.id,
    }),
    body: createComment.body,
};



