import { useEffect, useRef, useState } from 'react'
import { X, Globe, FileText, FileType } from 'lucide-react'
import type { RagDoc } from '../lib/types'

interface KBPanelProps {
  open: boolean
  ragEnabled: boolean
  onClose: () => void
  onRagToggle: (val: boolean) => void
  onToast: (msg: string) => void
}

type KBTab = 'url' | 'text' | 'pdf'

const DOC_ICONS: Record<string, any> = {
  url: Globe,
  text: FileText,
  pdf: FileType,
}

export function KBPanel({ open, ragEnabled, onClose, onRagToggle, onToast }: KBPanelProps) {
  const [activeTab, setActiveTab] = useState<KBTab>('url')
  const [docs, setDocs] = useState<RagDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  // URL form
  const [urlVal, setUrlVal] = useState('')
  const [urlName, setUrlName] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)

  // Text form
  const [textName, setTextName] = useState('')
  const [textBody, setTextBody] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  // PDF form
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfDragOver, setPdfDragOver] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    setLoadingDocs(true)
    try {
      const r = await fetch('/api/rag/documents', { signal: AbortSignal.timeout(8000) })
      if (r.ok) setDocs(await r.json())
    } catch {
      /* ignore */
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    if (open) loadDocs()
  }, [open])

  const handleIngestUrl = async () => {
    if (!urlVal.trim()) { onToast('Enter a URL'); return }
    setUrlLoading(true)
    try {
      const r = await fetch('/api/rag/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlVal.trim(), name: urlName.trim() || undefined }),
        signal: AbortSignal.timeout(60000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onToast(`✓ ${d.name} — ${d.chunks} chunks`)
      setUrlVal('')
      setUrlName('')
      await loadDocs()
    } catch (e: any) {
      onToast(`Error: ${e.message}`)
    } finally {
      setUrlLoading(false)
    }
  }

  const handleIngestText = async () => {
    if (!textName.trim() || !textBody.trim()) { onToast('Name and text are required'); return }
    setTextLoading(true)
    try {
      const r = await fetch('/api/rag/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: textName.trim(), text: textBody.trim() }),
        signal: AbortSignal.timeout(60000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onToast(`✓ ${d.name} — ${d.chunks} chunks`)
      setTextName('')
      setTextBody('')
      await loadDocs()
    } catch (e: any) {
      onToast(`Error: ${e.message}`)
    } finally {
      setTextLoading(false)
    }
  }

  const handleIngestPdf = async () => {
    if (!selectedPdf) { onToast('Select a PDF first'); return }
    setPdfLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedPdf, selectedPdf.name)
      const r = await fetch('/api/rag/ingest/pdf', {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(120000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      onToast(`✓ ${d.name} — ${d.chunks} chunks`)
      setSelectedPdf(null)
      await loadDocs()
    } catch (e: any) {
      onToast(`Error: ${e.message}`)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Remove this document from the knowledge base?')) return
    try {
      await fetch(`/api/rag/documents/${id}`, { method: 'DELETE', signal: AbortSignal.timeout(10000) })
      onToast('Document removed')
      await loadDocs()
    } catch {
      onToast('Could not remove document')
    }
  }

  const handleRagToggle = async (val: boolean) => {
    try {
      await fetch('/api/rag/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rag_enabled: val }),
        signal: AbortSignal.timeout(5000),
      })
      onRagToggle(val)
      onToast(val ? '📚 RAG enabled' : 'RAG disabled')
    } catch {
      onToast('Could not save RAG setting')
    }
  }

  const inputCls =
    'w-full bg-surface border border-bdr text-fg rounded-lg px-3 py-2 text-[13px] font-mono outline-none placeholder:text-muted/50 focus:border-brand/40 transition mb-2'
  const textareaCls =
    'w-full bg-surface border border-bdr text-fg rounded-lg px-3 py-2 text-[13px] font-sans outline-none placeholder:text-muted/50 focus:border-brand/40 transition mb-2 resize-none leading-relaxed'
  const btnCls =
    'w-full bg-brand text-brand-fg rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition'

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={['fixed top-0 right-0 w-[420px] h-full bg-panel border-l border-bdr z-50 flex flex-col kb-panel', open ? 'kb-panel-open' : ''].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bdr shrink-0">
          <div>
            <div className="text-sm font-bold text-fg">📚 Knowledge Base · RAG</div>
            <div className="text-[10px] font-mono text-muted mt-0.5">
              Inject knowledge into agent tasks
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg border border-bdr bg-accent text-muted hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto yk-scroll p-5 space-y-6">
          {/* RAG Toggle */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Settings
            </div>
            <div className="flex items-center justify-between bg-accent border border-bdr rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-fg">Enable RAG</div>
                <div className="text-[11px] font-mono text-muted mt-0.5">
                  Inject knowledge base context into tasks
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={ragEnabled}
                  onChange={(e) => handleRagToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#2a2a2a] peer-checked:bg-indigo-600 rounded-full border border-bdr peer-checked:border-indigo-500 transition-colors relative">
                  <div className="absolute top-0.5 left-0.5 size-4 bg-muted peer-checked:bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          </div>

          {/* Add Source */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Add Source
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface rounded-lg border border-bdr mb-4">
              {(['url', 'text', 'pdf'] as KBTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={[
                    'flex-1 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition',
                    activeTab === t
                      ? 'bg-accent text-fg border border-bdr'
                      : 'text-muted hover:text-fg',
                  ].join(' ')}
                >
                  {t === 'url' ? '🌐 URL' : t === 'text' ? '📝 Text' : '📄 PDF'}
                </button>
              ))}
            </div>

            {/* URL Panel */}
            {activeTab === 'url' && (
              <div>
                <input
                  type="url"
                  placeholder="https://example.com/page"
                  value={urlVal}
                  onChange={(e) => setUrlVal(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  className={inputCls}
                />
                <button
                  onClick={handleIngestUrl}
                  disabled={urlLoading || !urlVal.trim()}
                  className={btnCls}
                >
                  {urlLoading ? 'Ingesting…' : 'Add URL'}
                </button>
              </div>
            )}

            {/* Text Panel */}
            {activeTab === 'text' && (
              <div>
                <input
                  type="text"
                  placeholder="Document name *"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  className={inputCls}
                />
                <textarea
                  placeholder="Paste text content here…"
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  rows={5}
                  className={textareaCls}
                />
                <button
                  onClick={handleIngestText}
                  disabled={textLoading || !textName.trim() || !textBody.trim()}
                  className={btnCls}
                >
                  {textLoading ? 'Ingesting…' : 'Add Text'}
                </button>
              </div>
            )}

            {/* PDF Panel */}
            {activeTab === 'pdf' && (
              <div>
                <div
                  className={[
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition mb-3',
                    pdfDragOver
                      ? 'border-brand bg-brand/5'
                      : 'border-bdr hover:border-brand/40 hover:bg-brand/5',
                  ].join(' ')}
                  onClick={() => pdfInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true) }}
                  onDragLeave={() => setPdfDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setPdfDragOver(false)
                    const f = e.dataTransfer.files[0]
                    if (f?.name.toLowerCase().endsWith('.pdf')) {
                      setSelectedPdf(f)
                    } else {
                      onToast('Please drop a PDF file')
                    }
                  }}
                >
                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-sm font-medium text-fg">
                    {selectedPdf ? selectedPdf.name : 'Click to select PDF'}
                  </div>
                  <div className="text-[11px] font-mono text-muted mt-1">
                    {selectedPdf
                      ? `${(selectedPdf.size / 1024 / 1024).toFixed(1)} MB`
                      : 'or drag & drop · max 50 MB'}
                  </div>
                </div>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setSelectedPdf(f)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={handleIngestPdf}
                  disabled={pdfLoading || !selectedPdf}
                  className={btnCls}
                >
                  {pdfLoading ? 'Uploading…' : 'Upload PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Document list */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              <span>Knowledge Base</span>
              <span className="font-mono">
                {docs.length} source{docs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingDocs ? (
              <div className="text-center text-muted text-[12px] font-mono py-6">
                Loading…
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center text-muted text-[12px] font-mono py-6 leading-relaxed">
                No documents yet.<br />
                Add a URL, text, or PDF above.
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => {
                  const Icon = DOC_ICONS[doc.type] || FileText
                  return (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 bg-accent border border-bdr rounded-lg px-3 py-2.5 group"
                    >
                      <Icon className="size-4 text-brand shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-fg truncate">
                          {doc.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted mt-0.5">
                          {doc.chunks} chunks · {new Date(doc.ingested_at).toLocaleDateString()}
                          {doc.url && (
                            <>
                              {' · '}
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300"
                              >
                                {new URL(doc.url).hostname}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-muted hover:text-red-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        🗑
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
