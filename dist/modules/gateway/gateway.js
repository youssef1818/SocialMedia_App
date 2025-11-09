"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = exports.initializeIo = exports.connectedSockets = void 0;
const token_security_1 = require("../../utils/security/token.security");
const socket_io_1 = require("socket.io");
const chat_gateway_1 = require("./../chat/chat.gateway");
const error_response_1 = require("../../utils/response/error.response");
exports.connectedSockets = new Map();
let io = undefined;
const initializeIo = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
        },
    });
    io.use(async (socket, next) => {
        try {
            const { user, decoded } = await (0, token_security_1.decodedToken)({
                authorization: socket.handshake?.auth.authorization || "",
                tokenType: token_security_1.TokenEnum.access,
            });
            const userTabes = exports.connectedSockets.get(user._id.toString()) || [];
            console.log({ userTabes });
            userTabes.push(socket.id);
            exports.connectedSockets.set(user._id.toString(), userTabes);
            socket.credentials = { user, decoded };
            next();
        }
        catch (error) {
            next(error);
        }
    });
    function disconnection(socket, io) {
        return socket.on("disconnect", () => {
            const userId = socket.credentials?.user._id?.toString();
            let remainingTabs = exports.connectedSockets.get(userId)?.filter((tab) => {
                return tab !== socket.id;
            }) || [];
            if (remainingTabs.length) {
                exports.connectedSockets.set(userId, remainingTabs);
            }
            else {
                exports.connectedSockets.delete(userId);
                (0, exports.getIo)().emit("offline_user", userId);
            }
            ;
            console.log(`a user dis-connected from: ${socket.id}`);
            console.log({ "After logout": exports.connectedSockets });
        });
    }
    const chatGateway = new chat_gateway_1.ChatGateway();
    io.on("connection", (socket) => {
        console.log(`a user connected to: ${socket.id}`);
        chatGateway.register(socket, (0, exports.getIo)());
        disconnection(socket, (0, exports.getIo)());
    });
};
exports.initializeIo = initializeIo;
const getIo = () => {
    if (!io) {
        throw new error_response_1.BadRequestException("Socket.io not initialized");
    }
    return io;
};
exports.getIo = getIo;
