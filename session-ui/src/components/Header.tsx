import { BookOpen } from 'lucide-react'
import type { Session } from '../lib/types'

interface HeaderProps {
  session: Session | null
  modelName: string
  ragEnabled: boolean
  generating: boolean
  onToggleKB: () => void
}

export function Header({ session, modelName, ragEnabled, generating, onToggleKB }: HeaderProps) {
  const sessionTitle = session?.title || 'No session'
  const sessionMeta = session
    ? `#${session.id.slice(0, 8)} · ${new Date(session.created_at).toLocaleDateString()}`
    : 'Create or select a session'

  return (
    <header className="h-14 shrink-0 flex items-center justify-between border-b border-bdr bg-surface/60 backdrop-blur px-6">
      {/* Left: session info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-sm font-semibold text-fg truncate leading-tight">
          {sessionTitle}
        </div>
        <div className="text-[10px] font-mono text-muted truncate">
          {sessionMeta}
        </div>
      </div>

      {/* Right: model + status + KB */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'size-1.5 rounded-full',
              generating ? 'bg-brand animate-pulse' : 'bg-emerald-500',
            ].join(' ')}
          />
          <span
            className={[
              'text-[10px] font-mono uppercase tracking-widest',
              generating ? 'text-brand' : 'text-emerald-500',
            ].join(' ')}
          >
            {generating ? 'Generating…' : 'Agent ready'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-bdr" />

        {/* Model badge */}
        <div className="flex items-center gap-1.5 bg-accent border border-bdr rounded-md px-2.5 py-1.5">
          <span className="text-brand text-xs">⬡</span>
          <span className="text-[11px] font-mono text-brand">
            {modelName || 'local'}
          </span>
        </div>

        {/* KB button */}
        <button
          onClick={onToggleKB}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition',
            ragEnabled
              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
              : 'border-bdr bg-accent text-muted hover:border-brand/40 hover:text-brand',
          ].join(' ')}
          title="Knowledge Base · RAG"
        >
          <BookOpen className="size-3.5" />
          KB
        </button>
      </div>
    </header>
  )
}
