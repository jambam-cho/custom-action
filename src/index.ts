import * as core from '@actions/core'
import * as fs from 'fs'
import { promisify } from 'util'
import { request } from '@octokit/request'

const pipeline = promisify(require('stream').pipeline)

interface Release {
  assets: Array<{ browser_download_url: string }>
}

async function downloadFile(url: string, outputFilePath: string, authToken: string) {
  const response = await request("GET " + url, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `token ${authToken}`
    }
  });

  const file = fs.createWriteStream(outputFilePath);
  response.data.pipe(file);

  file.on('finish', () => {
    file.close();
  })

  file.on('error', (err: Error) => {
    fs.unlinkSync(outputFilePath);
    throw err.message;
  })
}

async function getAssetUrl(releasesUrl: string, authToken: string): Promise<string> {
  const response = await request("GET " + releasesUrl, {
    headers: { Authorization: `token ${authToken}` }
  });

  const latestRelease = response.data as Release
  if (latestRelease && latestRelease.assets && latestRelease.assets[0]) {
    return latestRelease.assets[0].browser_download_url
  }
  throw new Error('Failed to fetch asset URL');
}

async function run() {
  try {
    const releasesUrl = core.getInput('releases-url', { required: true });
    const outputFilePath = core.getInput('output-file-path', { required: true });
    const authToken = core.getInput('auth-token', { required: false });

    const assetUrl = await getAssetUrl(releasesUrl, authToken);
    await downloadFile(assetUrl, outputFilePath, authToken);

    core.setOutput('downloaded-file-path', outputFilePath);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred.');
    }
  }
}

run();
