import { NextRequest, NextResponse } from 'next/server'
import { parseZipBuffer } from '@/lib/parse-zip.server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/import
 * Multipart: file = ZIP from Google Takeout
 * This is the backup path for users who export manually
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    // Validate it's a ZIP
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
      return NextResponse.json({ error: 'Please upload a .zip file from Google Takeout' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { lists, skipped } = await parseZipBuffer(buffer, 'google_takeout_zip')

    if (!lists.length) {
      return NextResponse.json({
        error: "Couldn't find saved places in this ZIP. Make sure you selected 'Saved' when creating your Takeout export.",
      }, { status: 422 })
    }

    return NextResponse.json({
      lists,
      totalPlaces: lists.reduce((s, l) => s + l.places.length, 0),
      listsCount: lists.length,
      skipped,
    })
  } catch (err: any) {
    console.error('ZIP import error:', err)
    return NextResponse.json({ error: err.message || 'Failed to parse ZIP' }, { status: 500 })
  }
}
