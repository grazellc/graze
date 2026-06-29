'use client'
import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'
import type { GrazeList, Place } from '@/types'
import { makeHash, colorForName } from '@/lib/utils'
import { Search, X, Plus, MapPin, Check } from 'lucide-react'

interface Props {
  onClose: () => void
  defaultListId?: string
}

interface SearchResult {
  placeId: string
  name: string
  address: string
  lat?: number
  lng?: number
  photoUrl?: string
  rating?: number
  priceLevel?: number
}

// Mock search results — in production these come from Google Places Autocomplete API
const MOCK_RESULTS: SearchResult[] = [
  { placeId: 'ChIJ1', name: 'Roberta\'s Pizza', address: 'Bushwick, Brooklyn, NY', lat: 40.7051, lng: -73.9334, rating: 4.8, priceLevel: 2 },
  { placeId: 'ChIJ2', name: 'Lucali', address: 'Carroll Gardens, Brooklyn, NY', lat: 40.6782, lng: -73.9956, rating: 4.9, priceLevel: 3 },
  { placeId: 'ChIJ3', name: 'Di Fara Pizza', address: 'Midwood, Brooklyn, NY', lat: 40.6248, lng: -73.9613, rating: 4.7, priceLevel: 2 },
  { placeId: 'ChIJ4', name: 'Motorino', address: 'East Village, New York, NY', lat: 40.7265, lng: -73.9870, rating: 4.6, priceLevel: 2 },
  { placeId: 'ChIJ5', name: 'Una Pizza Napoletana', address: 'Lower East Side, New York, NY', lat: 40.7185, lng: -73.9876, rating: 4.9, priceLevel: 3 },
]

export function AddPlaceModal({ onClose, defaultListId }: Props) {
  const { lists, activeListId, createList, addPlaceToList } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [targetListId, setTargetListId] = useState(defaultListId || activeListId || lists[0]?.id)
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [added, setAdded] = useState(false)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Simulate Places Autocomplete search
  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    // In production: fetch(`/api/places/search?q=${encodeURIComponent(q)}`)
    await new Promise(r => setTimeout(r, 300))
    const filtered = MOCK_RESULTS.filter(r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.address.toLowerCase().includes(q.toLowerCase())
    )
    setResults(filtered.length ? filtered : MOCK_RESULTS.slice(0, 4))
    setSearching(false)
  }

  function onQueryChange(q: string) {
    setQuery(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(q), 200)
  }

  function handleSelect(r: SearchResult) {
    setSelected(r)
    setQuery(r.name)
    setResults([])
  }

  function handleAdd() {
    if (!selected) return
    let listId = targetListId

    // Create new list if needed
    if (showNewList && newListName.trim()) {
      listId = createList(newListName.trim(), colorForName(newListName.trim()))
    }

    if (!listId) return

    const place: Place = {
      id: crypto.randomUUID(),
      listId,
      name: selected.name,
      address: selected.address,
      city: selected.address.split(',').slice(-2, -1)[0]?.trim(),
      lat: selected.lat,
      lng: selected.lng,
      googlePlaceId: selected.placeId,
      visited: false,
      enriched: false,
      source: 'manual',
      sourceHash: makeHash('manual', selected.name, selected.placeId),
      addedAt: new Date().toISOString(),
      googleRating: selected.rating,
      priceLevel: selected.priceLevel,
    }

    addPlaceToList(listId, place)
    setAdded(true)
    setTimeout(onClose, 1200)
  }

  const targetList = lists.find(l => l.id === targetListId)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,13,11,.6)', backdropFilter: 'blur(8px)',
      zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 80,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: 500,
        boxShadow: '0 24px 64px rgba(15,13,11,.2)',
        animation: 'fadeUp .3s cubic-bezier(.34,1.56,.64,1) both',
        overflow: 'hidden',
      }}>

        {/* Search header */}
        <div style={{ padding: '18px 18px 0', borderBottom: '1px solid var(--paper3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Search size={16} style={{ color: 'var(--ink4)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for a restaurant, café, bar…"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 15, fontFamily: 'inherit', color: 'var(--ink)',
              }}
            />
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink4)', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>

          {/* Results dropdown */}
          {results.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {results.map(r => (
                <button key={r.placeId} onClick={() => handleSelect(r)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 8px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left', borderRadius: 8,
                    transition: 'background .12s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: 'var(--paper2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <MapPin size={14} style={{ color: 'var(--ink3)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{r.address}</div>
                  </div>
                  {r.rating && (
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                      ★ {r.rating}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom panel — appears after selecting a place */}
        {selected && !added && (
          <div style={{ padding: 18 }}>
            {/* Selected place */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 12px', background: 'var(--paper2)', borderRadius: 10 }}>
              <MapPin size={14} style={{ color: 'var(--warm)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{selected.address}</div>
              </div>
            </div>

            {/* Add to list */}
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', marginBottom: 10 }}>
              Add to list
            </div>

            {!showNewList ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
                  {lists.map(list => (
                    <button key={list.id} onClick={() => setTargetListId(list.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${targetListId === list.id ? 'var(--warm)' : 'var(--paper3)'}`,
                        background: targetListId === list.id ? 'var(--warm-s)' : '#fff',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: list.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, textAlign: 'left' }}>{list.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif' }}>{list.places.length}</span>
                      {targetListId === list.id && <Check size={13} style={{ color: 'var(--warm)', flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowNewList(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink3)', fontFamily: 'inherit', padding: '6px 0', marginBottom: 14 }}>
                  <Plus size={13} /> Create new list
                </button>
              </>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="List name e.g. Tokyo Must Try"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid var(--paper3)',
                    borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', marginBottom: 8, color: 'var(--ink)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--ink3)'}
                  onBlur={e => e.target.style.borderColor = 'var(--paper3)'}
                />
                <button onClick={() => setShowNewList(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink4)', fontFamily: 'inherit' }}>
                  ← Pick existing list
                </button>
              </div>
            )}

            <button onClick={handleAdd}
              disabled={!selected || (!targetListId && !newListName.trim())}
              style={{
                width: '100%', padding: 12, background: 'var(--warm)', color: '#fff',
                border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', opacity: (!targetListId && !newListName.trim()) ? 0.5 : 1,
              }}>
              Add to {showNewList ? (newListName || 'new list') : (targetList?.name || 'list')}
            </button>
          </div>
        )}

        {/* Added confirmation */}
        {added && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Check size={32} style={{ color: 'var(--sage)', marginBottom: 10 }} />
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', fontWeight: 400, marginBottom: 4 }}>
              Added to {targetList?.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
              We're enriching it with photos and ratings
            </div>
          </div>
        )}

        {/* Empty / prompt state */}
        {!selected && !results.length && !query && (
          <div style={{ padding: '14px 18px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 10, fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Or add from a Google Maps link
            </div>
            <input
              type="text"
              placeholder="Paste a maps.app.goo.gl/… link"
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid var(--paper3)',
                borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--ink)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--ink3)'}
              onBlur={e => e.target.style.borderColor = 'var(--paper3)'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
