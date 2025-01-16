import axios, {AxiosError} from 'axios'

export async function createRegistryProvider(
  tfToken: string,
  provider: string
) {
  const url =
    'https://app.terraform.io/api/v2/organizations/bucketplace/registry-providers'

  const payload = {
    data: {
      type: 'registry-providers',
      attributes: {
        name: provider,
        namespace: 'bucketplace',
        'registry-name': 'private'
      }
    }
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${tfToken}`,
        'Content-Type': 'application/vnd.api+json'
      }
    })

    console.log(response.data)
  } catch (error) {
    const axiosError = error as AxiosError
    console.error(`Error creating registry provider: ${axiosError.message}`)
  }
}
