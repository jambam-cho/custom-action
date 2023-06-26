import {URL} from 'url'
import fetch from 'node-fetch'
import fs from 'fs'
import axios, {AxiosError} from 'axios'
interface ResponseData {
  data: {
    links: {
      'provider-binary-upload': string
    }
  }
}

interface ExecError extends Error {
  message: string
}

export async function getShasum(
  outputDir: string,
  repoName: string,
  tag: string,
  osArch: string
): Promise<{shasum: string; fileName: string}> {
  const sha256sumFile = `${outputDir}/${repoName}_${tag}_SHA256SUMS`
  const fileName = `${repoName}_${tag}_${osArch}.zip`

  const sha256sumContent = fs.readFileSync(sha256sumFile, 'utf-8')
  const lines = sha256sumContent.split('\n')

  for (const line of lines) {
    if (line.includes(fileName)) {
      const shasum = line.split(' ')[0]
      return {shasum, fileName}
    }
  }

  throw new Error(`Shasum not found for file ${fileName}`)
}

export async function postPlatformData(
  tfToken: string,
  tfUrl: string,
  provider: string,
  tag: string,
  osArch: string,
  shasum: string,
  filename: string
): Promise<string> {
  const url = new URL(`${tfUrl}/${provider}/versions/${tag}/platforms`)
  const parts = osArch.split('_')
  const os = parts[0]
  const arch = parts[1]
  const payload = {
    data: {
      type: 'registry-provider-version-platforms',
      attributes: {
        os,
        arch,
        shasum,
        filename
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tfToken}`,
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to POST platform data: ${errorText}`)
  }
  const jsonResponse = (await response.json()) as ResponseData
  const providerBinaryUploadLink =
    jsonResponse.data.links['provider-binary-upload']
  return providerBinaryUploadLink
}

export async function uploadBinary(
  outputDir: string,
  fileName: string,
  uploadUrl: string
): Promise<void> {
  try {
    const filePath = `${outputDir}/${fileName}`
    const fileStream = fs.createReadStream(filePath)

    await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })
  } catch (error) {
    const axiosError = error as AxiosError
    throw new Error(`Failed to upload binary: ${axiosError.message}`)
  }
}
