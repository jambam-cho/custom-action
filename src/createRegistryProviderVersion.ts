import axios from 'axios'
import fs from 'fs'

interface UploadLinks {
  shasumsUpload: string
  shasumsSigUpload: string
}

export async function createRegistryProviderVersion(
  tfToken: string,
  gpgKey: string,
  tfUrl: string,
  provider: string
): Promise<UploadLinks> {
  const token = tfToken
  const url = `${tfUrl}/${provider}/versions`

  const payload = {
    data: {
      type: 'registry-provider-versions',
      attributes: {
        version: '0.3.0',
        'key-id': gpgKey, // GPG Key from terraform cloud
        protocols: ['6.0']
      }
    }
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json'
      }
    })

    const shasumsUpload = response.data.data.links['shasums-upload']
    const shasumsSigUpload = response.data.data.links['shasums-sig-upload']

    return {
      shasumsUpload,
      shasumsSigUpload
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error creating registry provider version: ${error.message}`
      )
    } else {
      console.error(
        'Error creating registry provider version: An unknown error occurred.'
      )
    }
    throw error // 캐치된 오류를 던집니다.
  }
}

export async function uploadFiles(
  shasumsUpload: string,
  shasumsSigUpload: string,
  outputDir: string,
  repoName: string,
  tag: string
) {
  const shasumsFile = `${outputDir}/${repoName}_${tag}_SHA256SUMS`
  const shasumsSigFile = `${outputDir}/${repoName}_${tag}_SHA256SUMS.sig`

  try {
    // shasumsFile 업로드
    const shasumsFileData = fs.createReadStream(shasumsFile)
    await axios.put(shasumsUpload, shasumsFileData)

    // shasumsSigFile 업로드
    const shasumsSigFileData = fs.createReadStream(shasumsSigFile)
    await axios.put(shasumsSigUpload, shasumsSigFileData)

    console.log('Files uploaded successfully')
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error uploading files: ${error.message}`)
    } else {
      console.error('Error uploading files: An unknown error occurred.')
    }
  }
}
