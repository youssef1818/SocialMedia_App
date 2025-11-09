"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({});
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const auth_controller_1 = __importDefault(require("./modules/auth/auth.controller"));
const user_controller_1 = __importDefault(require("./modules/user/user.controller"));
const post_controller_1 = __importDefault(require("./modules/post/post.controller"));
const chat_controller_1 = __importDefault(require("./modules/chat/chat.controller"));
const error_response_1 = require("./utils/response/error.response");
const connection_db_1 = __importDefault(require("./DB/connection.db"));
const s3_config_1 = require("./utils/multer/s3.config");
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const gateway_1 = require("./modules/gateway/gateway");
const graphql_http_1 = require("graphql-http");
const schema_gql_1 = require("./modules/graphql/schema.gql");
const authentication_middleware_1 = require("./middleware/authentication.middleware");
const createS3WriteStreamPipe = (0, node_util_1.promisify)(node_stream_1.pipeline);
const bootstrap = async () => {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 5000;
    app.use(express_1.default.json(), (0, cors_1.default)(), (0, helmet_1.default)());
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 60 * 60000,
        limit: 2000,
        message: { error: "Too many requests please try again later" },
        statusCode: 429,
    });
    app.use(limiter);
    app.all("/graphql", (0, authentication_middleware_1.authentication)(), (0, graphql_http_1.createHandler)({
        schema: schema_gql_1.schema,
    }));
    app.get("/", (req, res) => {
        return res.json({ message: `${process.env.APPLICATION_NAME} is running` });
    });
    app.use("/auth", auth_controller_1.default);
    app.use("/user", user_controller_1.default);
    app.use("/post", post_controller_1.default);
    app.use("/chat", chat_controller_1.default);
    app.get("/upload/pre-signed/*path", async (req, res) => {
        const { downloadName, download = "false", expiresIn = 120 } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const url = await (0, s3_config_1.createGetPreSignedLink)({ Key, downloadName: downloadName, download, expiresIn });
        return res.json({ message: "pre-signed url", data: { url } });
    });
    app.get("/upload/*path", async (req, res) => {
        const { downloadName, download = "false" } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const s3Response = await (0, s3_config_1.getFile)({ Key });
        if (!s3Response?.Body) {
            throw new error_response_1.BadRequestException("failed to fetch this asset");
        }
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Type", `${s3Response.ContentType}` || "application/octet-stream");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}`);
        }
        return await createS3WriteStreamPipe(s3Response.Body, res);
    });
    app.use((req, res) => {
        return res.status(404).json({ message: "invalid app routing" });
    });
    app.use(error_response_1.globalErrorHandler);
    await (0, connection_db_1.default)();
    const httpServer = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    (0, gateway_1.initializeIo)(httpServer);
};
exports.default = bootstrap;
