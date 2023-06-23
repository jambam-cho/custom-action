import * as core from '@actions/core'
import fs from 'fs'
import {promisify} from 'util'
import fetch from 'node-fetch'
import https from 'https'

interface ReleaseData {
  data: RespData
}

interface RespData {
  tag_name: string
  assets: Asset[]
}

interface Asset {
  name: string
  browser_download_url: string
}

const pipeline = promisify(require('stream').pipeline)

async function getLatestRelease(
  githubRepo: string,
  authToken: string
): Promise<RespData> {
  const url = `https://api.github.com/repos/${githubRepo}/releases/latest`
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${authToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch latest release for ${githubRepo}`)
  }

  const resp = (await response.json()) as ReleaseData

  return resp.data
}

async function getAssetDownloadUrls(
  githubRepo: string,
  authToken: string,
  osArchPairs: string[]
): Promise<Asset[]> {
  const latestRelease = await getLatestRelease(githubRepo, authToken)
  const tag = latestRelease.tag_name.split('v')[1]

  const repoName = githubRepo.split('/')[1]
  const filePrefix = `${repoName}_${tag}`
  const desiredFileNames = osArchPairs.flatMap(osArch => [
    `${repoName}_${tag}_${osArch}.zip`,
    `${repoName}_${tag}_SHA256SUMS`,
    `${repoName}_${tag}_SHA256SUMS.sig`
  ])

  const assets = latestRelease.assets.filter(asset =>
    desiredFileNames.includes(asset.name)
  )

  return assets
}

async function downloadAsset(
  asset: Asset,
  outputDir: string,
  authToken: string
) {
  const file = fs.createWriteStream(`${outputDir}/${asset.name}`)
  const response = await fetch(asset.browser_download_url, {
    agent: new https.Agent({rejectUnauthorized: false}),
    headers: {
      Authorization: `token ${authToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download asset: ${asset.name}`)
  }

  await pipeline(response.body, file)
}

async function downloadAssets(
  assets: Asset[],
  outputDir: string,
  authToken: string
) {
  for (const asset of assets) {
    console.log(`Downloading ${asset.browser_download_url}`)
    await downloadAsset(asset, outputDir, authToken)
  }
}

async function run() {
  try {
    const githubRepo = core.getInput('github-repo', {required: true})
    const authToken = core.getInput('auth-token', {required: true})
    const outputDir = core.getInput('output-dir', {required: true})
    const osArchPairs = core
      .getInput('osArch', {required: true})
      .split(',')
      .map(pair => pair.trim())

    const assets = await getAssetDownloadUrls(
      githubRepo,
      authToken,
      osArchPairs
    )
    console.log(
      'Asset download URLs:',
      assets.map(asset => asset.browser_download_url)
    )

    await downloadAssets(assets, outputDir, authToken)

    console.log('Assets downloaded successfully')

    core.setOutput('downloaded-file-path', outputDir)
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred.')
    }
  }
}

run()
