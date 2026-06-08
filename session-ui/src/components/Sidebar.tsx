import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Session } from '../lib/types'

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface SidebarProps {
  sessions: Session[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete }: SidebarProps) {
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [agentReady, setAgentReady] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      // Check Ollama
      try {
        const r = await fetch('/api/ollama/tags', { signal: AbortSignal.timeout(5000) })
        if (!cancelled) setOllamaOnline(r.ok)
      } catch {
        if (!cancelled) setOllamaOnline(false)
      }

      // Check agent health
      try {
        const r = await fetch('/api/agent/health', { signal: AbortSignal.timeout(3000) })
        if (!cancelled) setAgentReady(r.ok)
      } catch {
        if (!cancelled) setAgentReady(false)
      }
    }

    check()
    const id = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-bdr bg-surface">
      {/* Logo / Brand */}
      <div className="p-5 flex items-center gap-3 border-b border-bdr">
        <div className="size-8 bg-brand rounded flex items-center justify-center shrink-0">
          <div className="size-3.5 bg-black rounded-sm" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-fg uppercase text-sm leading-tight">
            YellowKode Agent
          </div>
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mt-0.5">
            Free · Local · Autonomous
          </div>
        </div>
      </div>

      {/* New Session Button */}
      <div className="px-3 py-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-brand text-brand-fg text-[11px] font-bold uppercase tracking-wider hover:brightness-110 transition"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          New Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 yk-scroll">
        <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">
          Recent Sessions
        </div>

        {sessions.length === 0 && (
          <div className="px-3 py-4 text-center text-muted text-[11px] font-mono">
            No sessions yet
          </div>
        )}

        {sessions.map((s) => {
          const active = s.id === activeId
          return (
            <div
              key={s.id}
              className={[
                'group relative w-full rounded-md transition-colors cursor-pointer mb-0.5',
                active
                  ? 'bg-white/5 border border-white/10'
                  : 'border border-transparent hover:bg-white/[0.03]',
              ].join(' ')}
              onClick={() => onSelect(s.id)}
            >
              <div className="block px-3 py-2 pr-8">
                <div
                  className={[
                    'truncate text-sm',
                    active ? 'text-fg font-medium' : 'text-muted',
                  ].join(' ')}
                >
                  {s.title || 'Untitled'}
                </div>
                <div className="text-[10px] text-muted/70 font-mono mt-0.5">
                  {formatRelative(s.updated_at)} · {s.messages.length} msg
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(s.id)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted hover:text-red-500 transition"
                aria-label="Delete session"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-bdr space-y-2">
        {/* Ollama status */}
        <div className="flex items-center gap-2.5 px-1">
          <span
            className={[
              'size-2 rounded-full shrink-0',
              ollamaOnline === null
                ? 'bg-muted/50'
                : ollamaOnline
                ? 'bg-emerald-500 online-dot'
                : 'bg-red-500',
            ].join(' ')}
          />
          <span
            className={[
              'text-[10px] font-mono truncate',
              ollamaOnline === null
                ? 'text-muted'
                : ollamaOnline
                ? 'text-emerald-500'
                : 'text-red-500',
            ].join(' ')}
          >
            {ollamaOnline === null
              ? 'Checking Ollama…'
              : ollamaOnline
              ? 'Ollama online'
              : 'Ollama offline'}
          </span>
        </div>

        {/* Agent status */}
        <div className="flex items-center gap-2.5 px-1">
          <span
            className={[
              'size-2 rounded-full shrink-0',
              agentReady === null
                ? 'bg-muted/50'
                : agentReady
                ? 'bg-emerald-500 online-dot'
                : 'bg-red-500',
            ].join(' ')}
          />
          <span
            className={[
              'text-[10px] font-mono truncate',
              agentReady === null
                ? 'text-muted'
                : agentReady
                ? 'text-emerald-500'
                : 'text-red-500',
            ].join(' ')}
          >
            {agentReady === null
              ? 'Checking agent…'
              : agentReady
              ? 'Agent ready'
              : 'Agent offline'}
          </span>
        </div>
      </div>
    </aside>
  )
}
