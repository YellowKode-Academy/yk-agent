import { useRef, useEffect } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface InputBarProps {
  generating: boolean
  sessionExists: boolean
  onSend: (text: string) => void
  onStop: () => void
  value: string
  onChange: (v: string) => void
}

export function InputBar({
  generating,
  onSend,
  onStop,
  value,
  onChange,
}: InputBarProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !generating) {
        onSend(value.trim())
        onChange('')
      }
    }
  }

  const handleSend = () => {
    if (value.trim() && !generating) {
      onSend(value.trim())
      onChange('')
    }
  }

  return (
    <div className="px-6 pb-6 pt-2 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="relative group input-glow">
          <div className="relative bg-panel border border-bdr rounded-xl p-2 flex flex-col z-10">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Give the agent a task… (Enter to send, Shift+Enter for new line)"
              rows={3}
              style={{ resize: 'none', minHeight: 44, maxHeight: 180 }}
              className="w-full bg-transparent border-none outline-none text-sm p-4 pb-2 placeholder:text-muted/60 text-fg"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="text-[10px] font-mono text-muted/70 uppercase tracking-widest">
                {generating
                  ? 'Agent running…'
                  : '🌐 Browse · 📸 Vision · 🖥 Execute · 100% local'}
              </div>

              {generating ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-2 bg-red-600 text-white font-bold text-[10px] px-3 py-2 rounded uppercase tracking-wider hover:brightness-110 transition"
                >
                  <Square className="size-3" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!value.trim()}
                  className={[
                    'flex items-center gap-2 font-bold text-[10px] px-4 py-2 rounded uppercase tracking-wider transition-all',
                    value.trim()
                      ? 'bg-brand text-brand-fg hover:brightness-110'
                      : 'bg-white/5 text-muted cursor-not-allowed',
                  ].join(' ')}
                >
                  Send
                  <ArrowUp className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
