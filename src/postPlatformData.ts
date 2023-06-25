// import {URL} from 'url'
// import fetch from 'node-fetch'
//
// async function postPlatformData(
//   token: string,
//   tfUrl: string,
//   provider: string,
//   tag: string,
//   os: string,
//   arch: string,
//   shasum: string,
//   filename: string
// ): Promise<void> {
//   const url = new URL(`${tfUrl}/${provider}/versions/${tag}/platforms`)
//
//   const payload = {
//     data: {
//       type: 'registry-provider-version-platforms',
//       attributes: {
//         os,
//         arch,
//         shasum,
//         filename
//       }
//     }
//   }
//
//   const response = await fetch(url.toString(), {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/vnd.api+json'
//     },
//     body: JSON.stringify(payload)
//   })
//
//   if (!response.ok) {
//     const errorText = await response.text()
//     throw new Error(`Failed to POST platform data: ${errorText}`)
//   }
// }
//
// function getShasum(
//   outputDir: string,
//   repoName: string,
//   tag: string,
//   osArch: string
// ): string {
//   const sha256sumFile = `${outputDir}/${repoName}_${tag}_SHA256SUMS`
//   const fileName = `${repoName}_${tag}_${osArch}.zip`
//
//   const sha256sumContent = fs.readFileSync(sha256sumFile, 'utf-8')
//   const lines = sha256sumContent.split('\n')
//
//   for (const line of lines) {
//     if (line.includes(fileName)) {
//       const shasum = line.split(' ')[0]
//       return shasum
//     }
//   }
//
//   throw new Error(`Shasum not found for file ${fileName}`)
// }
//
// // Add this code where you need to get the shasum and call the postPlatformData function
// const shasum = getShasum(outputDir, repoName, tag, osArch)
//
// // Now call the postPlatformData function with the appropriate arguments
// await postPlatformData(token, tfUrl, provider, tag, os, arch, shasum, filename)
