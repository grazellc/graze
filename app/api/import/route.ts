import { NextRequest, NextResponse } from 'next/server'
import { parseZipBuffer, parseGeoJSONBuffer } from '@/lib/parse-zip.server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/import
 * Multipart: file = ZIP (Takeout) or .json (Maps your places GeoJSON)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    let result
    if (name.endsWith('.json')) {
      result = await parseGeoJSONBuffer(buffer, 'google_takeout_zip')
    } else if (name.endsWith('.zip') || file.type === 'application/zip') {
      result = await parseZipBuffer(buffer, 'google_takeout_zip')
    } else {
      return NextResponse.json({ error: 'Please upload the .zip from Google Takeout (or a Saved Places .json)' }, { status: 400 })
    }

    const { lists, skipped, backfilled } = result
    if (!lists.length) {
      return NextResponse.json({
        error: "Couldn't find saved places in this file. Make sure you selected “Saved” (and optionally “Maps (your places)”) in Takeout.",
      }, { status: 422 })
    }

    return NextResponse.json({
      lists,
      totalPlaces: lists.reduce((s, l) => s + l.places.length, 0),
      listsCount: lists.length,
      skipped,
      backfilled,
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to parse file' }, { status: 500 })
  }
}
