import { NextRequest, NextResponse } from 'next/server'
import { initiatePortabilityArchive, getPortabilityArchiveState, downloadArchiveFiles } from '@/lib/data-portability'
import { parseZipBuffer } from '@/lib/parse-zip.server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/portability/import
 * Body: { accessToken: string }
 *
 * Initiates a Data Portability archive, polls until done,
 * downloads + parses the ZIP, returns all lists as JSON.
 *
 * The DP API returns a ZIP containing GeoJSON files
 * (one per Maps list/category).
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 400 })
    }

    // Step 1: Initiate archive
    let jobId: string
    try {
      jobId = await initiatePortabilityArchive(accessToken)
    } catch (err: any) {
      return NextResponse.json({
        error: err.message || 'Failed to initiate Google Maps export',
        code: 'INITIATE_FAILED',
      }, { status: 502 })
    }

    // Step 2: Poll until complete (max 5 min)
    let state = await getPortabilityArchiveState(accessToken, jobId)
    const deadline = Date.now() + 5 * 60 * 1000
    while (state.state !== 'COMPLETE' && state.state !== 'FAILED') {
      if (Date.now() > deadline) {
        return NextResponse.json({ error: 'Export timed out', jobId }, { status: 504 })
      }
      await new Promise(r => setTimeout(r, 3000)) // poll every 3s
      state = await getPortabilityArchiveState(accessToken, jobId)
    }

    if (state.state === 'FAILED') {
      return NextResponse.json({ error: 'Google export failed', jobId }, { status: 502 })
    }

    // Step 3: Download archive files
    if (!state.urls?.length) {
      return NextResponse.json({ error: 'No files in archive', jobId }, { status: 502 })
    }

    const files = await downloadArchiveFiles(state.urls)

    // Step 4: Parse each file
    const allLists = []
    const allSkipped = []

    for (const file of files) {
      const { lists, skipped } = await parseZipBuffer(file.buffer, 'google_portability')
      allLists.push(...lists)
      allSkipped.push(...skipped)
    }

    // Deduplicate lists by name, merge places
    const merged = mergeListsByName(allLists)

    return NextResponse.json({
      lists: merged,
      totalPlaces: merged.reduce((s, l) => s + l.places.length, 0),
      listsCount: merged.length,
      skipped: allSkipped,
      jobId,
    })

  } catch (err: any) {
    console.error('Portability import error:', err)
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 })
  }
}

function mergeListsByName(lists: any[]) {
  const map = new Map<string, any>()
  for (const list of lists) {
    if (map.has(list.name)) {
      const existing = map.get(list.name)
      existing.places.push(...list.places)
    } else {
      map.set(list.name, { ...list, places: [...list.places] })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.places.length - a.places.length)
}

/**
 * GET /api/portability/import?jobId=...
 * Poll archive state — for async UX where frontend polls
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  const accessToken = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jobId || !accessToken) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }
  try {
    const state = await getPortabilityArchiveState(accessToken, jobId)
    return NextResponse.json(state)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
