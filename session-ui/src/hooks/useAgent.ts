import { useCallback, useRef, useState } from 'react'
import type { ToolCall, RagSource, AgentMessage } from '../lib/types'

const uid = () => Math.random().toString(36).slice(2, 10)

interface UseAgentOptions {
  sessionId: string | null
  messages: AgentMessage[]
  ragEnabled: boolean
  onAddMessage: (sessionId: string, msg: AgentMessage) => void
  onUpdateLast: (sessionId: string, patch: Partial<AgentMessage>) => void
  onEnsureSession: () => string
}

interface StreamingState {
  text: string
  tools: ToolCall[]
}

export function useAgent({
  sessionId,
  messages,
  ragEnabled,
  onAddMessage,
  onUpdateLast,
  onEnsureSession,
}: UseAgentOptions) {
  const [generating, setGenerating] = useState(false)
  const [streaming, setStreaming] = useState<StreamingState>({ text: '', tools: [] })
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || generating) return

      // Ensure a session exists
      const sid = sessionId ?? onEnsureSession()

      // Query RAG if enabled
      let ragSources: RagSource[] = []
      let messageToSend = text

      if (ragEnabled) {
        try {
          const ragRes = await fetch('/api/rag/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, limit: 5 }),
            signal: AbortSignal.timeout(30000),
          })
          if (ragRes.ok) {
            ragSources = await ragRes.json()
            if (ragSources.length) {
              const ctx = ragSources
                .map((r, i) => `[${i + 1}] Source: "${r.source_name}"\n${r.text}`)
                .join('\n\n---\n\n')
              messageToSend = `[Knowledge Base Context]\n${ctx}\n[End Context]\n\n${text}`
            }
          }
        } catch {
          // ignore RAG errors
        }
      }

      // Add user message
      const userMsg: AgentMessage = {
        id: uid(),
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
        ragSources: ragSources.length ? ragSources : undefined,
      }
      onAddMessage(sid, userMsg)

      // Build history for API
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: messageToSend })

      // Add placeholder assistant message
      const assistantId = uid()
      const assistantMsg: AgentMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        toolCalls: [],
        ragSources: ragSources.length ? ragSources : undefined,
      }
      onAddMessage(sid, assistantMsg)

      setGenerating(true)
      setStreaming({ text: '', tools: [] })

      const ctrl = new AbortController()
      abortRef.current = ctrl

      let accText = ''
      let currentTools: ToolCall[] = []
      let currentToolIdx = -1

      try {
        const resp = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sid,
            message: messageToSend,
            messages: history,
          }),
          signal: ctrl.signal,
        })

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
        }

        if (!resp.body) throw new Error('No response body')

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            let evt: any
            try {
              evt = JSON.parse(trimmed)
            } catch {
              continue
            }

            if (evt.type === 'text') {
              accText += evt.text || ''
              setStreaming({ text: accText, tools: currentTools })
            } else if (evt.type === 'tool_use') {
              const tool: ToolCall = {
                name: evt.name || 'unknown',
                input: evt.input || {},
              }
              currentTools = [...currentTools, tool]
              currentToolIdx = currentTools.length - 1
              setStreaming({ text: accText, tools: currentTools })
            } else if (evt.type === 'tool_result') {
              if (currentToolIdx >= 0) {
                const updated = [...currentTools]
                updated[currentToolIdx] = {
                  ...updated[currentToolIdx],
                  result: evt.content || '',
                  screenshot: evt.screenshot || undefined,
                  error: evt.error || undefined,
                }
                currentTools = updated
                setStreaming({ text: accText, tools: currentTools })
              }
            } else if (evt.type === 'error') {
              throw new Error(evt.message || 'Agent error')
            }
          }
        }

        // Finalize assistant message
        onUpdateLast(sid, {
          content: accText,
          toolCalls: currentTools,
          ragSources: ragSources.length ? ragSources : undefined,
        })
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // User stopped — keep partial content
          onUpdateLast(sid, {
            content: accText || '*(stopped)*',
            toolCalls: currentTools,
          })
        } else {
          const errorContent = `**Error:** ${err?.message ?? 'Request failed'}\n\nCheck: \`docker compose logs yk_agent_api\``
          onUpdateLast(sid, {
            content: errorContent,
            toolCalls: currentTools,
          })
        }
      } finally {
        setGenerating(false)
        setStreaming({ text: '', tools: [] })
        abortRef.current = null
      }
    },
    [generating, sessionId, messages, ragEnabled, onAddMessage, onUpdateLast, onEnsureSession]
  )

  return { generating, streaming, send, stop }
}
