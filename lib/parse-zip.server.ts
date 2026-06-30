import AdmZip from 'adm-zip'
import type { GrazeList, ImportSource } from '@/types'
import { parseCSVToPlaces, parseDPGeoJSON, colorForName, detectCity } from './utils'

export async function parseZipBuffer(
  buffer: Buffer,
  source: ImportSource
): Promise<{ lists: GrazeList[]; skipped: string[] }> {
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
    return n.endsWith('.json') && (n.includes('saved') || n.includes('maps'))
  })

  for (const entry of csvEntries) {
    const filename = entry.name
    const listName = filename.replace(/\.csv$/i, '')
    try {
      const content = entry.getData().toString('utf-8')
      const places = parseCSVToPlaces(listName, content, source)
      if (!places.length) { skipped.push(filename); continue }
      lists.push({
        id: crypto.randomUUID(),
        name: listName,
        color: colorForName(listName),
        places,
        sourceFile: filename,
        source,
        createdAt: new Date().toISOString(),
        city: detectCity(listName),
      })
    } catch { skipped.push(filename) }
  }

  for (const entry of geojsonEntries) {
    try {
      const content = JSON.parse(entry.getData().toString('utf-8'))
      const listName = entry.name.replace(/\.json$/i,'').replace(/_/g,' ')
      const places = parseDPGeoJSON(listName, content, source)
      if (!places.length) continue
      lists.push({
        id: crypto.randomUUID(),
        name: listName,
        color: colorForName(listName),
        places,
        sourceFile: entry.name,
        source,
        createdAt: new Date().toISOString(),
      })
    } catch { skipped.push(entry.name) }
  }

  lists.sort((a,b) => b.places.length - a.places.length || a.name.localeCompare(b.name))
  return { lists, skipped }
}
