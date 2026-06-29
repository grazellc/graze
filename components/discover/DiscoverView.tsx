'use client'
import { useStore } from '@/store'
import type { Place, GrazeList } from '@/types'

interface Props {
  onPlaceClick: (p: Place, l: GrazeList) => void
}

const CITY_PHOTOS: Record<string, string> = {
  'New York':  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80',
  'Mumbai':    'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&q=80',
  'Tokyo':     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80',
  'London':    'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=600&q=80',
  'Paris':     'https://images.unsplash.com/photo-1499856374751-5ffd7e0a4f7b?w=600&q=80',
  'Bali':      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
  'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80',
  'Dubai':     'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
  'default':   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
}

export function DiscoverView({ onPlaceClick }: Props) {
  const { lists, setActiveList, setActiveView } = useStore()

  // Group lists by city
  const byCity = new Map<string, { lists: GrazeList[]; count: number }>()
  for (const list of lists) {
    const city = list.city || 'Other'
    const existing = byCity.get(city) || { lists: [], count: 0 }
    existing.lists.push(list)
    existing.count += list.places.length
    byCity.set(city, existing)
  }

  const cities = Array.from(byCity.entries())
    .sort((a, b) => b[1].count - a[1].count)

  const totalPlaces = lists.reduce((s,l) => s+l.places.length, 0)
  const totalCities = byCity.size

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 26 }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 300, fontStyle: 'italic', letterSpacing: -0.5, marginBottom: 4 }}>
        Discover
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 28 }}>
        {totalPlaces} places across {totalCities} cities — curated by your taste
      </div>

      {/* City grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 36 }}>
        {cities.map(([city, { lists: cityLists, count }]) => {
          const photo = CITY_PHOTOS[city] || CITY_PHOTOS.default
          const visited = cityLists.reduce((s,l) => s + l.places.filter(p => p.visited).length, 0)
          return (
            <div key={city}
              onClick={() => { setActiveList(cityLists[0].id); setActiveView('lists') }}
              style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/5', transition: 'transform .25s ease' }}
              className="afu"
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <img src={photo} alt={city} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.75),transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, zIndex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: '#fff', fontWeight: 400 }}>{city}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontFamily: 'Syne, sans-serif', marginTop: 2 }}>
                  {count} saved · {visited} visited
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'Syne, sans-serif', marginTop: 2 }}>
                  {cityLists.length} list{cityLists.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
