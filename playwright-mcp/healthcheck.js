// Simple health check — Playwright MCP exposes /health on SSE transport
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.MCP_PORT || 8931,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
req.end();
