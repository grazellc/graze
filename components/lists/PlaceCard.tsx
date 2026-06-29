'use client'
import { useState } from 'react'
import type { Place } from '@/types'
import { priceStr } from '@/lib/utils'

interface Props {
  place: Place
  rank: number
  visited?: boolean
  onClick: () => void
  stagger?: number
}

const FLAG_STYLE: Record<string, string> = {
  world: 'rgba(181,134,26,.92)',
  trending: 'rgba(200,65,26,.92)',
  veg: 'rgba(60,96,64,.92)',
  new: 'rgba(37,99,235,.85)',
  done: 'rgba(60,96,64,.88)',
}

export function PlaceCard({ place, rank, visited, onClick, stagger = 0 }: Props) {
  const [hovered, setHovered] = useState(false)
  const staggerClass = stagger < 8 ? `s${stagger + 1}` : ''

  const flag = place.worldRankLabel ? { label: place.worldRankLabel, type: 'world' } :
               place.isVegFriendly  ? { label: '🌿 Veg',           type: 'veg'   } : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`afu ${staggerClass}`}
      style={{
        background: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${hovered ? 'var(--paper3)' : 'transparent'}`,
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 14px 40px rgba(15,13,11,.11)' : 'none',
        transition: 'transform .28s ease, box-shadow .28s, border-color .2s',
        filter: visited && !hovered ? 'saturate(.3) brightness(.95)' : visited ? 'saturate(.65)' : 'none',
        position: 'relative',
      }}
    >
      {/* Image */}
      <div style={{ height: 126, position: 'relative', overflow: 'hidden', background: 'var(--paper2)', flexShrink: 0 }}>
        {place.photoUrl ? (
          <img
            src={place.photoUrl}
            alt={place.name}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.07)' : 'none',
              transition: 'transform .55s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: 'var(--paper2)' }}>
            🍽
          </div>
        )}

        {/* Rank badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 1,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(4px)',
          color: 'var(--ink)', fontSize: 10, fontWeight: 700,
          padding: '2px 7px', borderRadius: 5, fontFamily: 'Syne, sans-serif',
        }}>
          #{rank}
        </div>

        {/* Flag badge */}
        {flag && (
          <div style={{
            position: 'absolute', top: 8, right: 8, zIndex: 1,
            background: FLAG_STYLE[flag.type],
            color: '#fff', fontSize: 10, fontWeight: 600,
            padding: '2px 7px', borderRadius: 5, fontFamily: 'Syne, sans-serif',
          }}>
            {flag.label}
          </div>
        )}

        {/* Visited overlay */}
        {visited && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, zIndex: 1,
            background: 'rgba(60,96,64,.88)', color: '#fff',
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
            fontFamily: 'Syne, sans-serif',
          }}>
            ✓ visited
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '11px 13px 13px' }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 2, letterSpacing: -0.1, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {place.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8 }}>
          {place.city || place.address?.split(',')[0]} {place.priceLevel ? `· ${priceStr(place.priceLevel)}` : ''}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {place.isVegFriendly && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500, fontFamily: 'Syne, sans-serif', background: 'var(--sage-s)', color: 'var(--sage2)' }}>
              veg options
            </span>
          )}
          {place.cuisine?.[0] && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500, fontFamily: 'Syne, sans-serif', background: 'var(--warm-s)', color: 'var(--warm)' }}>
              {place.cuisine[0]}
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 8, borderTop: '1px solid var(--paper3)' }}>
          {place.googleRating && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
                {place.googleRating.toFixed(1)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--gold)' }}>★</span>
            </>
          )}
          {place.googleReviewCount && (
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {place.googleReviewCount > 1000
                ? `${(place.googleReviewCount/1000).toFixed(1)}k`
                : place.googleReviewCount}
            </span>
          )}
          {visited && (
            <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>
              ✓
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
