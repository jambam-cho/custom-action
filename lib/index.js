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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const util_1 = require("util");
const pipeline = (0, util_1.promisify)(require('stream').pipeline);
function downloadFile(url, outputFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, node_fetch_1.default)(url);
            if (response.ok) {
                if (response.body) {
                    const file = fs.createWriteStream(outputFilePath);
                    const downloadStream = response.body.pipe(file);
                    downloadStream.on('finish', () => {
                        file.close();
                        resolve();
                    });
                    downloadStream.on('error', (err) => {
                        fs.unlinkSync(outputFilePath);
                        reject(err.message);
                    });
                }
                else {
                    reject('Response body is null.');
                }
            }
            else {
                reject(`Unexpected response: ${response.statusText}`);
            }
        }));
    });
}
function getAssetUrl(releasesUrl, authToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const headers = authToken
            ? { Authorization: `token ${authToken}` }
            : {};
        const jsonResponse = yield (0, node_fetch_1.default)(releasesUrl, {
            headers
        });
        const latestRelease = (yield jsonResponse.json());
        if (latestRelease && latestRelease.assets && latestRelease.assets[0]) {
            return latestRelease.assets[0].browser_download_url;
        }
        throw new Error('Failed to fetch asset URL');
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const releasesUrl = core.getInput('releases-url', { required: true });
            const outputFilePath = core.getInput('output-file-path', { required: true });
            const authToken = core.getInput('auth-token', { required: false });
            const assetUrl = yield getAssetUrl(releasesUrl, authToken);
            yield downloadFile(assetUrl, outputFilePath);
            core.setOutput('downloaded-file-path', outputFilePath);
        }
        catch (error) {
            if (error instanceof Error) {
                core.setFailed(error.message);
            }
            else {
                core.setFailed('An unexpected error occurred.');
            }
        }
    });
}
run();
