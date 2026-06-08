import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { AgentView } from './components/AgentView'
import { KBPanel } from './components/KBPanel'
import { useSessions } from './hooks/useSessions'
import { useAgent } from './hooks/useAgent'

function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    const t = setTimeout(onHide, 2800)
    return () => clearTimeout(t)
  }, [message, onHide])

  if (!message) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-panel border border-bdr text-fg px-4 py-2.5 rounded-xl text-[13px] font-mono shadow-xl z-[100] toast-show pointer-events-none">
      {message}
    </div>
  )
}

export default function App() {
  const {
    sessions,
    activeSession,
    activeId,
    newSession,
    deleteSession,
    setActiveId,
    addMessage,
    updateLastAssistantMessage,
  } = useSessions()

  const [modelName, setModelName] = useState('')
  const [ragEnabled, setRagEnabled] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = useCallback((msg: string) => setToast(msg), [])

  // Fetch model name on mount
  useEffect(() => {
    fetch('/api/ollama/tags', { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length) setModelName(d.models[0].name)
      })
      .catch(() => {})
  }, [])

  // Fetch RAG settings on mount
  useEffect(() => {
    fetch('/api/rag/settings', { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((d) => setRagEnabled(!!d.rag_enabled))
      .catch(() => {})
  }, [])

  const handleEnsureSession = useCallback(() => {
    if (activeSession) return activeSession.id
    const s = newSession()
    return s.id
  }, [activeSession, newSession])

  const { generating, streaming, send, stop } = useAgent({
    sessionId: activeSession?.id ?? null,
    messages: activeSession?.messages ?? [],
    ragEnabled,
    onAddMessage: addMessage,
    onUpdateLast: updateLastAssistantMessage,
    onEnsureSession: handleEnsureSession,
  })

  const handleNewSession = useCallback(() => {
    newSession()
  }, [newSession])

  const handleDeleteSession = useCallback(
    (id: string) => {
      if (!confirm('Delete this session?')) return
      deleteSession(id)
    },
    [deleteSession]
  )

  const handleSend = useCallback(
    (text: string) => {
      send(text)
    },
    [send]
  )

  return (
    <div className="flex h-screen w-full bg-surface text-fg font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
        <Header
          session={activeSession}
          modelName={modelName}
          ragEnabled={ragEnabled}
          generating={generating}
          onToggleKB={() => setKbOpen((o) => !o)}
        />

        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentView
            messages={activeSession?.messages ?? []}
            generating={generating}
            streamingText={streaming.text}
            streamingTools={streaming.tools}
            onSend={handleSend}
            onStop={stop}
          />
        </div>
      </main>

      {/* Knowledge Base Panel */}
      <KBPanel
        open={kbOpen}
        ragEnabled={ragEnabled}
        onClose={() => setKbOpen(false)}
        onRagToggle={setRagEnabled}
        onToast={showToast}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onHide={() => setToast('')} />}
    </div>
  )
}
