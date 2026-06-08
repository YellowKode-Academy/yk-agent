import { useCallback, useEffect, useState } from 'react'
import type { Session, AgentMessage } from '../lib/types'

const STORAGE_KEY = 'yk_agent_sessions'

const uid = () => Math.random().toString(36).slice(2, 10)

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

// Module-level state shared across hook instances
let sessionsState: Session[] = loadSessions()
let activeIdState: string | null = sessionsState[0]?.id ?? null

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useSessions() {
  const [, force] = useState(0)

  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    force((n) => n + 1)
    return () => { listeners.delete(l) }
  }, [])

  const newSession = useCallback((title?: string): Session => {
    const s: Session = {
      id: uid(),
      title: title || 'New Session',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    }
    sessionsState = [s, ...sessionsState]
    activeIdState = s.id
    saveSessions(sessionsState)
    notify()
    return s
  }, [])

  const deleteSession = useCallback((id: string) => {
    sessionsState = sessionsState.filter((s) => s.id !== id)
    if (activeIdState === id) {
      activeIdState = sessionsState[0]?.id ?? null
    }
    saveSessions(sessionsState)
    notify()
  }, [])

  const setActiveId = useCallback((id: string) => {
    activeIdState = id
    notify()
  }, [])

  const updateSession = useCallback((id: string, patch: Partial<Session>) => {
    sessionsState = sessionsState.map((s) =>
      s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s
    )
    saveSessions(sessionsState)
    notify()
  }, [])

  const addMessage = useCallback((sessionId: string, msg: AgentMessage) => {
    sessionsState = sessionsState.map((s) => {
      if (s.id !== sessionId) return s
      const title =
        s.messages.length === 0 && msg.role === 'user'
          ? msg.content.slice(0, 60)
          : s.title
      return {
        ...s,
        title,
        updated_at: new Date().toISOString(),
        messages: [...s.messages, msg],
      }
    })
    saveSessions(sessionsState)
    notify()
  }, [])

  const updateLastAssistantMessage = useCallback(
    (sessionId: string, patch: Partial<AgentMessage>) => {
      sessionsState = sessionsState.map((s) => {
        if (s.id !== sessionId) return s
        const msgs = [...s.messages]
        const lastIdx = msgs.map((m) => m.role).lastIndexOf('assistant')
        if (lastIdx === -1) return s
        msgs[lastIdx] = { ...msgs[lastIdx], ...patch }
        return { ...s, updated_at: new Date().toISOString(), messages: msgs }
      })
      saveSessions(sessionsState)
      notify()
    },
    []
  )

  const activeSession =
    sessionsState.find((s) => s.id === activeIdState) ?? sessionsState[0] ?? null

  return {
    sessions: sessionsState,
    activeSession,
    activeId: activeIdState,
    newSession,
    deleteSession,
    setActiveId,
    updateSession,
    addMessage,
    updateLastAssistantMessage,
  }
}
