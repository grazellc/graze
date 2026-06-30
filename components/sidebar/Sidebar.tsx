'use client'
import { useState } from 'react'
import { useStore } from '@/store'
import { Grid3X3, MapPin, Compass, User, Plus, RefreshCw, Search } from 'lucide-react'

interface Props { onImport: () => void }

export function Sidebar({ onImport }: Props) {
  const { lists, activeListId, activeView, setActiveList, setActiveView } = useStore()
  const [q, setQ] = useState('')
  const shown = q.trim() ? lists.filter(l => l.name.toLowerCase().includes(q.trim().toLowerCase())) : lists
  const totalPlaces = lists.reduce((s, l) => s + l.places.length, 0)
  const totalVisited = lists.reduce((s, l) => s + l.places.filter(p => p.visited).length, 0)

  const navItems = [
    { id: 'lists'    as const, label: 'My Lists', icon: Grid3X3, badge: lists.length || undefined },
    { id: 'map'      as const, label: 'Map View', icon: MapPin },
    { id: 'discover' as const, label: 'Discover', icon: Compass },
    { id: 'profile'  as const, label: 'Profile',  icon: User },
  ]

  return (
    <aside style={{
      background: '#fff', borderRight: '1px solid var(--paper3)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 18px 16px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(145deg,#1a120a,#3d2010)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 18 18" fill="none" width={16} height={16}>
            <path d="M5 2v4c0 1.1.9 2 2 2v8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M9 2v14" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M13 2v4c0 1.1-.9 2-2 2v8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, letterSpacing: -0.4 }}>
            Gr<em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>aze</em>
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Your places, everywhere</div>
        </div>
      </div>

      {/* Import CTA (shown when no lists) */}
      {lists.length === 0 && (
        <button onClick={onImport} style={{
          margin: '0 10px 14px', background: 'var(--ink)',
          borderRadius: 12, padding: 14, cursor: 'pointer',
          border: 'none', textAlign: 'left', position: 'relative', overflow: 'hidden',
          transition: 'opacity .15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.92')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
            }}>🗺</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              Import your Google Maps lists
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, marginBottom: 10 }}>
            Sign in with Google — we pull all your saved lists automatically.
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fff', borderRadius: 6, padding: '5px 11px',
            fontSize: 11, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'Syne, sans-serif',
          }}>
            Get started →
          </div>
        </button>
      )}

      {/* Nav */}
      <nav style={{ padding: '0 10px', marginBottom: 6 }}>
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button key={id}
            onClick={() => { setActiveView(id); if (id !== 'lists') setActiveList(null) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: activeView === id && !activeListId ? 'var(--paper2)' : 'transparent',
              color: activeView === id && !activeListId ? 'var(--ink)' : 'var(--ink3)',
              fontSize: 13.5, textAlign: 'left', transition: 'all .12s',
              fontFamily: 'inherit', fontWeight: activeView === id && !activeListId ? 500 : 400,
            }}
            onMouseEnter={e => { if (!(activeView === id && !activeListId)) e.currentTarget.style.background = 'var(--paper)' }}
            onMouseLeave={e => { if (!(activeView === id && !activeListId)) e.currentTarget.style.background = 'transparent' }}
          >
            <Icon size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && <span style={{ fontSize: 10, color: 'var(--ink5)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>{badge}</span>}
          </button>
        ))}
      </nav>

      <div style={{ height: 1, background: 'var(--paper3)', margin: '4px 18px' }} />

      {/* Lists */}
      {lists.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 5px' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink4)', fontFamily: 'Syne, sans-serif' }}>
              Lists
            </span>
            <button onClick={onImport}
              style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontWeight: 600, padding: '2px 4px' }}
              title="Sync / import more lists"
            >
              <RefreshCw size={11} /> Sync
            </button>
          </div>
          {lists.length > 8 && (
            <div style={{ padding: '2px 16px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--paper2)', borderRadius: 8, padding: '6px 10px' }}>
                <Search size={12} style={{ color: 'var(--ink4)', flexShrink: 0 }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search lists…"
                  style={{ border: 'none', outline: 'none', background: 'none', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)', width: '100%' }} />
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 8px', scrollbarWidth: 'none' }}>
            {shown.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink4)', padding: '10px 12px' }}>No lists match “{q}”.</div>
            )}
            {shown.map(list => {
              const isActive = activeListId === list.id
              const visited = list.places.filter(p => p.visited).length
              return (
                <button key={list.id}
                  onClick={() => { setActiveList(list.id); setActiveView('lists') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: isActive ? 'var(--paper2)' : 'transparent',
                    color: isActive ? 'var(--ink)' : 'var(--ink3)',
                    fontSize: 13, textAlign: 'left', transition: 'all .12s',
                    fontFamily: 'inherit', fontWeight: isActive ? 500 : 400,
                    marginBottom: 1,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--paper)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: list.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {list.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ink5)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                    {list.places.length}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Profile footer */}
      <div style={{
        borderTop: '1px solid var(--paper3)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        transition: 'background .12s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--paper2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,var(--warm),var(--warm2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>G</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>My Graze</div>
          <div style={{ fontSize: 11, color: 'var(--sage2)', fontFamily: 'Syne, sans-serif', fontWeight: 600, marginTop: 1 }}>
            {totalPlaces} places · {totalVisited} visited
          </div>
        </div>
      </div>
    </aside>
  )
}
