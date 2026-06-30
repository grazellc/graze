'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/store'
import type { GrazeList } from '@/types'
import { X, Upload, CheckCircle, AlertCircle, Loader, ExternalLink, ArrowRight } from 'lucide-react'

interface Props { onClose: () => void }

type Step = 'intro' | 'takeout' | 'drop' | 'parsing' | 'done' | 'error'

// Pre-selects the two products that matter: "Saved" (your lists) +
// "Maps (your places)" (starred places, which carry map locations).
// If Google ignores pre-selection, the on-screen steps cover it manually.
const TAKEOUT_URL =
  'https://takeout.google.com/settings/takeout/custom/saved,maps_my_places'

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
  const [isMobile] = useState(
    () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  )

  const isExistingUser = lists.length > 0

  function openTakeout() {
    window.open(TAKEOUT_URL, '_blank', 'noopener')
    setStep('drop')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    const n = file?.name.toLowerCase() || ''
    if (n.endsWith('.zip') || n.endsWith('.json')) parseZip(file)
    else { setError('That doesn’t look right. Drop the .zip Google emailed you (or a Saved Places .json).'); setStep('error') }
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

          {/* STEP 1 — INTRO: the whole walkthrough, start to finish */}
          {step === 'intro' && (
            <>
              <h2 style={title}>{isExistingUser ? 'Sync new saved places' : 'Bring in your Google Maps lists'}</h2>
              <p style={sub}>
                Here’s the whole thing — about 2 minutes. We open Google for you; just do these on that tab:
              </p>

              <div style={guideBox}>
                <div style={guideKicker}>On the Google tab</div>

                <div style={gStep}><span style={stepNum}>1</span>
                  <span style={gText}>Tap <strong>Deselect all</strong> at the top</span>
                </div>

                <div style={gStep}><span style={stepNum}>2</span>
                  <span style={gText}>Scroll down and check <strong>these two</strong> (they look exactly like this):</span>
                </div>
                <div style={gPick}>
                  <div style={realRow}>
                    <span style={realIcon}>🔖</span>
                    <div style={{ flex: 1 }}>
                      <div style={realName}>Saved</div>
                      <div style={realDesc}>Collections of saved links… from Google Search and Maps</div>
                      <div style={realTag}>your 91 lists · in the “S” section</div>
                    </div>
                    <span style={realCheck}>✓</span>
                  </div>
                  <div style={realRow}>
                    <span style={realIcon}>📍</span>
                    <div style={{ flex: 1 }}>
                      <div style={realName}>Maps (your places)</div>
                      <div style={realDesc}>Records of your starred places and place reviews</div>
                      <div style={realTag}>adds map locations · in the “M” section</div>
                    </div>
                    <span style={realCheck}>✓</span>
                  </div>
                  <div style={warnRow}>
                    <span style={{ fontSize: 13 }}>⚠️</span>
                    <span><strong>Don’t</strong> check plain <strong>“Maps”</strong> — it’s a different box and makes the export fail.</span>
                  </div>
                </div>

                <div style={gStep}><span style={stepNum}>3</span>
                  <span style={gText}>Leave the file formats as they are</span>
                </div>

                <div style={gStep}><span style={stepNum}>4</span>
                  <span style={gText}>Scroll down → <strong>Next step</strong> → <strong>Create export</strong>
                    <span style={gDim}> (the next page is just delivery — leave it on email & confirm)</span>
                  </span>
                </div>

                <div style={guideKicker2}>Then, in a minute or two</div>

                <div style={gStep}><span style={stepNum}>5</span>
                  <span style={gText}>Google emails you → open it → tap <strong>Manage Google Takeout request</strong></span>
                </div>
                <div style={gStep}><span style={stepNum}>6</span>
                  <span style={gText}>Hit <strong>Download</strong>, save the file</span>
                </div>
                <div style={gStep}><span style={stepNum}>7</span>
                  <span style={gText}>Come back here and drop it in 👇</span>
                </div>
              </div>

              <button onClick={openTakeout} style={primaryBtn}>
                Open Google Takeout <ExternalLink size={15} />
              </button>
              <button onClick={() => setStep('drop')} style={textBtn}>
                I already have my file →
              </button>
            </>
          )}

          {/* STEP 2 — TAKEOUT INSTRUCTIONS */}
          {step === 'takeout' && (
            <>
              <h2 style={title}>Almost nothing to do 🎉</h2>
              <p style={sub}>
                We opened Takeout with <strong>“Saved”</strong> already picked for you. Look for it shown like this:
              </p>

              {/* The real "Saved" row, so it's unmistakable */}
              <div style={mockRow}>
                <div style={mockBookmark}>🔖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Saved</div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Your saved place lists</div>
                </div>
                <div style={mockCheck}>✓</div>
              </div>

              <div style={{ ...tapCard, marginTop: 14 }}>
                <div style={tapHead}>If “Saved” is already checked at the top</div>
                <div style={tapHint}>
                  Just scroll down → <strong>Next step</strong> → <strong>Create export</strong>. That’s it.
                </div>
              </div>

              <div style={tapCard}>
                <div style={tapHead}>If everything is unchecked instead</div>
                <div style={tapHint}>
                  The list is alphabetical — scroll down past “M” to the <strong>“S”</strong> section,
                  check the one box called <strong>“Saved”</strong> (not “Maps”), then Create export.
                </div>
              </div>

              <div style={noteBox}>
                Google emails you a ZIP in a minute or two. Download it, come back, drop it below. 🚀
              </div>

              <button onClick={() => setStep('drop')} style={primaryBtn}>
                Got my file — let’s go <ArrowRight size={15} />
              </button>
              <button onClick={openTakeout} style={textBtn}>
                Re-open Google Takeout
              </button>
            </>
          )}

          {/* STEP 3 — DROP / UPLOAD (platform-aware) */}
          {step === 'drop' && (
            <>
              <h2 style={title}>Add your Takeout file</h2>
              <p style={sub}>
                {isMobile
                  ? <>Tap below and pick the file Google gave you — it’s a <strong>.zip</strong> (or a Saved Places <strong>.json</strong>), usually in <em>Files → Downloads</em>.</>
                  : <>Drag in the <strong>.zip</strong> Google emailed you (or a Saved Places <strong>.json</strong>) — or click to browse.</>}
              </p>

              <input ref={fileRef} type="file" accept=".zip,.json,application/zip,application/json" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) parseZip(f) }} />

              {isMobile ? (
                <button onClick={() => fileRef.current?.click()} style={{ ...primaryBtn, padding: '16px', fontSize: 15 }}>
                  <Upload size={18} /> Choose file
                </button>
              ) : (
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
                  <Upload size={26} style={{ color: 'var(--ink4)', marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    {dragging ? 'Drop to import' : 'Drop your file here'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink4)' }}>or click to browse — .zip or .json</div>
                </div>
              )}

              <button onClick={() => setStep('intro')} style={textBtn}>← Back to the steps</button>
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
const guideBox: React.CSSProperties = {
  background: 'var(--paper2)', borderRadius: 12, padding: '14px 16px', marginBottom: 18,
  display: 'flex', flexDirection: 'column', gap: 10,
}
const guideKicker: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  color: 'var(--ink4)', fontFamily: 'Syne, sans-serif',
}
const guideKicker2: React.CSSProperties = {
  ...guideKicker, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--paper3)',
}
const gStep: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start' }
const gText: React.CSSProperties = { fontSize: 13, color: 'var(--ink2)', lineHeight: 1.45, paddingTop: 1 }
const gDim: React.CSSProperties = { color: 'var(--ink4)' }
const gPick: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 7, marginLeft: 32,
  background: 'var(--paper)', borderRadius: 9, padding: '10px 12px',
}
const pickRow: React.CSSProperties = { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.4 }
const pickDot: React.CSSProperties = { fontSize: 14, flexShrink: 0 }
const realRow: React.CSSProperties = {
  display: 'flex', gap: 10, alignItems: 'center',
  background: '#fff', border: '1px solid var(--paper3)', borderRadius: 9, padding: '9px 11px',
}
const realIcon: React.CSSProperties = { fontSize: 16, flexShrink: 0 }
const realName: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }
const realDesc: React.CSSProperties = { fontSize: 10.5, color: 'var(--ink4)', lineHeight: 1.3, marginTop: 1 }
const realTag: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--warm)', marginTop: 3, fontFamily: 'Syne, sans-serif' }
const realCheck: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 5, background: 'var(--sage)', color: '#fff',
  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const warnRow: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--ink2)', lineHeight: 1.4,
  background: 'var(--warm-s)', borderRadius: 8, padding: '8px 10px', marginTop: 2,
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
const mockBookmark: React.CSSProperties = { fontSize: 18 }
const mockCheck: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, background: 'var(--sage)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
}
