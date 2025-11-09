"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.ForbiddenException = exports.UnauthorizedException = exports.ConflictException = exports.NotFoundException = exports.BadRequestException = exports.AppError = void 0;
class AppError extends Error {
    message;
    statusCode;
    cause;
    constructor(message, statusCode, cause) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.cause = cause;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestException extends AppError {
    constructor(message, cause) {
        super(message, 400, cause);
    }
}
exports.BadRequestException = BadRequestException;
class NotFoundException extends AppError {
    constructor(message, cause) {
        super(message, 404, cause);
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends AppError {
    constructor(message, cause) {
        super(message, 409, cause);
    }
}
exports.ConflictException = ConflictException;
class UnauthorizedException extends AppError {
    constructor(message, cause) {
        super(message, 401, cause);
    }
}
exports.UnauthorizedException = UnauthorizedException;
class ForbiddenException extends AppError {
    constructor(message, cause) {
        super(message, 403, cause);
    }
}
exports.ForbiddenException = ForbiddenException;
const globalErrorHandler = (error, req, res, next) => {
    return res.status(error.statusCode || 500).json({
        error_message: error.message || "Something went wrong!",
        stack: process.env.MOOD === "development" ? error.stack : undefined,
        cause: error.cause,
    });
};
exports.globalErrorHandler = globalErrorHandler;
