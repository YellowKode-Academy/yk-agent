import { useState } from 'react'
import { Globe, Camera, Terminal, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Markdown } from './Markdown'
import type { AgentMessage, ToolCall } from '../lib/types'

function formatToolName(name: string): string {
  return name
    .replace(/^browser_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getToolIcon(name: string) {
  if (name.includes('navigate') || name.includes('url')) return Globe
  if (name.includes('screenshot') || name.includes('snap')) return Camera
  return Terminal
}

function getToolSummary(tool: ToolCall): string {
  if (!tool.input) return ''
  const inp = tool.input as any
  if (inp.url) return inp.url
  if (inp.query) return inp.query
  if (inp.selector) return inp.selector
  if (inp.text) return String(inp.text).slice(0, 80)
  const entries = Object.entries(inp)
  if (entries.length) return String(entries[0][1]).slice(0, 80)
  return ''
}

interface ToolCallCardProps {
  tool: ToolCall
  live?: boolean
  onScreenshot?: (src: string) => void
}

function ToolCallCard({ tool, live, onScreenshot }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getToolIcon(tool.name)
  const summary = getToolSummary(tool)
  const hasResult = !!tool.result || !!tool.screenshot || !!tool.error
  const hasScreenshot = !!tool.screenshot

  return (
    <div className="tool-enter bg-accent border border-bdr rounded-lg px-3 py-2.5 ml-12 mb-2 group">
      {/* Tool header */}
      <div className="flex items-center gap-2">
        <div
          className={[
            'size-5 rounded flex items-center justify-center shrink-0',
            tool.error
              ? 'bg-red-500/20 text-red-400'
              : hasResult
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-brand/20 text-brand',
          ].join(' ')}
        >
          {tool.error ? (
            <AlertCircle className="size-3" />
          ) : (
            <Icon className="size-3" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold font-mono text-fg/80 uppercase tracking-wider">
              {formatToolName(tool.name)}
            </span>
            {live && !hasResult && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-brand uppercase tracking-widest">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                Running
              </span>
            )}
            {hasResult && !tool.error && (
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">
                Done
              </span>
            )}
            {tool.error && (
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
                Error
              </span>
            )}
          </div>
          {summary && (
            <div className="text-[10px] font-mono text-muted truncate mt-0.5">
              {summary}
            </div>
          )}
        </div>

        {(hasResult || hasScreenshot) && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 rounded hover:bg-white/10 text-muted hover:text-fg transition opacity-0 group-hover:opacity-100"
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Screenshot thumbnail always visible */}
      {hasScreenshot && (
        <div className="mt-2">
          <img
            src={`data:image/png;base64,${tool.screenshot}`}
            alt="Screenshot"
            className="max-w-xs rounded border border-bdr cursor-zoom-in hover:opacity-90 transition"
            style={{ maxHeight: 180, objectFit: 'cover' }}
            onClick={() => onScreenshot?.(`data:image/png;base64,${tool.screenshot}`)}
          />
        </div>
      )}

      {/* Expanded result */}
      {expanded && tool.result && (
        <div className="mt-2 p-2 bg-surface rounded border border-bdr text-[11px] font-mono text-muted max-h-40 overflow-y-auto yk-scroll whitespace-pre-wrap">
          {tool.result.slice(0, 1000)}
          {tool.result.length > 1000 && '…'}
        </div>
      )}

      {expanded && tool.error && (
        <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20 text-[11px] font-mono text-red-400">
          {tool.error}
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: AgentMessage
  isStreaming?: boolean
  streamingText?: string
  streamingTools?: ToolCall[]
  onScreenshot?: (src: string) => void
}

export function MessageBubble({
  message,
  isStreaming,
  streamingText,
  streamingTools,
  onScreenshot,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex gap-5 msg-enter">
        <div className="size-8 shrink-0 rounded-sm flex items-center justify-center font-bold text-xs bg-white/10 text-white/60">
          U
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[14.5px] leading-relaxed text-fg whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  const displayTools = isStreaming ? streamingTools ?? [] : message.toolCalls ?? []
  const displayText = isStreaming ? streamingText ?? '' : message.content

  const isEmpty = !displayText && displayTools.length === 0

  return (
    <div className="msg-enter">
      {/* Tool calls */}
      {displayTools.map((tool, i) => (
        <ToolCallCard
          key={i}
          tool={tool}
          live={isStreaming && i === displayTools.length - 1}
          onScreenshot={onScreenshot}
        />
      ))}

      {/* Assistant bubble */}
      <div className="flex gap-5">
        <div className="size-8 shrink-0 rounded-sm flex items-center justify-center font-bold text-xs bg-brand text-brand-fg">
          YK
        </div>
        <div className="min-w-0 flex-1 pt-1">
          {/* RAG badge */}
          {message.ragSources && message.ragSources.length > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded px-2 py-0.5 text-[10px] font-mono text-indigo-400 mb-2">
              📚 {message.ragSources.length} source
              {message.ragSources.length > 1 ? 's' : ''} from knowledge base
            </div>
          )}

          {isEmpty ? (
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              Thinking…
            </div>
          ) : (
            <>
              {displayText && <Markdown content={displayText} />}
              {isStreaming && displayText && (
                <span className="stream-cursor" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
