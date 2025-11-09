"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolderByPrefix = exports.listDirectoryFiles = exports.deleteFiles = exports.deleteFile = exports.getFile = exports.createGetPreSignedLink = exports.createPreSignedUploadLink = exports.uploadLargeFiles = exports.uploadLargeFile = exports.uploadFiles = exports.uploadFile = exports.s3Config = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const node_fs_1 = require("node:fs");
const cloud_multer_1 = require("./cloud.multer");
const error_response_1 = require("../response/error.response");
const generateUniqueKey = (filename) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${randomStr}_${filename}`;
};
const s3Config = () => {
    return new client_s3_1.S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
};
exports.s3Config = s3Config;
const uploadFile = async ({ storageApproach = cloud_multer_1.StorageEnum.memory, Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", path = "general", file, }) => {
    const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(file.originalname)}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        ACL,
        Key: key,
        Body: storageApproach === cloud_multer_1.StorageEnum.memory
            ? file.buffer
            : (0, node_fs_1.createReadStream)(file.path),
        ContentType: file.mimetype,
    });
    await (0, exports.s3Config)().send(command);
    if (!command.input.Key) {
        throw new error_response_1.BadRequestException("failed to generate upload key");
    }
    return command.input.Key;
};
exports.uploadFile = uploadFile;
const uploadFiles = async ({ storageApproach = cloud_multer_1.StorageEnum.memory, Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", path = "general", files, }) => {
    return Promise.all(files.map((file) => (0, exports.uploadFile)({
        storageApproach,
        Bucket,
        ACL,
        path,
        file,
    })));
};
exports.uploadFiles = uploadFiles;
const uploadLargeFile = async ({ storageApproach = cloud_multer_1.StorageEnum.disk, Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", path = "general", file, }) => {
    const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(file.originalname)}`;
    const upload = new lib_storage_1.Upload({
        client: (0, exports.s3Config)(),
        params: {
            Bucket,
            ACL,
            Key: key,
            Body: storageApproach === cloud_multer_1.StorageEnum.memory
                ? file.buffer
                : (0, node_fs_1.createReadStream)(file.path),
            ContentType: file.mimetype,
        },
    });
    const { Key } = await upload.done();
    if (!Key) {
        throw new error_response_1.BadRequestException("failed to generate upload key");
    }
    return Key;
};
exports.uploadLargeFile = uploadLargeFile;
const uploadLargeFiles = async ({ storageApproach = cloud_multer_1.StorageEnum.disk, Bucket = process.env.AWS_BUCKET_NAME, ACL = "private", path = "general", files, }) => {
    return Promise.all(files.map((file) => (0, exports.uploadLargeFile)({
        storageApproach,
        Bucket,
        ACL,
        path,
        file,
    })));
};
exports.uploadLargeFiles = uploadLargeFiles;
const createPreSignedUploadLink = async ({ Bucket = process.env.AWS_BUCKET_NAME, path = "general", expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS), ContentType, originalname, }) => {
    const key = `${process.env.APPLICATION_NAME}/${path}/${generateUniqueKey(originalname)}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key: key,
        ContentType,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
    if (!url || !command?.input?.Key) {
        throw new error_response_1.BadRequestException("failed to create presigned url");
    }
    return { url, key: command.input.Key };
};
exports.createPreSignedUploadLink = createPreSignedUploadLink;
const createGetPreSignedLink = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS), downloadName = "dummy", download = "false", }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition: download === "true"
            ? `attachment; filename="${downloadName || Key.split("/").pop()}"`
            : undefined,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Config)(), command, { expiresIn });
    if (!url) {
        throw new error_response_1.BadRequestException("failed to create this upload presigned url");
    }
    return url;
};
exports.createGetPreSignedLink = createGetPreSignedLink;
const getFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
    });
    return (0, exports.s3Config)().send(command);
};
exports.getFile = getFile;
const deleteFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, }) => {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket,
        Key,
    });
    return (0, exports.s3Config)().send(command);
};
exports.deleteFile = deleteFile;
const deleteFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, urls, Quiet = false, }) => {
    const Objects = urls.map((url) => ({ Key: url }));
    const command = new client_s3_1.DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects,
            Quiet,
        },
    });
    return (0, exports.s3Config)().send(command);
};
exports.deleteFiles = deleteFiles;
const listDirectoryFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, path, }) => {
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APPLICATION_NAME}/${path}`,
    });
    return (0, exports.s3Config)().send(command);
};
exports.listDirectoryFiles = listDirectoryFiles;
const deleteFolderByPrefix = async ({ Bucket = process.env.AWS_BUCKET_NAME, path, Quiet = false, }) => {
    const fileList = await (0, exports.listDirectoryFiles)({ Bucket, path });
    if (!fileList?.Contents?.length) {
        throw new error_response_1.BadRequestException("no files found with this prefix");
    }
    const urls = fileList.Contents.map((file) => {
        return file.Key;
    });
    return await (0, exports.deleteFiles)({ Bucket, urls, Quiet });
};
exports.deleteFolderByPrefix = deleteFolderByPrefix;
