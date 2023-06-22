import * as core from '@actions/core';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { promisify } from 'util';
const pipeline = promisify(require('stream').pipeline);
async function downloadFile(url, outputFilePath) {
    return new Promise(async (resolve, reject) => {
        const response = await fetch(url);
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
    });
}
async function getAssetUrl(releasesUrl, authToken) {
    const headers = authToken
        ? { Authorization: `token ${authToken}` }
        : {};
    const jsonResponse = await fetch(releasesUrl, {
        headers
    });
    const latestRelease = (await jsonResponse.json());
    if (latestRelease && latestRelease.assets && latestRelease.assets[0]) {
        return latestRelease.assets[0].browser_download_url;
    }
    throw new Error('Failed to fetch asset URL');
}
async function run() {
    try {
        const releasesUrl = core.getInput('releases-url', { required: true });
        const outputFilePath = core.getInput('output-file-path', { required: true });
        const authToken = core.getInput('auth-token', { required: false });
        const assetUrl = await getAssetUrl(releasesUrl, authToken);
        await downloadFile(assetUrl, outputFilePath);
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
}
run();
