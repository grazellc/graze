'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import type { Place, GrazeList } from '@/types'
import { X, MapPin, CheckCircle, Star, Navigation, Phone, Globe, Clock } from 'lucide-react'
import { priceStr, ratingStars, googleMapsLink, appleMapsLink } from '@/lib/utils'

interface Props {
  place: Place
  list: GrazeList
  onClose: () => void
}

export function PlaceDetail({ place, list, onClose }: Props) {
  const { markVisited, updateNote } = useStore()
  const [note, setNote] = useState(place.userNote || '')
  const [isVisited, setIsVisited] = useState(place.visited)
  const [visible, setVisible] = useState(false)
  const [bgVisible, setBgVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => { setVisible(true); setBgVisible(true) })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() {
    setVisible(false); setBgVisible(false)
    setTimeout(onClose, 320)
  }

  function handleMarkVisited() {
    const v = !isVisited
    setIsVisited(v)
    markVisited(list.id, place.id, v)
  }

  function handleNoteBlur() {
    updateNote(list.id, place.id, note)
  }

  const user = useStore(s => s.user)

  const realSources = place.verifiedSources?.length
    ? place.verifiedSources.map(s => ({ emoji: s.emoji, name: s.name, rank: s.rank }))
    : []

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,13,11,.44)', backdropFilter: 'blur(4px)',
          zIndex: 50, opacity: bgVisible ? 1 : 0, transition: 'opacity .25s',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        width: 374, height: '100vh',
        background: '#fff', zIndex: 51,
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .32s cubic-bezier(.22,1,.36,1)',
        overflow: 'hidden',
        boxShadow: '-8px 0 40px rgba(0,0,0,.08)',
      }}>

        {/* Hero */}
        <div style={{ height: 200, position: 'relative', flexShrink: 0, overflow: 'hidden', background: 'var(--paper2)' }}>
          {place.photoUrl && (
            <img src={place.photoUrl} alt={place.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.5),transparent)' }} />
          <button onClick={handleClose} style={{
            position: 'absolute', top: 13, right: 13, zIndex: 2,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,.92)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink)', transition: 'background .12s',
          }}>
            <X size={13} />
          </button>
          {isVisited && (
            <div style={{ position: 'absolute', top: 13, left: 13, zIndex: 2, background: 'var(--sage)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 5, fontFamily: 'Syne, sans-serif' }}>
              ✓ Visited
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 13, left: 13, zIndex: 2, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 5, fontFamily: 'Syne, sans-serif' }}>
            {list.name}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', scrollbarWidth: 'thin', scrollbarColor: 'var(--paper3) transparent' }}>

          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 3, lineHeight: 1.2 }}>
            {place.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 4 }}>
            📍 {place.address || place.city}
          </div>
          {place.isOpenNow !== undefined && (
            <div style={{ fontSize: 12, color: place.isOpenNow ? 'var(--sage2)' : 'var(--warm)', fontWeight: 500, marginBottom: 16 }}>
              {place.isOpenNow ? 'Open now' : 'Closed'}
            </div>
          )}
          {!place.isOpenNow && (
            <div style={{ marginBottom: 16 }} />
          )}

          {/* Rating row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            {[
              { n: place.googleRating?.toFixed(1), label: 'Google', color: 'var(--warm)' },
              { n: place.yelpRating?.toFixed(1), label: 'Yelp', color: 'var(--warm)' },
              { n: place.priceLevel ? priceStr(place.priceLevel) : null, label: 'Price', color: 'var(--gold)' },
            ].filter(r => r.n).map((r, i, arr) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: i < arr.length-1 ? '1px solid var(--paper3)' : 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: r.color, lineHeight: 1 }}>{r.n}</div>
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif' }}>{r.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 22 }}>
            {[
              { label: 'Google Maps', icon: Navigation, primary: true, onClick: () => window.open(googleMapsLink(place), '_blank') },
              { label: 'Apple Maps', icon: MapPin, onClick: () => window.open(appleMapsLink(place), '_blank') },
              { label: isVisited ? 'Visited ✓' : 'Mark visited', icon: CheckCircle, done: isVisited, onClick: handleMarkVisited },
            ].map(({ label, icon: Icon, primary, done, onClick }) => (
              <button key={label} onClick={onClick} style={{
                padding: '9px 0', borderRadius: 10,
                border: `1.5px solid ${primary ? 'var(--warm)' : done ? 'rgba(60,96,64,.2)' : 'var(--paper3)'}`,
                background: primary ? 'var(--warm)' : done ? 'var(--sage-s)' : '#fff',
                color: primary ? '#fff' : done ? 'var(--sage)' : 'var(--ink3)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontFamily: 'inherit', transition: 'all .15s',
              }}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Menu — real data only (added during enrichment) */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 11, fontFamily: 'Syne, sans-serif' }}>
              Menu
            </div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '12px 14px', background: 'var(--paper2)', borderRadius: 10, fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.5 }}>
              <span>🍽️</span>
              <span>Menus & dishes show up here once this place is enriched with live details. Not pulled in yet.</span>
            </div>
          </div>

          {/* Cross-verified rankings — only if we actually have them */}
          {realSources.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 11, fontFamily: 'Syne, sans-serif' }}>
                Cross-verified from
              </div>
              {realSources.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: i < realSources.length-1 ? '1px solid var(--paper3)' : 'none', fontSize: 12.5 }}>
                  <span>{s.emoji}</span>
                  <span style={{ flex: 1, color: 'var(--ink2)' }}>{s.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--warm)', fontFamily: 'Syne, sans-serif', fontSize: 12 }}>{s.rank}</span>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: 11, fontFamily: 'Syne, sans-serif' }}>
              Your note
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Add a personal note…"
              style={{
                width: '100%', background: 'var(--paper2)',
                border: '1.5px solid var(--paper3)', borderRadius: 10,
                padding: '10px 12px', fontFamily: 'inherit', fontSize: 13,
                color: 'var(--ink)', outline: 'none', resize: 'none', height: 70,
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--ink3)'}
            />
          </div>

        </div>
      </div>
    </>
  )
}
