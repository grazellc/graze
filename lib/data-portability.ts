/**
 * Google Data Portability API client
 * Docs: https://developers.google.com/data-portability
 *
 * Scopes needed:
 *   https://www.googleapis.com/auth/dataportability.maps.starred_places
 *   https://www.googleapis.com/auth/dataportability.mymaps.maps
 *
 * Flow:
 *   1. User signs in with Google (separate OAuth flow for regular auth)
 *   2. User clicks "Import from Google Maps" → second OAuth for DPAPI scopes
 *   3. We call InitiatePortabilityArchive
 *   4. Poll GetPortabilityArchiveState until COMPLETE
 *   5. Download signed URLs → parse GeoJSON → done
 */

const DP_BASE = 'https://dataportability.googleapis.com/v1'

// The Maps saved places resources available via Data Portability API
export const DP_MAPS_RESOURCES = [
  'maps.starred_places',   // starred/saved places with coordinates
  'mymaps.maps',           // custom user-created lists
]

export const DP_SCOPES = DP_MAPS_RESOURCES.map(
  r => `https://www.googleapis.com/auth/dataportability.${r}`
).join(' ')

export interface ArchiveState {
  jobId: string
  state: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED'
  urls?: string[]  // signed download URLs when COMPLETE
}

/**
 * Step 1: Initiate the portability archive
 * Returns a jobId to poll
 */
export async function initiatePortabilityArchive(
  accessToken: string
): Promise<string> {
  const res = await fetch(`${DP_BASE}/portabilityArchive:initiate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resources: DP_MAPS_RESOURCES,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `DP API error: ${res.status}`)
  }
  const data = await res.json()
  return data.archiveJobId || data.jobId
}

/**
 * Step 2: Poll archive state
 */
export async function getPortabilityArchiveState(
  accessToken: string,
  jobId: string
): Promise<ArchiveState> {
  const res = await fetch(
    `${DP_BASE}/portabilityArchive:getState?jobId=${encodeURIComponent(jobId)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`DP state error: ${res.status}`)
  const data = await res.json()
  return {
    jobId,
    state: data.state || 'PENDING',
    urls: data.downloadUrls || data.urls || [],
  }
}

/**
 * Step 3: Download archive files from signed URLs
 * Returns array of { filename, content } objects
 */
export async function downloadArchiveFiles(
  urls: string[]
): Promise<Array<{ filename: string; buffer: Buffer }>> {
  const results = await Promise.all(
    urls.map(async url => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      // Extract filename from URL
      const filename = new URL(url).pathname.split('/').pop() || 'archive.zip'
      return { filename, buffer: Buffer.from(arrayBuffer) }
    })
  )
  return results
}

/**
 * Build the Google OAuth URL for Data Portability scopes
 * Note: DPAPI scopes CANNOT be mixed with regular scopes
 * So this is a separate OAuth flow from sign-in
 */
export function buildDPAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DP_SCOPES,
    access_type: 'offline',
    state,
    // DPAPI requirement: never use include_granted_scopes=true
    include_granted_scopes: 'false',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Token exchange failed')
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
}
