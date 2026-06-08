export interface ToolCall {
  name: string
  input?: Record<string, unknown>
  result?: string
  screenshot?: string
  error?: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  toolCalls?: ToolCall[]
  ragSources?: RagSource[]
}

export interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: AgentMessage[]
}

export interface RagDoc {
  id: string
  name: string
  type: 'url' | 'text' | 'pdf'
  url?: string
  chunks: number
  ingested_at: string
}

export interface RagSource {
  text: string
  source_name: string
  source_type: string
  score: number
}
