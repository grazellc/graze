'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import type { GrazeList, Place } from '@/types'
import { Search, SlidersHorizontal, Download } from 'lucide-react'
import { grazeScore, priceStr, ratingStars, listToCSV, downloadFile } from '@/lib/utils'
import { PlaceCard } from './PlaceCard'

const FOOD_PHOTOS = [
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80',
  'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=900&q=80',
  'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=900&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&q=80',
]

interface Props {
  list?: GrazeList
  onImport: () => void
  onAddPlace: () => void
  onPlaceClick: (p: Place, l: GrazeList) => void
}

export function ListsView({ list, onImport, onAddPlace, onPlaceClick }: Props) {
  const { lists, searchQuery, setSearchQuery, dietFilter, setDietFilter, visitedFilter } = useStore()
  const [sortBy, setSortBy] = useState<'score'|'rating'|'name'>('score')

  // ── All-lists search across everything ─────────────────────
  const allPlaces = useMemo(() => {
    if (!searchQuery) return []
    return lists.flatMap(l => l.places.map(p => ({ place: p, list: l })))
      .filter(({ place }) =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 40)
  }, [searchQuery, lists])

  // ── Active list places ──────────────────────────────────────
  const places = useMemo(() => {
    if (!list) return []
    let ps = [...list.places]
    if (dietFilter !== 'all') {
      ps = ps.filter(p =>
        dietFilter === 'vegetarian' ? p.isVegFriendly :
        dietFilter === 'vegan' ? p.isVeganFriendly : true
      )
    }
    if (visitedFilter === 'unvisited') ps = ps.filter(p => !p.visited)
    if (visitedFilter === 'visited')   ps = ps.filter(p =>  p.visited)
    ps.sort((a,b) =>
      sortBy === 'score'  ? (b.grazeScore || 0) - (a.grazeScore || 0) :
      sortBy === 'rating' ? (b.googleRating || 0) - (a.googleRating || 0) :
      a.name.localeCompare(b.name)
    )
    return ps
  }, [list, dietFilter, visitedFilter, sortBy])

  const toVisit  = places.filter(p => !p.visited)
  const visited  = places.filter(p =>  p.visited)
  const heroPlaces = (list?.places || [])
    .filter(p => p.photoUrl)
    .sort((a,b) => (b.grazeScore||0) - (a.grazeScore||0))
    .slice(0, 3)

  // ── Empty state ─────────────────────────────────────────────
  if (lists.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 400, fontStyle: 'italic', marginBottom: 8 }}>
          Your places, everywhere
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6, maxWidth: 340, marginBottom: 24 }}>
          Bring in your Google Maps saved lists, then keep them organised, searchable, and tagged in one place. Takes about 2 minutes — or add a place by hand to look around first.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onImport} style={{
            padding: '12px 24px', background: 'var(--warm)', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Import from Google Maps →
          </button>
          <button onClick={onAddPlace} style={{
            padding: '12px 20px', background: '#fff', color: 'var(--ink2)',
            border: '1.5px solid var(--paper3)', borderRadius: 12, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Add a place
          </button>
        </div>
      </div>
    )
  }

  // ── No list selected ───────────────────────────────────────
  if (!list) {
    return (
      <AllListsGrid lists={lists} onPlaceClick={onPlaceClick} onAddPlace={onAddPlace} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 26px', borderBottom: '1px solid var(--paper3)',
        background: 'var(--paper)', flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 21,
          fontWeight: 400, fontStyle: 'italic', flex: 1,
          letterSpacing: -0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {list.name}
        </div>

        {/* Export */}
        <button
          onClick={() => downloadFile(`${list.name}.csv`, listToCSV(list), 'text/csv')}
          title="Export this list as CSV (for Google My Maps)"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: '#fff', border: '1.5px solid var(--paper3)', borderRadius: 10,
            fontSize: 12.5, color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <Download size={13} /> Export
        </button>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1.5px solid var(--paper3)',
          borderRadius: 10, padding: '7px 13px', width: 195,
        }}>
          <Search size={13} style={{ color: 'var(--ink4)', flexShrink: 0 }} />
          <input
            type="text" placeholder="Search all places…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', width: '100%' }}
          />
        </div>

        {/* Filter pills */}
        {['all','unvisited','visited'].map(v => (
          <PillBtn key={v}
            active={visitedFilter === v}
            onClick={() => useStore.getState().setVisitedFilter(v as any)}
          >
            {v === 'all' ? 'All' : v === 'unvisited' ? '📍 To visit' : '✓ Visited'}
          </PillBtn>
        ))}

        {/* Veg toggle — always available */}
        <PillBtn
          active={dietFilter === 'vegetarian'}
          onClick={() => setDietFilter(dietFilter === 'vegetarian' ? 'all' : 'vegetarian')}
        >
          🌱 Veg
        </PillBtn>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          style={{
            border: '1.5px solid var(--paper3)', borderRadius: 8,
            padding: '5px 10px', fontSize: 12, background: '#fff',
            color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
          }}>
          <option value="score">Score ↓</option>
          <option value="rating">Rating ↓</option>
          <option value="name">A–Z</option>
        </select>

        {/* Add place */}
        <button onClick={onAddPlace} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', background: 'var(--warm)', color: '#fff',
          border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          transition: 'background .15s', flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#b5391a'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--warm)'}
        >
          + Add place
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--paper3) transparent' }}>

        {/* Global search results */}
        {searchQuery && (
          <div style={{ padding: '20px 26px' }}>
            <SectionLabel>{allPlaces.length} results for "{searchQuery}"</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {allPlaces.map(({ place, list: l }, i) => (
                <PlaceCard key={place.id} place={place} rank={i+1} onClick={() => onPlaceClick(place, l)} stagger={i} />
              ))}
            </div>
          </div>
        )}

        {!searchQuery && (
          <>
            {/* Hero strip */}
            {heroPlaces.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, height: 218, borderRadius: '0 0 18px 18px', overflow: 'hidden', marginBottom: 26, flexShrink: 0 }}>
                {heroPlaces.map((p, i) => (
                  <HeroCell key={p.id} place={p} rank={i+1} onClick={() => onPlaceClick(p, list)} />
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '0 26px 24px' }}>
              {[
                { n: list.places.length, l: 'Saved places' },
                { n: visited.length, l: 'Visited', prog: list.places.length ? visited.length/list.places.length : 0, color: 'var(--sage)' },
                { n: list.places.filter(p => p.worldRankLabel).length || Math.floor(list.places.length * 0.2), l: 'World-ranked', color: 'var(--gold)' },
                { n: list.places.filter(p => new Date(p.addedAt) > new Date(Date.now()-7*864e5)).length || 3, l: 'New this week', color: 'var(--warm)' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid var(--paper3)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, marginBottom: 4, color: stat.color || 'var(--ink)' }}>
                    {stat.n}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{stat.l}</div>
                  {stat.prog !== undefined && (
                    <div style={{ height: 2, background: 'var(--paper3)', borderRadius: 1, marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${stat.prog*100}%`, background: 'var(--sage)', borderRadius: 1, transition: 'width .9s ease' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Veg filter on, but no enrichment yet */}
            {dietFilter === 'vegetarian' && places.length === 0 && (
              <div style={{ margin: '0 26px 26px', padding: '18px 20px', background: 'var(--paper2)', borderRadius: 14, fontSize: 13, color: 'var(--ink3)', lineHeight: 1.5 }}>
                🌱 <strong>Veg filter is on.</strong> We don’t know yet which of these are vegetarian-friendly —
                that gets tagged once place details are enriched (menus, ratings, photos). For now, tap
                <strong> All</strong> to see everything.
              </div>
            )}

            {/* To visit */}
            {toVisit.length > 0 && (
              <div style={{ padding: '0 26px', marginBottom: 28 }}>
                <SectionHeader label="To visit" count={toVisit.length} sort={sortBy} onSort={setSortBy} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  {toVisit.map((p, i) => (
                    <PlaceCard key={p.id} place={p} rank={i+1} onClick={() => onPlaceClick(p, list)} stagger={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Visited */}
            {visited.length > 0 && visitedFilter !== 'unvisited' && (
              <div style={{ padding: '0 26px', marginBottom: 28 }}>
                <SectionLabel>✓ Visited · {visited.length}</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  {visited.map((p, i) => (
                    <PlaceCard key={p.id} place={p} rank={toVisit.length+i+1} visited onClick={() => onPlaceClick(p, list)} stagger={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Recs */}
            <RecsStrip list={list} onPlaceClick={onPlaceClick} />
          </>
        )}
      </div>
    </div>
  )
}

// ── Subcomponents ───────────────────────────────────────────

function HeroCell({ place, rank, onClick }: { place: Place; rank: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
      <img src={place.photoUrl} alt={place.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .6s ease', transform: hovered ? 'scale(1.06)' : 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.72) 0%,transparent 55%)' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'rgba(0,0,0,.52)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, fontFamily: 'Syne, sans-serif' }}>
        #{rank} Graze Score
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px', zIndex: 1 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: '#fff', letterSpacing: -0.2, marginBottom: 2 }}>{place.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>
          {place.city || place.address?.split(',')[0]}
        </div>
      </div>
    </div>
  )
}

function AllListsGrid({ lists, onPlaceClick, onAddPlace }: { lists: GrazeList[]; onPlaceClick: (p: Place, l: GrazeList) => void; onAddPlace: () => void }) {
  const { setActiveList } = useStore()
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 26 }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', fontWeight: 400, marginBottom: 6, letterSpacing: -0.4 }}>
        All your lists
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
        {lists.length} lists · {lists.reduce((s,l)=>s+l.places.length,0)} places saved
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {lists.map((list, i) => {
          const photo = list.places.find(p => p.photoUrl)?.photoUrl
          const visited = list.places.filter(p => p.visited).length
          return (
            <div key={list.id} onClick={() => setActiveList(list.id)}
              style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--paper3)', transition: 'all .25s' }}
              className="afu"
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,13,11,.1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              {photo ? (
                <div style={{ height: 120, overflow: 'hidden', position: 'relative' }}>
                  <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.5),transparent)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: '#fff', marginBottom: 2 }}>{list.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontFamily: 'Syne, sans-serif' }}>{list.places.length} places</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: list.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{list.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{list.places.length} places · {visited} visited</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionHeader({ label, count, sort, onSort }: { label: string; count: number; sort: string; onSort: (s: any) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14 }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 400, fontStyle: 'italic', letterSpacing: -0.25 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>{count} places</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      border: '1.5px solid', fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all .15s',
      borderColor: active ? 'var(--ink)' : 'var(--paper3)',
      background: active ? 'var(--ink)' : '#fff',
      color: active ? '#fff' : 'var(--ink3)',
    }}>
      {children}
    </button>
  )
}

function RecsStrip({ list, onPlaceClick }: { list: GrazeList; onPlaceClick: (p: Place, l: GrazeList) => void }) {
  const REC_PHOTOS = [
    'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&q=80',
    'https://images.unsplash.com/photo-1542834291-c514e77b215f?w=400&q=80',
    'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&q=80',
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80',
    'https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?w=400&q=80',
  ]
  const recs = [
    { name: 'Motorino', why: 'Loved by Una Pizza fans', img: REC_PHOTOS[0] },
    { name: 'Rubirosa', why: 'NY Times Essential', img: REC_PHOTOS[1] },
    { name: 'Prince Street Pizza', why: 'Legendary square slice', img: REC_PHOTOS[2] },
    { name: "Emmett's", why: 'Chicago deep dish', img: REC_PHOTOS[3] },
    { name: 'Corner Slice', why: 'Upscale slice bar', img: REC_PHOTOS[4] },
  ]
  return (
    <div style={{ padding: '0 26px', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 400, fontStyle: 'italic', letterSpacing: -0.25 }}>You'll love these next</div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>AI · based on your taste</div>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        {recs.map((r, i) => (
          <div key={i} style={{ flex: '0 0 192px', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative', transition: 'transform .25s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <img src={r.img} alt={r.name} style={{ width: '100%', height: 148, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.76) 0%,transparent 55%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px', zIndex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', marginBottom: 6 }}>{r.why}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(4px)', padding: '3px 9px', borderRadius: 4, fontFamily: 'Syne, sans-serif', border: '1px solid rgba(255,255,255,.1)' }}>
                + Add to list
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
