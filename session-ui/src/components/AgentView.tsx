import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import type { AgentMessage, ToolCall } from '../lib/types'

const CHIPS = [
  { label: '📰 Get top HN stories', prompt: 'Navigate to https://news.ycombinator.com, take a screenshot, and extract the top 5 stories with title, score, and link.' },
  { label: '🔍 Research a topic', prompt: 'Search the web for the latest news about artificial intelligence today and summarize the top 3 stories.' },
  { label: '🌐 Summarize a webpage', prompt: 'Navigate to https://en.wikipedia.org/wiki/Artificial_intelligence, take a screenshot, and give me a concise summary.' },
  { label: '₿ Bitcoin price', prompt: 'Navigate to https://www.coingecko.com/en/coins/bitcoin and report the current price, 24h change, and market cap.' },
  { label: '🤖 AI news today', prompt: 'Navigate to https://techcrunch.com/category/artificial-intelligence/ and list the 5 most recent AI news headlines.' },
]

interface AgentViewProps {
  messages: AgentMessage[]
  generating: boolean
  streamingText: string
  streamingTools: ToolCall[]
  onSend: (text: string) => void
  onStop: () => void
}

export function AgentView({
  messages,
  generating,
  streamingText,
  streamingTools,
  onSend,
  onStop,
}: AgentViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [input, setInput] = useState('')
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null)

  // Scroll to bottom on new messages or streaming updates
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length, streamingText, streamingTools.length, generating])

  const handleChip = (prompt: string) => {
    setInput(prompt)
    // Immediately send
    onSend(prompt)
    setInput('')
  }

  const isEmpty = messages.length === 0 && !generating

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto yk-scroll">
        {isEmpty ? (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-8">
            <div className="max-w-md text-center space-y-5">
              <div className="mx-auto size-14 rounded-lg bg-brand flex items-center justify-center">
                <Bot className="size-7 text-black" strokeWidth={2} />
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Autonomous Agent
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-fg">
                  YellowKode Agent
                </h1>
                <p className="text-sm text-muted leading-relaxed">
                  100% local autonomous agent — browses the web, takes screenshots,
                  extracts data, and executes tasks without API costs.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {CHIPS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => handleChip(c.prompt)}
                    className="bg-accent border border-bdr rounded-full px-4 py-2 text-[12px] font-mono text-muted hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1
              const isLastAssistant = isLast && m.role === 'assistant' && generating
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={isLastAssistant}
                  streamingText={isLastAssistant ? streamingText : undefined}
                  streamingTools={isLastAssistant ? streamingTools : undefined}
                  onScreenshot={(src) => setScreenshotModal(src)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Input bar */}
      <InputBar
        generating={generating}
        sessionExists={messages.length > 0}
        onSend={onSend}
        onStop={onStop}
        value={input}
        onChange={setInput}
      />

      {/* Screenshot modal */}
      {screenshotModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out"
          onClick={() => setScreenshotModal(null)}
        >
          <img
            src={screenshotModal}
            alt="Screenshot"
            className="max-w-[90vw] max-h-[90vh] rounded-lg border border-bdr object-contain"
          />
        </div>
      )}
    </div>
  )
}
