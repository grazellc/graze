'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/store'
import { diffLists } from '@/lib/utils'
import { buildDPAuthUrl } from '@/lib/data-portability'
import type { GrazeList } from '@/types'
import { X, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface Props { onClose: () => void }

type Step = 'choose' | 'google-loading' | 'zip-pick' | 'zip-preview' | 'importing' | 'done' | 'error'

const PHASES = [
  { pct: 0,  label: 'Connecting to Google…' },
  { pct: 8,  label: 'Reading your saved lists…' },
  { pct: 22, label: 'Downloading your places…' },
  { pct: 40, label: 'Fetching photos & ratings…' },
  { pct: 60, label: 'Cross-checking top lists…' },
  { pct: 78, label: 'Building recommendations…' },
  { pct: 90, label: 'Almost there…' },
]

export function ImportModal({ onClose }: Props) {
  const { lists, mergeLists, setImportJob, importJob } = useStore()
  const [step, setStep] = useState<Step>('choose')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [foundLists, setFoundLists] = useState<GrazeList[]>([])
  const [newCount, setNewCount] = useState(0)
  const [error, setError] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)

  // ── Google OAuth path ─────────────────────────────────────
  function handleGoogleConnect() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      // Dev mode — simulate import
      simulateImport()
      return
    }
    const url = buildDPAuthUrl(
      clientId,
      `${window.location.origin}/api/auth/dp-callback`,
      crypto.randomUUID()
    )
    window.location.href = url
  }

  async function simulateImport() {
    setStep('importing')
    setProgress(0)
    // Simulate the progress ticking up
    const total = 190
    let done = 0
    timerRef.current = setInterval(() => {
      done = Math.min(done + Math.ceil(Math.random() * 5 + 2), total)
      const pct = Math.round(done / total * 100)
      setProgress(pct)
      const ph = [...PHASES].reverse().find(p => pct >= p.pct)
      if (ph) setPhase(ph.label)
      if (done >= total) {
        clearInterval(timerRef.current)
        finishImport(DEMO_LISTS, 190)
      }
    }, 220)
  }

  function finishImport(incoming: GrazeList[], count: number) {
    const added = mergeLists(incoming)
    setFoundLists(incoming)
    setNewCount(added)
    setProgress(100)
    setStep('done')
  }

  // ── ZIP path ──────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.zip')) handleZipSelected(file)
    else setError('Please drop a .zip file')
  }

  function handleZipSelected(file: File) {
    setZipFile(file)
    setStep('zip-preview')
  }

  async function uploadZip() {
    if (!zipFile) return
    setStep('importing')
    setProgress(0)
    setPhase('Uploading ZIP…')

    // Animate progress while uploading
    let fakeProgress = 0
    timerRef.current = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 3, 85)
      setProgress(fakeProgress)
      const ph = [...PHASES].reverse().find(p => fakeProgress >= p.pct)
      if (ph) setPhase(ph.label)
    }, 300)

    try {
      const fd = new FormData()
      fd.append('file', zipFile)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      clearInterval(timerRef.current)

      if (!res.ok) { setError(data.error || 'Import failed'); setStep('error'); return }
      finishImport(data.lists, data.totalPlaces)
    } catch (err: any) {
      clearInterval(timerRef.current)
      setError(err.message)
      setStep('error')
    }
  }

  // ── Render ────────────────────────────────────────────────
  const isExistingUser = lists.length > 0

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,13,11,.65)', backdropFilter: 'blur(10px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 22, width: 480,
        boxShadow: '0 32px 80px rgba(15,13,11,.22)',
        overflow: 'hidden',
        animation: 'fadeUp .35s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        {/* Photo collage header */}
        <div style={{
          height: 140, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg,#1c110a,#3a2215)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {DEMO_PHOTOS.map((src, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: 12, overflow: 'hidden',
              border: '3px solid rgba(255,255,255,.08)',
              boxShadow: '0 8px 28px rgba(0,0,0,.45)',
              width: i === 1 ? 96 : 76, height: i === 1 ? 96 : 76,
              left: i === 0 ? 72 : i === 1 ? 152 : undefined,
              right: i === 2 ? 72 : undefined,
              top: i === 1 ? 16 : 30,
              zIndex: i === 1 ? 2 : 1,
              transform: i === 0 ? 'rotate(-8deg) scale(.95)' : i === 2 ? 'rotate(8deg) scale(.95)' : undefined,
            }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,.15)', border: 'none',
            cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 26 }}>

          {/* CHOOSE */}
          {step === 'choose' && (
            <>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 6 }}>
                {isExistingUser ? 'Sync your Google Maps lists' : 'Import your Google Maps lists'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 20 }}>
                {isExistingUser
                  ? 'Re-connect to pull any new places you\'ve saved since your last sync.'
                  : 'All your saved lists come in automatically — sign in with Google and we handle the rest.'}
              </div>

              {/* Primary: Google OAuth */}
              <button onClick={handleGoogleConnect} style={{
                width: '100%', padding: 13, background: 'var(--ink)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: 'inherit', marginBottom: 12, transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--warm)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ink)'}
              >
                <GoogleIcon />
                Connect Google Maps
              </button>

              {/* What happens */}
              <div style={{ background: 'var(--paper2)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  ['✓', 'We request read-only access to your saved places & lists'],
                  ['✓', 'All lists import automatically — no files, no copy-pasting'],
                  ['✓', 'New places sync with one click — existing notes preserved'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink3)' }}>
                    <span style={{ color: 'var(--sage)', flexShrink: 0 }}>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--paper3)' }} />
                <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontWeight: 500 }}>OR IMPORT MANUALLY</span>
                <div style={{ flex: 1, height: 1, background: 'var(--paper3)' }} />
              </div>

              {/* Backup: ZIP upload */}
              <button onClick={() => setStep('zip-pick')} style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px dashed var(--paper3)', borderRadius: 12,
                background: 'var(--paper2)', cursor: 'pointer', color: 'var(--ink3)',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'inherit', transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink4)'; e.currentTarget.style.color = 'var(--ink)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--paper3)'; e.currentTarget.style.color = 'var(--ink3)' }}
              >
                <Upload size={14} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>Upload Google Takeout ZIP</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>For power users — exports all lists at once from takeout.google.com</div>
                </div>
              </button>
            </>
          )}

          {/* ZIP PICK */}
          {step === 'zip-pick' && (
            <>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 6 }}>
                Drop your Takeout ZIP
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 18 }}>
                Go to <strong>takeout.google.com</strong> → select only "Saved" → download ZIP → drop it here.
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--warm)' : 'var(--paper3)'}`,
                  borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all .2s', marginBottom: 18,
                  background: dragging ? 'var(--warm-s)' : 'var(--paper2)',
                }}
              >
                <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleZipSelected(f) }} />
                <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Drop your ZIP here</div>
                <div style={{ fontSize: 12, color: 'var(--ink4)' }}>or click to browse — the file is named takeout-….zip</div>
              </div>

              <button onClick={() => setStep('choose')} style={{
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--ink4)', fontFamily: 'inherit',
              }}>
                ← Back to Google connect
              </button>
            </>
          )}

          {/* ZIP PREVIEW */}
          {step === 'zip-preview' && zipFile && (
            <>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 6 }}>
                Ready to import
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>
                We found your export file. Tap import to begin.
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--sage-s)', border: '1px solid rgba(60,96,64,.2)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{zipFile.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{(zipFile.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
              <button onClick={uploadZip} style={{
                width: '100%', padding: 13, background: 'var(--warm)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: 10, transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#b5391a'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--warm)'}
              >
                Import all lists →
              </button>
              <button onClick={() => setStep('zip-pick')} style={{
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--ink4)', fontFamily: 'inherit',
              }}>
                ← Choose a different file
              </button>
            </>
          )}

          {/* IMPORTING */}
          {step === 'importing' && (
            <>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 6 }}>
                Importing your lists…
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
                {phase || 'Getting your places ready…'}
              </div>
              {/* Progress bar */}
              <div style={{ height: 5, background: 'var(--paper3)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%', background: 'var(--warm)', borderRadius: 3,
                  width: `${progress}%`, transition: 'width .35s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', marginBottom: 20 }}>
                <span>{phase}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ink3)', fontSize: 13 }}>
                <Loader size={16} className="spin" />
                This takes about 2 minutes
              </div>
            </>
          )}

          {/* DONE */}
          {step === 'done' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <CheckCircle size={40} style={{ color: 'var(--sage)', marginBottom: 12 }} />
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, marginBottom: 6 }}>
                  {isExistingUser ? `${newCount} new places added` : 'All imported!'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                  {foundLists.length} lists · {foundLists.reduce((s,l)=>s+l.places.length,0)} places · enriching in background
                </div>
              </div>
              {/* Preview of lists found */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto', marginBottom: 20 }}>
                {foundLists.slice(0, 12).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{l.name}</span>
                    <span style={{ color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontSize: 10 }}>{l.places.length} places</span>
                    <CheckCircle size={11} style={{ color: 'var(--sage)', flexShrink: 0 }} />
                  </div>
                ))}
                {foundLists.length > 12 && (
                  <div style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center' }}>
                    +{foundLists.length - 12} more lists
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{
                width: '100%', padding: 13, background: 'var(--ink)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                View my lists →
              </button>
            </>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <AlertCircle size={36} style={{ color: 'var(--warm)', marginBottom: 10 }} />
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 400, marginBottom: 6 }}>Something went wrong</div>
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{error}</div>
              </div>
              <button onClick={() => setStep('choose')} style={{
                width: '100%', padding: 12, background: 'var(--ink)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>Try again</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// Demo photos for modal header
const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80',
]

// Demo lists for dev/simulation mode
const DEMO_LISTS: GrazeList[] = [
  { id: crypto.randomUUID(), name: 'NYC Pizzas', color: '#c8411a', places: Array(22).fill(null).map((_,i) => mkPlace('NYC Pizzas', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Mumbai', color: '#3c6040', places: Array(34).fill(null).map((_,i) => mkPlace('Mumbai', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'NYC Restaurants', color: '#b5861a', places: Array(18).fill(null).map((_,i) => mkPlace('NYC Restaurants', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Tokyo Must Visit', color: '#7c3aed', places: Array(12).fill(null).map((_,i) => mkPlace('Tokyo Must Visit', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'London', color: '#1d4ed8', places: Array(11).fill(null).map((_,i) => mkPlace('London', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Mumbai Nightlife', color: '#db2777', places: Array(9).fill(null).map((_,i) => mkPlace('Mumbai Nightlife', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Bali', color: '#ea580c', places: Array(14).fill(null).map((_,i) => mkPlace('Bali', i)), source: 'google_portability', createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Want to go', color: '#16a34a', places: Array(31).fill(null).map((_,i) => mkPlace('Want to go', i)), source: 'google_portability', createdAt: new Date().toISOString() },
]

function mkPlace(listName: string, i: number) {
  const names = ['Roberta\'s','Lucali','Di Fara','Joe\'s Pizza','Una Pizza','L\'Industrie','Ops','Scarr\'s','Motorino','Rubirosa']
  const imgs = [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
    'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&q=80',
    'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=600&q=80',
    'https://images.unsplash.com/photo-1548369937-47519962c11a?w=600&q=80',
  ]
  const id = crypto.randomUUID()
  return {
    id, listId: listName, name: names[i % names.length] + (i > 9 ? ` ${i}` : ''),
    visited: i < 3, enriched: true,
    photoUrl: imgs[i % imgs.length],
    googleRating: 4 + Math.random(),
    googleReviewCount: Math.floor(Math.random() * 5000 + 100),
    priceLevel: (i % 3) + 1,
    isVegFriendly: i % 3 === 0,
    grazeScore: 7 + Math.random() * 3,
    source: 'google_portability' as const,
    sourceHash: `${listName}-${i}`,
    addedAt: new Date().toISOString(),
  }
}
