import { NextRequest, NextResponse } from 'next/server'
import { parseZipBuffer, parseGeoJSONBuffer, parseLooseFiles } from '@/lib/parse-zip.server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/import
 * Accepts (multipart):
 *   - file:  a single .zip (Takeout) or .json (Maps your places)
 *   - files: many .csv/.json (a dropped Takeout FOLDER after Mac auto-unzip)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const many = formData.getAll('files').filter(Boolean) as File[]
    const single = formData.get('file') as File | null
    const incoming = many.length ? many : (single ? [single] : [])
    if (!incoming.length) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    let result

    if (incoming.length === 1) {
      const f = incoming[0]
      const name = f.name.toLowerCase()
      const buffer = Buffer.from(await f.arrayBuffer())
      if (name.endsWith('.json')) result = await parseGeoJSONBuffer(buffer, 'google_takeout_zip')
      else if (name.endsWith('.zip') || f.type === 'application/zip') result = await parseZipBuffer(buffer, 'google_takeout_zip')
      else if (name.endsWith('.csv')) result = await parseLooseFiles([{ name: f.name, buffer }])
      else return NextResponse.json({ error: 'Upload the Takeout .zip, the unzipped folder, or a Saved Places .json' }, { status: 400 })
    } else {
      // A folder's worth of loose files
      const loose = await Promise.all(
        incoming
          .filter(f => /\.(csv|json)$/i.test(f.name))
          .map(async f => ({ name: f.name, buffer: Buffer.from(await f.arrayBuffer()) }))
      )
      result = await parseLooseFiles(loose)
    }

    const { lists, skipped, backfilled } = result
    if (!lists.length) {
      return NextResponse.json({
        error: "Couldn't find saved places in this. Make sure you selected “Saved” (and optionally “Maps (your places)”) in Takeout.",
      }, { status: 422 })
    }

    return NextResponse.json({
      lists,
      totalPlaces: lists.reduce((s, l) => s + l.places.length, 0),
      listsCount: lists.length,
      skipped, backfilled,
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to parse file' }, { status: 500 })
  }
}
