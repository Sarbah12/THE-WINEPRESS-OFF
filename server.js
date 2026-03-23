const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { handleApi, JSON_HEADERS } = require('./backend/app');

const ROOT_DIR = __dirname;
const PUBLIC_INDEX = path.join(ROOT_DIR, 'index.html');
const PORT = Number(process.env.PORT || 3000);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

function isSafePath(targetPath) {
  const resolved = path.resolve(ROOT_DIR, `.${targetPath}`);
  return resolved.startsWith(ROOT_DIR);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  if (!isSafePath(pathname)) {
    res.writeHead(403, JSON_HEADERS);
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  let filePath = path.resolve(ROOT_DIR, `.${pathname}`);

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    if (!path.extname(filePath)) {
      filePath = `${filePath}.html`;
    }
  }

  try {
    const contents = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream'
    });
    res.end(contents);
  } catch {
    try {
      const fallback = await fs.readFile(PUBLIC_INDEX);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallback);
    } catch {
      res.writeHead(404, JSON_HEADERS);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, JSON_HEADERS);
      res.end();
      return;
    }

    const handled = await handleApi(req, res);
    if (!handled) {
      await serveStatic(req, res);
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, JSON_HEADERS);
    res.end(JSON.stringify({ error: 'Something went wrong on the server.' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`The Winepress backend is running on http://127.0.0.1:${PORT}`);
});
