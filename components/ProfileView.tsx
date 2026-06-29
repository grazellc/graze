'use client'
import { useState } from 'react'
import { useStore } from '@/store'
import type { DietType } from '@/types'
import { Check, RefreshCw, MapPin, Star, Navigation } from 'lucide-react'

const DIET_OPTIONS: { id: DietType; label: string; emoji: string; desc: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🌿', desc: 'No meat or fish' },
  { id: 'vegan',      label: 'Vegan',      emoji: '🥦', desc: 'No animal products' },
  { id: 'eggetarian', label: 'Eggetarian', emoji: '🥚', desc: 'Vegetarian + eggs' },
  { id: 'jain',       label: 'Jain',       emoji: '🙏', desc: 'No root vegetables' },
  { id: 'nonveg',     label: 'Non-veg',    emoji: '🍖', desc: 'Everything' },
  { id: 'halal',      label: 'Halal',      emoji: '☪️', desc: 'Halal certified' },
  { id: 'kosher',     label: 'Kosher',     emoji: '✡️', desc: 'Kosher certified' },
  { id: 'all',        label: 'No filter',  emoji: '🌎', desc: 'Show everything' },
]

export function ProfileView({ onImport }: { onImport: () => void }) {
  const { user, lists, updateDiet } = useStore()
  const [selectedDiet, setSelectedDiet] = useState<DietType[]>(user?.diet || ['all'])
  const [saved, setSaved] = useState(false)
  const [syncInterval, setSyncInterval] = useState(90)

  const totalPlaces  = lists.reduce((s, l) => s + l.places.length, 0)
  const totalVisited = lists.reduce((s, l) => s + l.places.filter(p => p.visited).length, 0)
  const totalCities  = new Set(lists.map(l => l.city).filter(Boolean)).size

  function toggleDiet(d: DietType) {
    if (d === 'all') { setSelectedDiet(['all']); return }
    setSelectedDiet(prev => {
      const without = prev.filter(x => x !== 'all')
      return without.includes(d) ? without.filter(x => x !== d) || ['all'] : [...without, d]
    })
  }

  function saveDiet() {
    updateDiet(selectedDiet.length ? selectedDiet : ['all'])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 26 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--warm), var(--warm2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#fff',
        }}>G</div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 400, letterSpacing: -0.5 }}>My Graze</div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>
            {user?.email || 'Connect Google Maps to import your lists'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 32 }}>
        {[
          { n: totalPlaces,  label: 'Places saved', icon: MapPin,     color: 'var(--warm)' },
          { n: totalVisited, label: 'Visited',       icon: Check,      color: 'var(--sage)' },
          { n: totalCities,  label: 'Cities',         icon: Navigation, color: 'var(--gold)' },
        ].map(({ n, label, icon: Icon, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid var(--paper3)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={13} style={{ color }} />
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 300, letterSpacing: -1, color }}>{n}</div>
          </div>
        ))}
      </div>

      {/* Diet preferences */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', fontWeight: 400, letterSpacing: -0.3, marginBottom: 4 }}>
          Diet preferences
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16, lineHeight: 1.5 }}>
          Affects default menu tab, place filtering, and recommendations.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
          {DIET_OPTIONS.map(opt => {
            const isOn = selectedDiet.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => toggleDiet(opt.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                  border: `1.5px solid ${isOn ? 'var(--warm)' : 'var(--paper3)'}`,
                  background: isOn ? 'var(--warm-s)' : '#fff',
                  fontFamily: 'inherit', transition: 'all .15s', textAlign: 'left',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{opt.desc}</div>
                </div>
                {isOn && <Check size={13} style={{ color: 'var(--warm)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
        <button onClick={saveDiet} style={{
          padding: '10px 20px', background: saved ? 'var(--sage)' : 'var(--ink)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background .25s', display: 'flex', alignItems: 'center', gap: 7,
        }}>
          {saved ? <><Check size={13} /> Saved!</> : 'Save preferences'}
        </button>
      </div>

      {/* Sync settings */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', fontWeight: 400, letterSpacing: -0.3, marginBottom: 4 }}>
          Sync settings
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>
          We'll remind you to re-sync when you've added new places to Google Maps.
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--paper3)', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Remind me every</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[30, 60, 90, 180].map(days => (
              <button key={days} onClick={() => setSyncInterval(days)}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${syncInterval === days ? 'var(--ink)' : 'var(--paper3)'}`,
                  background: syncInterval === days ? 'var(--ink)' : '#fff',
                  color: syncInterval === days ? '#fff' : 'var(--ink3)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  transition: 'all .15s',
                }}>
                {days}d
              </button>
            ))}
            <button onClick={() => setSyncInterval(0)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${syncInterval === 0 ? 'var(--ink)' : 'var(--paper3)'}`,
                background: syncInterval === 0 ? 'var(--ink)' : '#fff',
                color: syncInterval === 0 ? '#fff' : 'var(--ink3)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                transition: 'all .15s',
              }}>Never</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onImport} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: 'var(--ink)', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <RefreshCw size={13} /> Sync now
          </button>
          {user?.lastSyncedAt && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--ink4)' }}>
              Last synced {new Date(user.lastSyncedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Lists overview */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontStyle: 'italic', fontWeight: 400, letterSpacing: -0.3, marginBottom: 14 }}>
          Your lists
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lists.map(list => {
            const visited = list.places.filter(p => p.visited).length
            const pct = list.places.length ? (visited / list.places.length) * 100 : 0
            return (
              <div key={list.id} style={{ background: '#fff', border: '1px solid var(--paper3)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: pct > 0 ? 8 : 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: list.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{list.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif' }}>
                    {visited}/{list.places.length} visited
                  </span>
                </div>
                {pct > 0 && (
                  <div style={{ height: 2, background: 'var(--paper3)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: list.color, borderRadius: 1 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* About */}
      <div style={{ borderTop: '1px solid var(--paper3)', paddingTop: 24, fontSize: 12, color: 'var(--ink4)', lineHeight: 1.8 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink3)', marginBottom: 8 }}>Graze v1.0</div>
        <div>Data Portability API · Google Places API · Yelp Fusion</div>
        <div>Your data stays on your device. We never sell it.</div>
        <div style={{ marginTop: 8 }}>
          <a href="mailto:hello@graze.app" style={{ color: 'var(--warm)', textDecoration: 'none' }}>Contact</a>
          {' · '}
          <a href="#" style={{ color: 'var(--warm)', textDecoration: 'none' }}>Privacy</a>
        </div>
      </div>
    </div>
  )
}
