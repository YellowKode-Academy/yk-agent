'use strict';
const express = require('express');
const app = express();
app.use(express.json({ limit: '10mb' }));

const OLLAMA    = process.env.OLLAMA_API_URL      || 'http://ollama:11434';
const PLAYWRIGHT = process.env.PLAYWRIGHT_MCP_URL || 'http://playwright-mcp:8931';
const MODEL     = process.env.GEMMA_MODEL         || 'gemma4:e4b';
const PORT      = Number(process.env.AGENT_PORT   || 8080);

// ─── Playwright MCP client (Streamable HTTP transport) ───────────────────────

class PlaywrightClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.reqId = 0;
    this.initialized = false;
  }

  async _post(body) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const r = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const sid = r.headers.get('Mcp-Session-Id');
    if (sid) this.sessionId = sid;

    const text = await r.text();

    // Parse SSE (data: {...}) or plain JSON
    if (text.includes('\ndata:') || text.startsWith('data:')) {
      for (const line of text.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          const d = JSON.parse(line.slice(5).trim());
          if (body.id !== undefined && d.id === body.id) return d;
          if (body.id === undefined) return d;
        } catch {}
      }
      return null;
    }
    try { return JSON.parse(text); } catch { return null; }
  }

  async init() {
    if (this.initialized) return;
    const id = ++this.reqId;
    await this._post({
      jsonrpc: '2.0', id, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'yk-agent-api', version: '1.0.0' },
      },
    });
    // Notification — fire and forget
    fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    }).catch(() => {});
    this.initialized = true;
  }

  async tool(name, args = {}) {
    await this.init();
    const id = ++this.reqId;
    const resp = await this._post({
      jsonrpc: '2.0', id, method: 'tools/call',
      params: { name, arguments: args },
    });
    if (!resp) return '';
    if (resp.error) throw new Error(resp.error.message || JSON.stringify(resp.error));
    const content = resp.result?.content || [];
    return content.map(c => c.text || (c.type === 'image' ? '[screenshot]' : '')).join('\n').trim();
  }

  async navigate(url) {
    await this.tool('browser_navigate', { url });
    return await this.snapshot();
  }

  async snapshot() {
    const text = await this.tool('browser_snapshot', {});
    return text.length > 10000 ? text.slice(0, 10000) + '\n[... truncado ...]' : text;
  }
}

// ─── Tool definitions sent to Ollama ─────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'browser_navigate',
      description: 'Abre uma URL no navegador e retorna o conteúdo da página como texto. Use para buscar informações online.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa (incluindo https://)' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_snapshot',
      description: 'Lê o conteúdo textual da página atualmente aberta. Use após browser_navigate para extrair dados.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const SYSTEM = `Você é o YK Agent, um assistente autônomo que pode navegar na internet para completar tarefas.
Ferramentas disponíveis:
- browser_navigate(url): Abre uma URL e retorna o conteúdo
- browser_snapshot(): Lê o conteúdo da página atual

Responda no idioma do usuário. Use as ferramentas quando precisar de informações online.`;

// ─── Agent loop ───────────────────────────────────────────────────────────────

async function runAgent(messages, emit) {
  const pw = new PlaywrightClient(PLAYWRIGHT);

  const history = [
    { role: 'system', content: SYSTEM },
    ...messages.filter(m => m.role !== 'system'),
  ];

  for (let turn = 0; turn < 7; turn++) {
    const ollamaRes = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: history, tools: TOOLS, stream: false }),
      signal: AbortSignal.timeout(180000),
    });

    if (!ollamaRes.ok) throw new Error(`LLM HTTP ${ollamaRes.status}`);
    const data = await ollamaRes.json();
    const msg = data.message || {};
    const toolCalls = msg.tool_calls;

    // No tool calls — stream final text answer
    if (!toolCalls || toolCalls.length === 0) {
      const content = (msg.content || '').trim();
      for (let i = 0; i < content.length; i += 6) {
        emit({ type: 'text', text: content.slice(i, i + 6) });
        if (i % 60 === 0) await new Promise(r => setTimeout(r, 8));
      }
      return;
    }

    // Add assistant turn with tool_calls
    history.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });

    for (const tc of toolCalls) {
      const fn = tc.function;
      const args = typeof fn.arguments === 'string'
        ? (() => { try { return JSON.parse(fn.arguments); } catch { return {}; } })()
        : (fn.arguments || {});

      emit({ type: 'tool_use', name: fn.name, input: args });

      let result = '';
      let toolError = null;

      try {
        if (fn.name === 'browser_navigate') {
          result = await pw.navigate(args.url);
        } else if (fn.name === 'browser_snapshot') {
          result = await pw.snapshot();
        } else {
          result = `Tool ${fn.name} not available.`;
        }
      } catch (e) {
        result = `Error: ${e.message}`;
        toolError = e.message;
      }

      emit({ type: 'tool_result', content: result.slice(0, 1000), error: toolError });
      history.push({ role: 'tool', content: result });
    }
  }

  emit({ type: 'text', text: '\n\n⚠️ *Agent turn limit reached.*' });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (event) => {
    try { res.write(JSON.stringify(event) + '\n'); } catch {}
  };

  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages array required');
    await runAgent(messages, emit);
  } catch (err) {
    emit({ type: 'error', message: err.message });
  }

  res.end();
});

app.get('/health', (_, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[agent-api] port=${PORT} model=${MODEL} ollama=${OLLAMA} playwright=${PLAYWRIGHT}`)
);
