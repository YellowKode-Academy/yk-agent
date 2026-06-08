# YellowKode Agent

Local autonomous AI agent, browses the web, extracts data, and executes tasks without any API key.

![YellowKode](https://img.shields.io/badge/YellowKode-Agent-f5c518?style=for-the-badge)
![Free](https://img.shields.io/badge/100%25-Free-22c55e?style=for-the-badge)
![Local](https://img.shields.io/badge/100%25-Local-6366f1?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-orange?style=for-the-badge)

> 🇧🇷 [Versão em Português](README.pt-BR.md)

## Screenshots

| Agent browsing the web | Knowledge Base (RAG) |
|---|---|
| ![Agent](docs/agent-main.png) | ![KB Panel](docs/agent-rag-panel.png) |

---

## What it is

An autonomous AI agent that runs **100% on your machine**. No accounts, no tokens, no API keys.

It combines a local LLM (Gemma 4 via Ollama) with a real browser (Playwright) to perform web tasks: scraping, real-time research, data extraction.

## How it works

```
You send a task
        ↓
Gemma 4 decides which tool to use
        ↓
Playwright opens the browser and loads the page
        ↓
The result is sent back to Gemma 4
        ↓
Streaming response with cards showing each step
```

## Getting started

**Requirement:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone <url> yk-agent
cd yk-agent
cp .env.example .env
docker compose up -d
```

Open at **http://localhost:3001**

> On first run, the model is downloaded automatically (~2.5 GB for `gemma4:e4b`).
> Monitor progress with `docker compose logs -f model-init`.

## Example tasks

```
Go to https://example.com and tell me what's on the page.
```
```
Go to https://news.ycombinator.com and give me the titles of the top stories.
```
```
Go to https://github.com/ollama/ollama and summarize the project.
```

## Features

- Autonomous browsing with live tool cards showing each action (Navigate, Snapshot)
- Multiple sessions with history saved locally
- **Knowledge Base (RAG)**: add URLs, text snippets, or PDFs; the agent uses that content with a badge showing how many sources were used

## Models

| Model | RAM | Best for |
|---|---|---|
| `gemma4:e2b` | ~1 GB | Low-memory machines |
| `gemma4:e4b` | ~2.5 GB | **Recommended** |
| `gemma4:12b` | ~7 GB | More complex tasks |
| `llama3.2` | ~2 GB | Lightweight alternative |

Edit `GEMMA_MODEL` in `.env` to switch. Any tool-calling capable Ollama model works.

## Commands

```bash
docker compose logs -f          # live logs
docker compose ps               # service status
docker compose down             # stop
docker compose down -v          # stop and delete all data
```

## Troubleshooting

```bash
docker compose logs yk_agent_api    # agent not responding
docker compose logs yk_playwright   # browser not connecting
docker compose logs yk_model_init   # model not downloaded
```

---

MIT License, [YellowKode](https://yellowkode.com) + [Wunka Tech](https://wunka.tech)
