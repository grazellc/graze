import type { GrazeList, Place, DPFeatureCollection, ImportSource } from '@/types'

// ── Colors ───────────────────────────────────────────────────
const COLORS = [
  '#c8411a','#3c6040','#b5861a','#7c3aed','#1d4ed8',
  '#db2777','#ea580c','#57534e','#16a34a','#0891b2',
  '#be123c','#854d0e','#065f46','#1e3a8a','#7f1d1d',
]
export function colorForName(name: string): string {
  let h = 5381
  for (const c of name) h = ((h << 5) + h) + c.charCodeAt(0)
  return COLORS[Math.abs(h) % COLORS.length]
}

// ── Hash (dedup) ─────────────────────────────────────────────
export function makeHash(...parts: string[]): string {
  const str = parts.join('|').toLowerCase().trim()
  let h = 5381
  for (const c of str) h = ((h << 5) + h) + c.charCodeAt(0)
  return Math.abs(h).toString(36)
}

// ── CSV parser (Google Takeout ZIP format) ───────────────────
function splitLines(content: string): string[] {
  const lines: string[] = []
  let cur = '', inQ = false
  for (const ch of content) {
    if (ch === '"') { inQ = !inQ; continue }
    if ((ch === '\n' || ch === '\r') && !inQ) {
      if (cur.trim()) lines.push(cur)
      cur = ''; continue
    }
    cur += ch
  }
  if (cur.trim()) lines.push(cur)
  return lines
}

function parseRow(row: string): string[] {
  const fields: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < row.length; i++) {
    const c = row[i]
    if (c === '"') {
      if (inQ && row[i+1] === '"') { cur += '"'; i++; continue }
      inQ = !inQ
    } else if (c === ',' && !inQ) {
      fields.push(cur.trim()); cur = ''
    } else cur += c
  }
  fields.push(cur.trim())
  return fields
}

// Extract Google's embedded feature id (e.g. 0x3be7cf...:0x35eed3...) or cid
// from a Takeout maps URL. Used later to resolve a Places API place_id.
// Convert a Takeout feature id "0xAAAA:0xBBBB" to its decimal CID (the BBBB part).
// This bridges CSV list places to GeoJSON coordinates (which key on decimal cid).
export function cidFromFeatureId(featureId?: string): string | undefined {
  if (!featureId) return undefined
  const m = featureId.match(/0x[0-9a-fA-F]+:0x([0-9a-fA-F]+)/)
  if (!m) return undefined
  try { return BigInt('0x' + m[1]).toString(10) } catch { return undefined }
}
export function cidFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  const m = url.match(/[?&]cid=(\d+)/)
  return m ? m[1] : undefined
}

export function extractMapFeatureId(url?: string): string | undefined {
  if (!url) return undefined
  const m = url.match(/1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/)
  if (m) return m[1]
  const c = url.match(/[?&]cid=(\d+)/)
  if (c) return 'cid:' + c[1]
  return undefined
}

