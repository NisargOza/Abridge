import { useEffect, useRef, useState } from 'react'
import { ArrowRight, FileText, LockKeyhole, Upload } from 'lucide-react'
import { Button, ErrorBox } from '../components/ui/Primitives'
import { api } from '../lib/api'
import type { DocumentResult } from '../lib/types'

export const DocumentsPage = () => {
  const [text, setText] = useState('')
  const [result, setResult] = useState<DocumentResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const file = async (upload: File | undefined) => {
    if (!upload) return
    if (!upload.name.toLowerCase().endsWith('.txt') || upload.size > 72000) { setError('Choose a plain text (.txt) file under 72 KB. For a PDF, copy and paste its text.'); return }
    const contents = await upload.text()
    if (!alive.current) return
    if (contents.length > 18000) { setError('This document is too long. Try a section under 18,000 characters.'); return }
    setText(contents); setDirty(true); setError('')
  }
  const simplify = async () => { setBusy(true); setError(''); try { const r = await api.document(text); if (alive.current) { setResult(r); setDirty(false) } } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Try again.') } finally { if (alive.current) setBusy(false) } }
  return <><div className="page-heading"><div><p className="eyebrow">UNDERSTAND A DOCUMENT</p><h1 tabIndex={-1}>Plain words. A clearer next step.</h1><p>Bring a confusing letter or notice. Keep the original close by.</p></div></div><div className="document-layout"><section className="panel"><h2>Your letter or notice</h2><p className="muted">Paste the text or choose a .txt file. For PDFs, copy the text here.</p><ErrorBox message={error}/><form autoComplete="off" onSubmit={e => { e.preventDefault(); void simplify() }}><div className="field"><label htmlFor="document-text">Document text</label><textarea id="document-text" minLength={20} maxLength={18000} rows={13} required placeholder="Paste the part you want help understanding…" value={text} onChange={e => { setText(e.target.value); setDirty(true) }} aria-describedby="doc-limit"/><div className="document-controls"><span id="doc-limit">{text.length.toLocaleString()} / 18,000 characters</span><label className="upload-button" htmlFor="document-file"><Upload size={16} aria-hidden="true"/>Choose .txt file<input id="document-file" type="file" accept=".txt,text/plain" onChange={e => { void file(e.target.files?.[0]); e.target.value = '' }}/></label></div></div><div className="local-note"><LockKeyhole size={17} aria-hidden="true"/><span>This goes only to the AI running on your computer.</span></div><Button type="submit" busy={busy} className="full-button">{busy ? 'Reading on your device…' : 'Help me understand this'}<ArrowRight size={17} aria-hidden="true"/></Button><p className="field-hint">Local AI can take a minute. Start llama-server from Privacy & local setup if needed.</p></form><Button variant="ghost" onClick={() => { setText(''); setResult(null); setError(''); setDirty(false) }} disabled={busy}>Clear document</Button></section><section className="document-output" aria-live="polite">{!result ? <div className="context-card"><FileText size={26} aria-hidden="true"/><h2>Keep the details that matter.</h2><p>Abridge checks that a rewrite keeps the document’s numbers and condition words. If that check fails, we show only the original.</p><h3>Before you act</h3><p>Compare the rewrite with the original. AI can miss meaning, even when numbers match. Ask the sender if something is unclear.</p><h3>Private by default</h3><p>No uploads to the cloud. No saved documents. Clear your session when you’re done.</p></div> : <>{dirty && <div className="info-banner"><p>Your text changed. Read it again to update the result.</p></div>}<div className={result.rewrite ? 'info-banner' : 'error-box'} role={result.rewrite ? 'status' : 'alert'}>{result.message}</div>{result.rewrite && <article className="panel rewrite"><p className="eyebrow">LOCAL AI · CHECK AGAINST THE ORIGINAL</p><h2>{result.rewrite.title}</h2><p className="preserve-text">{result.rewrite.plain_language}</p>{result.rewrite.action_items.length > 0 && <><h3>Actions mentioned in your document</h3><ul>{result.rewrite.action_items.map((a,i) => <li key={i}>{a}</li>)}</ul></>}</article>}<details className="panel original" open={!result.rewrite}><summary>Original document</summary><p className="preserve-text">{result.original}</p></details></>}</section></div></>
}
