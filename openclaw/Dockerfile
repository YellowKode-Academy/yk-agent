FROM node:22-slim

# Install system deps
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
ARG OPENCLAW_VERSION=latest
RUN if [ "$OPENCLAW_VERSION" = "latest" ]; then \
      npm install -g openclaw; \
    else \
      npm install -g openclaw@${OPENCLAW_VERSION}; \
    fi

# Create working directories
RUN mkdir -p /root/.openclaw /workspace

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Auto-configures Ollama on first run, then starts gateway inline
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 18789
