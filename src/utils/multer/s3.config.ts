import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
  GetObjectCommand,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput
} from "@aws-sdk/client-s3";

import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "node:fs";
import { StorageEnum } from "./cloud.multer";
import { BadRequestException } from "../response/error.response";

// Generate unique key using Date.now() + random string
const generateUniqueKey = (filename: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10); // 8 random chars
  return `${timestamp}_${randomStr}_${filename}`;
};

export const s3Config = () => {
  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
  });
};

export const uploadFile = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(file.originalname)}`;

  const command = new PutObjectCommand({
    Bucket,
    ACL,
    Key: key,
    Body:
      storageApproach === StorageEnum.memory
        ? file.buffer
        : createReadStream(file.path),
    ContentType: file.mimetype,
  });

  await s3Config().send(command);

  if (!command.input.Key) {
    throw new BadRequestException("failed to generate upload key");
  }

  return command.input.Key;
};

export const uploadFiles = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  files,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  files: Express.Multer.File[];
}): Promise<string[]> => {
  return Promise.all(
    files.map((file) =>
      uploadFile({
        storageApproach,
        Bucket,
        ACL,
        path,
        file,
      })
    )
  );
};

export const uploadLargeFile = async ({
  storageApproach = StorageEnum.disk,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(file.originalname)}`;

  const upload = new Upload({
    client: s3Config(),
    params: {
      Bucket,
      ACL,
      Key: key,
      Body:
        storageApproach === StorageEnum.memory
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    },
  });

  const { Key } = await upload.done();

  if (!Key) {
    throw new BadRequestException("failed to generate upload key");
  }

  return Key;
};

export const uploadLargeFiles = async ({
  storageApproach = StorageEnum.disk,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  files,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  files: Express.Multer.File[];
}): Promise<string[]> => {
  return Promise.all(
    files.map((file) =>
      uploadLargeFile({
        storageApproach,
        Bucket,
        ACL,
        path,
        file,
      })
    )
  );
};

export const createPreSignedUploadLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path = "general",
  expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
  ContentType,
  originalname,
}: {
  Bucket?: string;
  path?: string;
  expiresIn?: number;
  ContentType: string;
  originalname: string;
}): Promise<{ url: string; key: string }> => {
  const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(originalname)}`;

  const command = new PutObjectCommand({
    Bucket,
    Key: key,
    ContentType,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url || !command?.input?.Key) {
    throw new BadRequestException("failed to create presigned url");
  }

  return { url, key: command.input.Key };
};

export const createGetPreSignedLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
  expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
  downloadName = "dummy",
  download = "false",
}: {
  Bucket?: string;
  Key: string;
  expiresIn?: number;
  downloadName?: string;
  download?: string;
}): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket,
    Key,
    ResponseContentDisposition:
      download === "true"
        ? `attachment; filename="${downloadName || Key.split("/").pop()}"`
        : undefined,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url) {
    throw new BadRequestException("failed to create this upload presigned url");
  }

  return url;
};

export const getFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
}: {
  Bucket?: string;
  Key: string;
}): Promise<GetObjectCommandOutput> => {
  const command = new GetObjectCommand({
    Bucket,
    Key,
  });

  return s3Config().send(command);
};

export const deleteFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
}: {
  Bucket?: string;
  Key: string;
}): Promise<DeleteObjectCommandOutput> => {
  const command = new DeleteObjectCommand({
    Bucket,
    Key,
  });

  return s3Config().send(command);
};

export const deleteFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  urls,
  Quiet = false,
}: {
  Bucket?: string;
  urls: string[];
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const Objects = urls.map((url) => ({ Key: url }));

  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects,
      Quiet,
    },
  });

  return s3Config().send(command);
};

export const listDirectoryFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path,
}: {
  Bucket?: string;
  path: string;
}): Promise<ListObjectsV2CommandOutput> => {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: `${process.env.APPLICATION_NAME}/${path}`,
  });

  return s3Config().send(command);
};

export const deleteFolderByPrefix = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path,
  Quiet = false,
}: {
  Bucket?: string;
  path: string;
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const fileList = await listDirectoryFiles({ Bucket, path });

  if (!fileList?.Contents?.length) {
    throw new BadRequestException("no files found with this prefix");
  }

  const urls: string[] = fileList.Contents.map((file) => {
        return file.Key as string;
    });

  return await deleteFiles({ Bucket, urls, Quiet });
};