export function parseCSVToPlaces(listName: string, content: string, source: ImportSource): Place[] {
  const lines = splitLines(content)
  if (lines.length < 2) return []
  const headers = parseRow(lines[0]).map(h => h.toLowerCase())
  const ti = headers.findIndex(h => h.includes('title'))
  const ni = headers.findIndex(h => h.includes('note'))
  const ui = headers.findIndex(h => h.includes('url'))
  const ci = headers.findIndex(h => h.includes('comment'))
  const places: Place[] = []
  for (const line of lines.slice(1)) {
    const cols = parseRow(line)
    const name = cols[ti >= 0 ? ti : 0]?.replace(/"/g,'').trim()
    if (!name) continue
    const url     = ui >= 0 ? (cols[ui] || '').replace(/"/g,'').trim() : ''
    const note    = ni >= 0 ? (cols[ni] || '').replace(/"/g,'').trim() : ''
    const comment = ci >= 0 ? (cols[ci] || '').replace(/"/g,'').trim() : ''
    const userNote = [note, comment].filter(Boolean).join(' · ') || undefined
    places.push({
      id: crypto.randomUUID(),
      listId: makeHash(listName),
      name,
      googleMapsUrl: url || undefined,
      mapFeatureId: extractMapFeatureId(url),
      userNote,
      visited: false,
      enriched: false,
      source,
      sourceHash: makeHash(listName, name, url),
      addedAt: new Date().toISOString(),
    })
  }
  return places
}

// ── Parse Data Portability GeoJSON ───────────────────────────
export function parseDPGeoJSON(
  listName: string,
  geojson: DPFeatureCollection,
  source: ImportSource = 'google_portability'
): Place[] {
  return (geojson.features || []).map(f => {
    const p = f.properties || {}
    const loc = p.location || {}
    const [lng, lat] = f.geometry?.coordinates || [0, 0]
    const name = loc.name || 'Unknown place'
    return {
      id: crypto.randomUUID(),
      listId: makeHash(listName),
      name,
      address: loc.address,
      country: loc.country_code,
      countryCode: loc.country_code,
      lat: lat !== 0 ? lat : undefined,
      lng: lng !== 0 ? lng : undefined,
      googleMapsUrl: p.google_maps_url,
      visited: false,
      enriched: false,
      source,
      sourceHash: makeHash(listName, name, p.google_maps_url || ''),
      addedAt: p.date || new Date().toISOString(),
    }
  })
}

// ── City detection ────────────────────────────────────────────
export function detectCity(name: string): string | undefined {
  const map: Record<string, string> = {
    NYC:'New York', NY:'New York', Mumbai:'Mumbai', Delhi:'Delhi',
    London:'London', Paris:'Paris', Tokyo:'Tokyo', Bali:'Bali',
    Singapore:'Singapore', Dubai:'Dubai', Chicago:'Chicago',
    LA:'Los Angeles', Miami:'Miami', Vegas:'Las Vegas', LV:'Las Vegas',
    Japan:'Japan', China:'China', India:'India', Australia:'Australia',
    Barcelona:'Barcelona', Rome:'Rome', Athens:'Athens', Ibiza:'Ibiza',
    Mykonos:'Mykonos', Goa:'Goa', Kolkata:'Kolkata', Lucknow:'Lucknow',
    Shanghai:'Shanghai', HK:'Hong Kong', Malaysia:'Malaysia',
    Vietnam:'Vietnam', Hawaii:'Hawaii', Seattle:'Seattle',
    Canada:'Canada', Egypt:'Egypt', Punjab:'Punjab',
    Varanasi:'Varanasi', Shimla:'Shimla', Ahmedabad:'Ahmedabad', Agra:'Agra',
  }
  for (const [k,v] of Object.entries(map)) {
    if (name.toLowerCase().startsWith(k.toLowerCase()) ||
        name.toLowerCase().includes(' '+k.toLowerCase())) return v
  }
  return undefined
}

// ── Diff: only import new places ─────────────────────────────
export function diffLists(
  incoming: GrazeList[],
  existing: GrazeList[]
): { merged: GrazeList[]; newCount: number } {
  const existingHashes = new Set(
    existing.flatMap(l => l.places.map(p => p.sourceHash))
  )
  let newCount = 0
  const merged = [...existing]
  for (const inc of incoming) {
    const newPlaces = inc.places.filter(p => !existingHashes.has(p.sourceHash))
    newCount += newPlaces.length
    const existIdx = merged.findIndex(l =>
      l.sourceFile === inc.sourceFile || l.name === inc.name
    )
    if (existIdx >= 0) {
      merged[existIdx] = {
        ...merged[existIdx],
        places: [...merged[existIdx].places, ...newPlaces],
        syncedAt: new Date().toISOString(),
      }
    } else if (newPlaces.length > 0) {
      merged.push({ ...inc, places: newPlaces })
    }
  }
  return { merged, newCount }
}

// ── Open in external maps (no API key needed) ────────────────
export function googleMapsLink(p: { name: string; googleMapsUrl?: string; address?: string }): string {
  if (p.googleMapsUrl) return p.googleMapsUrl
  const q = encodeURIComponent([p.name, p.address].filter(Boolean).join(' '))
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
export function appleMapsLink(p: { name: string; address?: string }): string {
  const q = encodeURIComponent([p.name, p.address].filter(Boolean).join(' '))
  return `https://maps.apple.com/?q=${q}`
}

// ── Export a list to CSV / GPX (for My Maps import) ──────────
export function listToCSV(list: GrazeList): string {
  const esc = (s = '') => `"${String(s).replace(/"/g, '""')}"`
  const rows = [['Name', 'Note', 'Visited', 'Google Maps URL'].join(',')]
  for (const p of list.places) {
    rows.push([
      esc(p.name), esc(p.userNote || ''),
      p.visited ? 'yes' : 'no', esc(p.googleMapsUrl || ''),
    ].join(','))
  }
  return rows.join('\n')
}
export function listToGPX(list: GrazeList): string {
  const esc = (s = '') => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c))
  const pts = list.places
    .filter(p => p.lat != null && p.lng != null)
    .map(p => `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${esc(p.name)}</name>${p.userNote ? `<desc>${esc(p.userNote)}</desc>` : ''}</wpt>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Graze" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(list.name)}</name></metadata>
${pts}
</gpx>`
}
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Formatting helpers ────────────────────────────────────────
export function priceStr(n?: number) { return '$'.repeat(n || 2) }
export function ratingStars(r?: number) {
  if (!r) return ''
  const f = Math.round(r)
  return '★'.repeat(f) + '☆'.repeat(5-f)
}
export function grazeScore(place: Place): number {
  let s = 0
  if (place.googleRating) s += place.googleRating * 0.35
  if (place.yelpRating)   s += place.yelpRating   * 0.25
  s += Math.min((place.verifiedSources?.length || 0) * 0.3, 1.5)
  if (place.isVegFriendly) s += 0.2
  return Math.round(s * 10) / 10
}
