'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { root, runtimeFiles } = require('./runtime-files.cjs');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml' };

function createPreviewServer(options = {}) {
  const allowed = new Set(runtimeFiles());
  return http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); return response.end(); }
    if (options.mockInfo && pathname === '/System/Info/Public') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(options.mockInfo));
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (!allowed.has(relative)) { response.writeHead(404); return response.end(); }
    fs.readFile(path.join(root, relative), (error, data) => {
      if (error) { response.writeHead(404); return response.end(); }
      response.writeHead(200, { 'Content-Type': types[path.extname(relative)] || 'text/plain; charset=utf-8' });
      response.end(data);
    });
  });
}

if (require.main === module) {
  createPreviewServer().listen(8000, '127.0.0.1', () => console.log('Vorschau: http://127.0.0.1:8000'));
}
module.exports = { createPreviewServer };
