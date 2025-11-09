import type { Request, Response, NextFunction } from "express";
import { z, type ZodError, type ZodType } from "zod";
import { AppError } from "./../utils/response/error.response";
import { Types } from "mongoose";
import { GraphQLError } from "graphql";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type ValidationErrorTypes = Array<{
  key: KeyReqType;
  issues: Array<{
    message: string;
    path: (string | number | symbol | undefined)[];
  }>;
}>;

export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: ValidationErrorTypes = [];
    for (const key of Object.keys(schema) as KeyReqType[]) {
      if (!schema[key]) continue;
      if (req.file) {
        req.body.attachment = req.file;
      }
      if (req.files) {
        req.body.attachments = req.files;
      }

      const validationResult = schema[key].safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => ({
            message: issue.message,
            path: issue.path,
          })),
        });
      }
    }

    if (validationErrors.length) {
      throw new AppError("Validation failed", 400, {
        validationErrors,
      });
    }

    return next() as unknown as NextFunction;
  };
};

export const graphValidation = async <T = any>(schema: ZodType, args: T) => {
  const validationResult = await schema.safeParseAsync(args);
  if (!validationResult.success) {
    const ZError = validationResult.error as ZodError;
    throw new GraphQLError("validation Error", {
      extensions: {
        statusCode: 400,
        issues: {
          key: "args",
          issues: ZError.issues.map((issue) => {
            return { message: issue.message, path: issue.path };
          }),
        },
      },
    });
  }
};

export const generalFields = {
  username: z.string().min(3).max(30),
  email: z.email("Invalid email format"),
  otp: z.string().regex(/^\d{6}$/),
  password: z
    .string()
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, {
      message:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit",
    }),
  confirmPassword: z.string(),
  file: function (mimetype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimetype),
        buffer: z.any().optional(),
        path: z.string().optional(),
        size: z.number(),
      })
      .refine(
        (data) => {
          return data.buffer || data.path;
        },
        { error: "neither buffer nor path is provided", path: ["file"] }
      );
  },
  id: z.string().refine(
    (data) => {
      return Types.ObjectId.isValid(data);
    },
    { error: "invalid objectId format" }
  ),
};
