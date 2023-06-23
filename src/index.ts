import * as core from '@actions/core'
import fs from 'fs'
import {promisify} from 'util'
import fetch from 'node-fetch'
import {request} from '@octokit/request'
import https from 'https'

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

  const resp = (await response.json()) as RespData

  return resp
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
  const response = await fetch(asset.browser_download_url, {
    headers: {
      Accept: 'application/octet-stream',
      Authorization: `token ${authToken}`
    }
  })

  console.log('Download response:', response.status, response.headers)

  if (!response.body) {
    throw new Error('Error: The response body is null.')
  }

  const file = fs.createWriteStream(`${outputDir}/${asset.name}`)
  if (response.status === 200) {
    response.body.pipe(file)

    file.on('finish', () => {
      file.close()
    })

    file.on('error', (err: Error) => {
      fs.unlinkSync(`${outputDir}/${asset.name}`)
      throw err.message
    })
  } else if (response.status === 404) {
    throw new Error(`File not found: ${asset.browser_download_url}`)
  } else {
    throw new Error(
      `Unexpected response for downloading file: ${response.status}`
    )
  }
}

// async function downloadAsset(
//   asset: Asset,
//   outputDir: string,
//   authToken: string
// ) {
//   console.log('Downloading asset:', asset.browser_download_url)
//   const response = await request('GET' + asset.browser_download_url, {
//     headers: {
//       Accept: 'application/octet-stream',
//       Authorization: `token ${authToken}`
//     },
//     request: {fetch}
//   })
//
//   console.log('Download response:', response.status, response.headers)
//
//   const file = fs.createWriteStream(`${outputDir}/${asset.name}`)
//
//   if (response.status === 200) {
//     response.data.pipe(file)
//
//     file.on('finish', () => {
//       file.close()
//     })
//
//     file.on('error', (err: Error) => {
//       fs.unlinkSync(outputDir)
//       throw err.message
//     })
//   } else {
//     throw new Error(
//       `Unexpected response for downloading file: ${response.status}`
//     )
//   }
// }

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
