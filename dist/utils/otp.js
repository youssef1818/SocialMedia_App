"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpNumber = void 0;
const generateOtpNumber = () => {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
};
exports.generateOtpNumber = generateOtpNumber;
