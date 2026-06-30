'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/store'
import type { GrazeList } from '@/types'
import { X, Upload, CheckCircle, AlertCircle, Loader, ExternalLink, ArrowRight } from 'lucide-react'

interface Props { onClose: () => void }

type Step = 'intro' | 'takeout' | 'drop' | 'parsing' | 'done' | 'error'

// Pre-filtered Takeout link — opens Takeout focused on Maps/Saved data.
// Google may still show all products; the on-screen steps cover that.
const TAKEOUT_URL =
  'https://takeout.google.com/settings/takeout/custom/maps_my_places,saved'

export function ImportModal({ onClose }: Props) {
  const { lists, mergeLists } = useStore()
  const [step, setStep] = useState<Step>('intro')
  const [foundLists, setFoundLists] = useState<GrazeList[]>([])
  const [newCount, setNewCount] = useState(0)
  const [error, setError] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isExistingUser = lists.length > 0

  function openTakeout() {
    window.open(TAKEOUT_URL, '_blank', 'noopener')
    setStep('takeout')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.zip')) parseZip(file)
    else { setError('That doesn’t look like a .zip file. Drop the Takeout ZIP Google emailed you.'); setStep('error') }
  }

  async function parseZip(file: File) {
    setZipFile(file)
    setStep('parsing')
    setPhase('Reading your export…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      setPhase('Extracting your lists & places…')
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Import failed'); setStep('error'); return }
      const added = mergeLists(data.lists)
      setFoundLists(data.lists)
      setNewCount(added)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong reading the file')
      setStep('error')
    }
  }

  const totalPlaces = foundLists.reduce((s, l) => s + l.places.length, 0)

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={card}>
        {/* Clean header band */}
        <div style={header}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: 1, color: 'rgba(255,255,255,.92)' }}>
            GRAZE
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 26 }}>

          {/* STEP 1 — INTRO */}
          {step === 'intro' && (
            <>
              <h2 style={title}>{isExistingUser ? 'Sync new saved places' : 'Bring in your Google Maps lists'}</h2>
              <p style={sub}>
                Google lets you export your saved places. We’ll take you there, you request the export,
                and once it’s ready you drop the file back here. Takes about 2 minutes.
              </p>

              <div style={stepsBox}>
                {[
                  ['1', 'We open Google Takeout for you'],
                  ['2', 'Deselect all, then check one box: “Saved”'],
                  ['3', 'Create export → Google emails you a file'],
                  ['4', 'Drop that file back here — done'],
                ].map(([n, t]) => (
                  <div key={n} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                    <span style={stepNum}>{n}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink2)' }}>{t}</span>
                  </div>
                ))}
              </div>

              <button onClick={openTakeout} style={primaryBtn}>
                Open Google Takeout <ExternalLink size={15} />
              </button>
              <button onClick={() => setStep('drop')} style={textBtn}>
                I already have my Takeout file →
              </button>
            </>
          )}

          {/* STEP 2 — TAKEOUT INSTRUCTIONS */}
          {step === 'takeout' && (
            <>
              <h2 style={title}>Two taps on the Google tab 👇</h2>
              <p style={sub}>Google opened a long list and pre-checks <em>everything</em>. Ignore all of it — you only need one thing.</p>

              {/* Tap 1 */}
              <div style={tapCard}>
                <div style={tapHead}><span style={tapBadge}>TAP 1</span> Clear Google’s defaults</div>
                <div style={mockDeselect}>
                  <span style={{ fontSize: 13, color: 'var(--ink3)' }}>65 of 65 selected</span>
                  <span style={mockLink}>Deselect all</span>
                </div>
                <div style={tapHint}>Scroll to the very top and hit <strong>Deselect all</strong>. Now nothing is checked. 🎉</div>
              </div>

              {/* Tap 2 */}
              <div style={tapCard}>
                <div style={tapHead}><span style={tapBadge}>TAP 2</span> Check one box: <strong>Saved</strong></div>
                <div style={mockRow}>
                  <div style={mockPin}>📍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Saved</div>
                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Your saved place lists</div>
                  </div>
                  <div style={mockCheck}>✓</div>
                </div>
                <div style={tapHint}>That single box holds all your lists. Skip “Maps”, skip everything else.</div>
              </div>

              <div style={noteBox}>
                Then scroll down → <strong>Next step</strong> → <strong>Create export</strong>. Google emails you a ZIP in a minute or two. Grab it, come back. 🚀
              </div>

              <button onClick={() => setStep('drop')} style={primaryBtn}>
                Got my file — let’s go <ArrowRight size={15} />
              </button>
              <button onClick={openTakeout} style={textBtn}>
                Re-open Google Takeout
              </button>
            </>
          )}

          {/* STEP 3 — DROP ZIP */}
          {step === 'drop' && (
            <>
              <h2 style={title}>Drop your Takeout file</h2>
              <p style={sub}>It’s a <strong>.zip</strong> named something like <em>takeout-2026….zip</em>. Drag it in or click to browse.</p>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--warm)' : 'var(--paper3)'}`,
                  borderRadius: 14, padding: '40px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all .2s', marginBottom: 16,
                  background: dragging ? 'var(--warm-s)' : 'var(--paper2)',
                }}
              >
                <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) parseZip(f) }} />
                <Upload size={26} style={{ color: 'var(--ink4)', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  {dragging ? 'Drop to import' : 'Drop your ZIP here'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink4)' }}>or click to browse your files</div>
              </div>

              <button onClick={() => setStep('intro')} style={textBtn}>← Back</button>
            </>
          )}

          {/* PARSING */}
          {step === 'parsing' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader size={28} className="spin" style={{ color: 'var(--warm)', marginBottom: 16 }} />
              <h2 style={{ ...title, textAlign: 'center' }}>Reading your lists…</h2>
              <p style={{ ...sub, textAlign: 'center', marginBottom: 0 }}>{phase}</p>
              {zipFile && (
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 14, fontFamily: 'Syne, sans-serif' }}>
                  {zipFile.name} · {(zipFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <CheckCircle size={40} style={{ color: 'var(--sage)', marginBottom: 12 }} />
                <h2 style={{ ...title, textAlign: 'center' }}>
                  {isExistingUser ? `${newCount} new place${newCount === 1 ? '' : 's'} added` : 'All imported'}
                </h2>
                <p style={{ ...sub, textAlign: 'center' }}>
                  {foundLists.length} lists · {totalPlaces} places
                  {isExistingUser ? ' · your notes kept' : ''}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 18 }}>
                {foundLists.slice(0, 14).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--ink2)', padding: '3px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                    <span style={{ color: 'var(--ink4)', fontFamily: 'Syne, sans-serif', fontSize: 10 }}>{l.places.length}</span>
                  </div>
                ))}
                {foundLists.length > 14 && (
                  <div style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center', paddingTop: 4 }}>
                    +{foundLists.length - 14} more lists
                  </div>
                )}
              </div>

              <button onClick={onClose} style={primaryBtn}>View my lists →</button>
            </>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <AlertCircle size={34} style={{ color: 'var(--warm)', marginBottom: 10 }} />
                <h2 style={{ ...title, textAlign: 'center' }}>Couldn’t read that file</h2>
                <p style={{ ...sub, textAlign: 'center' }}>{error}</p>
              </div>
              <button onClick={() => setStep('drop')} style={primaryBtn}>Try another file</button>
              <button onClick={() => setStep('intro')} style={textBtn}>Start over</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── styles ── */
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,13,11,.6)', backdropFilter: 'blur(8px)',
  zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 22, width: 460, maxWidth: '100%',
  boxShadow: '0 32px 80px rgba(15,13,11,.22)', overflow: 'hidden',
  animation: 'fadeUp .35s cubic-bezier(.34,1.56,.64,1) both',
}
const header: React.CSSProperties = {
  height: 52, background: 'linear-gradient(120deg,#1c110a,#3a2215)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
}
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.14)',
  border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const title: React.CSSProperties = {
  fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.4, margin: '0 0 8px',
}
const sub: React.CSSProperties = {
  fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6, margin: '0 0 20px',
}
const stepsBox: React.CSSProperties = {
  background: 'var(--paper2)', borderRadius: 12, padding: 16, marginBottom: 18,
  display: 'flex', flexDirection: 'column', gap: 12,
}
const stepNum: React.CSSProperties = {
  width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff',
  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  fontFamily: 'Syne, sans-serif',
}
const noteBox: React.CSSProperties = {
  background: 'var(--sage-s)', border: '1px solid rgba(60,96,64,.18)', borderRadius: 10,
  padding: '11px 13px', fontSize: 12, color: 'var(--ink3)', lineHeight: 1.55, marginBottom: 18,
}
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: 13, background: 'var(--ink)', color: '#fff', border: 'none',
  borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
}
const textBtn: React.CSSProperties = {
  width: '100%', padding: 4, border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--ink4)', fontFamily: 'inherit',
}
const tapCard: React.CSSProperties = {
  border: '1px solid var(--paper3)', borderRadius: 14, padding: 14, marginBottom: 12,
}
const tapHead: React.CSSProperties = {
  fontSize: 13.5, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
}
const tapBadge: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
  color: '#fff', background: 'var(--warm)', borderRadius: 6, padding: '3px 7px',
}
const tapHint: React.CSSProperties = {
  fontSize: 11.5, color: 'var(--ink4)', marginTop: 9, lineHeight: 1.5,
}
const mockDeselect: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--paper2)', borderRadius: 9, padding: '9px 12px',
}
const mockLink: React.CSSProperties = {
  fontSize: 13, color: '#1a73e8', fontWeight: 600,
}
const mockRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11,
  background: 'var(--paper2)', borderRadius: 9, padding: '10px 12px',
}
const mockPin: React.CSSProperties = { fontSize: 18 }
const mockCheck: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, background: 'var(--sage)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
}
