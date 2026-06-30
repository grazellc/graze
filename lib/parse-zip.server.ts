import AdmZip from 'adm-zip'
import type { GrazeList, Place, ImportSource } from '@/types'
import {
  parseCSVToPlaces, parseDPGeoJSON, colorForName, detectCity,
  cidFromFeatureId, cidFromUrl,
} from './utils'

interface GeoInfo { lat?: number; lng?: number; address?: string; country?: string }

// Build a cid -> location map from any GeoJSON feature collections found.
function indexGeoByCid(collections: any[]): Map<string, GeoInfo> {
  const map = new Map<string, GeoInfo>()
  for (const gj of collections) {
    for (const f of gj.features || []) {
      const url = f.properties?.google_maps_url
      const cid = cidFromUrl(url)
      if (!cid) continue
      const loc = f.properties?.location || {}
      const [lng, lat] = f.geometry?.coordinates || []
      map.set(cid, {
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
        address: loc.address,
        country: loc.country_code,
      })
    }
  }
  return map
}

// Stamp free coords/address onto CSV list places where the cid matches.
function backfill(lists: GrazeList[], geoByCid: Map<string, GeoInfo>): number {
  let n = 0
  for (const l of lists) {
    for (const p of l.places) {
      if (p.lat != null) continue
      const cid = cidFromFeatureId(p.mapFeatureId)
      const g = cid ? geoByCid.get(cid) : undefined
      if (g) {
        p.lat = g.lat; p.lng = g.lng
        p.address = p.address || g.address
        p.country = p.country || g.country
        n++
      }
    }
  }
  return n
}

function csvToList(filename: string, content: string, source: ImportSource): GrazeList | null {
  const listName = filename.replace(/\.csv$/i, '')
  const places = parseCSVToPlaces(listName, content, source)
  if (!places.length) return null
  return {
    id: crypto.randomUUID(), name: listName, color: colorForName(listName),
    places, sourceFile: filename, source,
    createdAt: new Date().toISOString(), city: detectCity(listName),
  }
}

function geojsonToList(name: string, gj: any, source: ImportSource): GrazeList | null {
  const places = parseDPGeoJSON(name, gj, source)
  if (!places.length) return null
  return {
    id: crypto.randomUUID(),
    name,
    color: colorForName(name),
    places,
    source,
    createdAt: new Date().toISOString(),
    city: detectCity(name),
  }
}

function prettyGeoName(entryName: string): string {
  const base = entryName.split('/').pop()!.replace(/\.json$/i, '').replace(/_/g, ' ')
  if (/saved/i.test(base) || /starred/i.test(base)) return '⭐ Starred places'
  return base
}

// ── ZIP (Takeout) ─────────────────────────────────────────────
export async function parseZipBuffer(
  buffer: Buffer,
  source: ImportSource
): Promise<{ lists: GrazeList[]; skipped: string[]; backfilled: number }> {
  let zip: AdmZip
  try { zip = new AdmZip(buffer) } catch { throw new Error('Invalid ZIP file') }

  const entries = zip.getEntries()
  const lists: GrazeList[] = []
  const skipped: string[] = []

  const csvEntries = entries.filter(e => {
    const n = e.entryName.toLowerCase()
    return n.endsWith('.csv') && (n.includes('/saved/') || n.includes('saved/') || !n.includes('/'))
  })
  const geojsonEntries = entries.filter(e => {
    const n = e.entryName.toLowerCase()
    return n.endsWith('.json') && (n.includes('saved') || n.includes('place') || n.includes('your places'))
  })

  // Named lists from CSV (the core)
  for (const entry of csvEntries) {
    const filename = entry.name
    const listName = filename.replace(/\.csv$/i, '')
    try {
      const content = entry.getData().toString('utf-8')
      const places = parseCSVToPlaces(listName, content, source)
      if (!places.length) { skipped.push(filename); continue }
      lists.push({
        id: crypto.randomUUID(), name: listName, color: colorForName(listName),
        places, sourceFile: filename, source,
        createdAt: new Date().toISOString(), city: detectCity(listName),
      })
    } catch { skipped.push(filename) }
  }

  // GeoJSON: build Starred list + index for backfill
  const collections: any[] = []
  for (const entry of geojsonEntries) {
    try {
      const gj = JSON.parse(entry.getData().toString('utf-8'))
      if (!gj.features) continue
      collections.push(gj)
      const list = geojsonToList(prettyGeoName(entry.name), gj, source)
      if (list) lists.push(list)
    } catch { skipped.push(entry.name) }
  }

  const backfilled = backfill(lists, indexGeoByCid(collections))
  lists.sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name))
  return { lists, skipped, backfilled }
}

// ── Bare GeoJSON (.json) upload ───────────────────────────────
export async function parseGeoJSONBuffer(
  buffer: Buffer,
  source: ImportSource
): Promise<{ lists: GrazeList[]; skipped: string[]; backfilled: number }> {
  let gj: any
  try { gj = JSON.parse(buffer.toString('utf-8')) } catch { throw new Error('Invalid JSON file') }
  if (!gj.features) throw new Error('That JSON isn’t a Google Maps places export')
  const list = geojsonToList('⭐ Starred places', gj, source)
  return { lists: list ? [list] : [], skipped: [], backfilled: 0 }
}

// ── Loose files (a dropped Takeout FOLDER, after Mac auto-unzip) ──
export async function parseLooseFiles(
  files: { name: string; buffer: Buffer }[],
  source: ImportSource = 'google_takeout_zip'
): Promise<{ lists: GrazeList[]; skipped: string[]; backfilled: number }> {
  const lists: GrazeList[] = []
  const skipped: string[] = []
  const collections: any[] = []

  for (const f of files) {
    const lower = f.name.toLowerCase()
    if (lower.endsWith('.csv')) {
      const list = csvToList(f.name, f.buffer.toString('utf-8'), source)
      if (list) lists.push(list); else skipped.push(f.name)
    } else if (lower.endsWith('.json')) {
      try {
        const gj = JSON.parse(f.buffer.toString('utf-8'))
        if (gj.features) {
          collections.push(gj)
          const list = geojsonToList(prettyGeoName(f.name), gj, source)
          if (list) lists.push(list)
        }
      } catch { skipped.push(f.name) }
    }
  }

  const backfilled = backfill(lists, indexGeoByCid(collections))
  lists.sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name))
  return { lists, skipped, backfilled }
}
