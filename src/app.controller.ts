import express from "express";
import type { Express, Request, Response } from "express";

import * as dotenv from 'dotenv';
dotenv.config({ });

import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import authController from "./modules/auth/auth.controller";
import userController from "./modules/user/user.controller";
import postController from "./modules/post/post.controller";
import chatController from "./modules/chat/chat.controller";

import {
  BadRequestException,
  globalErrorHandler,
} from "./utils/response/error.response";

import connectDB from "./DB/connection.db";
import { createGetPreSignedLink, getFile } from "./utils/multer/s3.config";

import { promisify } from "node:util";
import { pipeline } from "node:stream";

import { initializeIo } from './modules/gateway/gateway';

import { createHandler } from "graphql-http";
import { schema } from './modules/graphql/schema.gql';
import { authentication } from './middleware/authentication.middleware';

const createS3WriteStreamPipe = promisify(pipeline);

// app start point
const bootstrap = async (): Promise<void> => {
  const app: Express = express();
  const port: number | string = process.env.PORT || 5000;

  // global application middleware
  app.use(express.json(), cors(), helmet());

  // handle base rate limit on all api requests
  const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too many requests please try again later" },
    statusCode: 429,
  });
  app.use(limiter);

  // GQL routing
  app.all("/graphql", 
    authentication(),
    createHandler({
      schema, 
    })
  );

  // app routing
  app.get("/", (req: Request, res: Response): Response => {
    return res.json({ message: `${process.env.APPLICATION_NAME} is running` });
  });

  // sub app routing modules
  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("/post", postController);
  app.use("/chat", chatController);

  // get assets
  app.get(
    "/upload/pre-signed/*path",
    async (req: Request, res: Response): Promise<Response> => {
      const {downloadName, download = "false", expiresIn = 120} = req.query as {
          downloadName?: string;
          download?: string;
          expiresIn?: number;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const url = await createGetPreSignedLink({ Key, downloadName: downloadName as string, download, expiresIn});
      return res.json({ message: "pre-signed url", data: { url } });
    }
  );

  app.get(
    "/upload/*path",
    async (req: Request, res: Response): Promise<void> => {
      const { downloadName, download = "false" } = req.query as {
        downloadName?: string;
        download?: string;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const s3Response = await getFile({ Key });
      if (!s3Response?.Body) {
        throw new BadRequestException("failed to fetch this asset");
      }

      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader(
        "Content-Type",
        `${s3Response.ContentType}` || "application/octet-stream"
      );
      if (download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${downloadName || Key.split("/").pop()}`
        );
      }

      return await createS3WriteStreamPipe(
        s3Response.Body as NodeJS.ReadableStream,
        res
      );
    }
  );
  
  // in-valid routing
  app.use((req: Request, res: Response) => {
    return res.status(404).json({ message: "invalid app routing" });
  });

  // global error handling
  app.use(globalErrorHandler);

  // DB
  await connectDB();

  // start server
  const httpServer = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // socket server
  initializeIo(httpServer);

};

export default bootstrap;
