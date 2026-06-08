'use strict';
const express = require('express');
const multer  = require('multer');
const pdfParse = require('pdf-parse');
const fs  = require('fs');
const path = require('path');

const app    = express();
app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const OLLAMA     = process.env.OLLAMA_API_URL   || 'http://ollama:11434';
const QDRANT     = process.env.QDRANT_URL        || 'http://qdrant:6333';
const EMBED_MODEL = process.env.EMBEDDING_MODEL  || 'nomic-embed-text';
const PORT       = Number(process.env.PORT        || 3002);
const COLLECTION = 'yk_agent_docs';
const SETTINGS_FILE = '/app/data/settings.json';
const CHUNK_SIZE    = 500;
const CHUNK_OVERLAP = 60;

// ─── Settings ─────────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {}
  return { rag_enabled: false };
}
function saveSettings(s) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

// ─── Text chunking ────────────────────────────────────────────────────────────
function chunkText(text) {
  const paras = text.split(/\n{2,}/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 30);
  const chunks = [];
  let buf = '';
  for (const p of paras) {
    if ((buf + p).length > CHUNK_SIZE) {
      if (buf.trim()) chunks.push(buf.trim());
      if (p.length > CHUNK_SIZE) {
        for (let i = 0; i < p.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
          const c = p.slice(i, i + CHUNK_SIZE).trim();
          if (c.length > 30) chunks.push(c);
        }
        buf = '';
      } else {
        buf = p + '\n\n';
      }
    } else {
      buf += p + '\n\n';
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

// ─── Embedding via Ollama ─────────────────────────────────────────────────────
async function embed(text) {
  const r = await fetch(`${OLLAMA}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`Ollama embed HTTP ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const vec = d.embeddings?.[0] ?? d.embedding;
  if (!vec?.length) throw new Error('Empty embedding returned');
  return vec;
}

// ─── Qdrant helpers ────────────────────────────────────────────────────────────
async function qGet(p) {
  return fetch(`${QDRANT}${p}`, { signal: AbortSignal.timeout(10000) });
}
async function qPost(p, body) {
  return fetch(`${QDRANT}${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
}
async function qPut(p, body) {
  return fetch(`${QDRANT}${p}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
}

let collectionDim = null;
async function ensureCollection(dim) {
  if (collectionDim === dim) return;
  const check = await qGet(`/collections/${COLLECTION}`);
  if (check.status === 200) { collectionDim = dim; return; }
  const r = await fetch(`${QDRANT}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vectors: { size: dim, distance: 'Cosine' } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Qdrant create collection: ${await r.text()}`);
  collectionDim = dim;
  console.log(`[rag-api] Created collection '${COLLECTION}' (dim=${dim})`);
}

// ─── URL scraping ──────────────────────────────────────────────────────────────
async function fetchUrl(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YKAgentRag/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  const html = await r.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

// ─── Ingest pipeline ──────────────────────────────────────────────────────────
async function ingestDocument(sourceId, name, type, url, text) {
  const chunks = chunkText(text);
  if (!chunks.length) throw new Error('No usable content extracted');

  const firstVec = await embed(chunks[0]);
  await ensureCollection(firstVec.length);

  const points = [{ id: crypto.randomUUID(), vector: firstVec, payload: {
    source_id: sourceId, source_name: name, source_type: type,
    source_url: url || null, chunk_index: 0, total_chunks: chunks.length,
    text: chunks[0], ingested_at: new Date().toISOString(),
  }}];

  for (let i = 1; i < chunks.length; i++) {
    const vec = await embed(chunks[i]);
    points.push({ id: crypto.randomUUID(), vector: vec, payload: {
      source_id: sourceId, source_name: name, source_type: type,
      source_url: url || null, chunk_index: i, total_chunks: chunks.length,
      text: chunks[i], ingested_at: new Date().toISOString(),
    }});
  }

  for (let i = 0; i < points.length; i += 32) {
    const r = await qPut(`/collections/${COLLECTION}/points?wait=true`, { points: points.slice(i, i + 32) });
    if (!r.ok) throw new Error(`Qdrant upsert: ${await r.text()}`);
  }

  console.log(`[rag-api] Ingested "${name}" — ${chunks.length} chunks`);
  return { source_id: sourceId, name, type, chunks: chunks.length };
}

// ─── Semantic search ──────────────────────────────────────────────────────────
async function queryRag(text, limit = 5) {
  try {
    const vec = await embed(text);
    await ensureCollection(vec.length);
    const r = await qPost(`/collections/${COLLECTION}/points/search`, {
      vector: vec, limit, with_payload: true, score_threshold: 0.25,
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.result || []).map(p => ({
      text: p.payload.text, source_name: p.payload.source_name,
      source_type: p.payload.source_type, source_url: p.payload.source_url, score: p.score,
    }));
  } catch { return []; }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, model: EMBED_MODEL, qdrant: QDRANT, collection: COLLECTION }));

app.get('/settings', (_, res) => res.json(loadSettings()));
app.put('/settings', (req, res) => {
  const s = loadSettings();
  if (typeof req.body.rag_enabled === 'boolean') s.rag_enabled = req.body.rag_enabled;
  saveSettings(s); res.json(s);
});

app.get('/documents', async (_, res) => {
  try {
    const r = await qPost(`/collections/${COLLECTION}/points/scroll`, {
      limit: 2000, with_payload: ['source_id','source_name','source_type','source_url','ingested_at','total_chunks'], with_vector: false,
    });
    if (!r.ok) return res.json([]);
    const d = await r.json();
    const seen = new Map();
    for (const p of (d.result?.points || [])) {
      const pl = p.payload;
      if (!seen.has(pl.source_id)) {
        seen.set(pl.source_id, { id: pl.source_id, name: pl.source_name, type: pl.source_type, url: pl.source_url, chunks: pl.total_chunks, ingested_at: pl.ingested_at });
      }
    }
    res.json([...seen.values()].sort((a,b) => new Date(b.ingested_at) - new Date(a.ingested_at)));
  } catch { res.json([]); }
});

app.delete('/documents/:id', async (req, res) => {
  try {
    const r = await fetch(`${QDRANT}/collections/${COLLECTION}/points/delete?wait=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { must: [{ key: 'source_id', match: { value: req.params.id } }] } }),
      signal: AbortSignal.timeout(10000),
    });
    res.json({ ok: r.ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/ingest/url', async (req, res) => {
  const { url, name } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const text = await fetchUrl(url);
    const result = await ingestDocument(crypto.randomUUID(), name || new URL(url).hostname, 'url', url, text);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/ingest/text', async (req, res) => {
  const { text, name } = req.body;
  if (!text || !name) return res.status(400).json({ error: 'text and name required' });
  try {
    const result = await ingestDocument(crypto.randomUUID(), name, 'text', null, text);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/ingest/pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const data = await pdfParse(req.file.buffer);
    const name = req.body.name || req.file.originalname;
    const result = await ingestDocument(crypto.randomUUID(), name, 'pdf', null, data.text);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/query', async (req, res) => {
  const { text, limit } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try { res.json(await queryRag(text, limit || 5)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[rag-api] port=${PORT} collection=${COLLECTION} embed=${EMBED_MODEL} qdrant=${QDRANT}`)
);
