import * as core from "@actions/core";
import * as fs from "fs";
import fetch, { Response } from "node-fetch";
import * as https from "https";
import { promisify } from "util";

const pipeline = promisify(require("stream").pipeline);

async function downloadFile(url: string, outputFilePath: string) {
  return new Promise<void>(async (resolve, reject) => {
    const response: Response = await fetch(url);

    if (response.ok) {
      const file = fs.createWriteStream(outputFilePath);
      const downloadStream = response.body.pipe(file);

      downloadStream.on("finish", () => {
        file.close();
        resolve();
      });

      downloadStream.on("error", (err: Error) => {
        fs.unlinkSync(outputFilePath);
        reject(err.message);
      });
    } else {
      reject(`Unexpected response: ${response.statusText}`);
    }
  });
}

async function getAssetUrl(releasesUrl: string, authToken: string | undefined): Promise<string> {
  const headers: HeadersInit = authToken ? { "Authorization": `token ${authToken}` } : {};
  const jsonResponse = await fetch(releasesUrl, {
    headers
  });

  const latestRelease = await jsonResponse.json();
  if (latestRelease && latestRelease.assets && latestRelease.assets[0]) {
    return latestRelease.assets[0].browser_download_url;
  }

  throw new Error("Failed to fetch asset URL");
}

async function run() {
  try {
    const releasesUrl = core.getInput("releases-url", { required: true });
    const outputFilePath = core.getInput("output-file-path", { required: true });
    const authToken = core.getInput("auth-token", { required: false });

    const assetUrl = await getAssetUrl(releasesUrl, authToken);
    await downloadFile(assetUrl, outputFilePath);

    core.setOutput("downloaded-file-path", outputFilePath);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred.");
    }
  }
}

run();
