const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');
const PUBLIC_INDEX = path.join(ROOT_DIR, 'index.html');
const PORT = Number(process.env.PORT || 3000);

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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

const initialPrayerWall = [
  {
    id: 'wall-seed-1',
    category: 'Health',
    text: 'Praying for complete healing and strength for my body. God, you are my healer.',
    authorLabel: 'Anonymous',
    createdAt: '2026-03-21T09:00:00.000Z',
    prayerCount: 0
  },
  {
    id: 'wall-seed-2',
    category: 'Family',
    text: "I'm believing for restoration in my family. God, turn the hearts of parents and children to each other.",
    authorLabel: 'Anonymous',
    createdAt: '2026-03-20T09:00:00.000Z',
    prayerCount: 0
  },
  {
    id: 'wall-seed-3',
    category: 'Work & Purpose',
    text: "Lord, open the right door for me. I've been waiting and I trust your timing. Please confirm my path.",
    authorLabel: 'Anonymous',
    createdAt: '2026-03-18T09:00:00.000Z',
    prayerCount: 0
  },
  {
    id: 'wall-seed-4',
    category: 'Mental Health',
    text: 'Some days are so heavy. Praying for the peace that passes all understanding for myself and for others in this season.',
    authorLabel: 'Anonymous',
    createdAt: '2026-03-16T09:00:00.000Z',
    prayerCount: 0
  },
  {
    id: 'wall-seed-5',
    category: 'Finances',
    text: "Trusting God to provide. The numbers don't add up but I know He is able to make a way.",
    authorLabel: 'Anonymous',
    createdAt: '2026-03-15T09:00:00.000Z',
    prayerCount: 0
  },
  {
    id: 'wall-seed-6',
    category: 'Faith & Doubt',
    text: 'Praying for stronger faith. I believe. Please help my unbelief. I want to trust you fully.',
    authorLabel: 'Anonymous',
    createdAt: '2026-03-10T09:00:00.000Z',
    prayerCount: 0
  }
];

const dataFiles = {
  subscriptions: [],
  prayerRequests: [],
  messages: [],
  collaborations: [],
  testimonies: [],
  prayerWall: initialPrayerWall
};

const adminCollections = new Set(Object.keys(dataFiles));

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value, maxLength = 2000) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function relativeTime(isoString) {
  const elapsed = Date.now() - new Date(isoString).getTime();
  const hours = Math.max(1, Math.floor(elapsed / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  for (const [name, seed] of Object.entries(dataFiles)) {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, `${JSON.stringify(seed, null, 2)}\n`);
    }
  }
}

async function readCollection(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

async function writeCollection(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function appendCollection(name, entry) {
  const current = await readCollection(name);
  current.unshift(entry);
  await writeCollection(name, current);
  return entry;
}

async function removeFromCollection(name, id) {
  const current = await readCollection(name);
  const filtered = current.filter(entry => entry.id !== id);
  const removed = filtered.length !== current.length;
  if (removed) {
    await writeCollection(name, filtered);
  }
  return removed;
}

async function updateCollectionEntry(name, id, updates) {
  const current = await readCollection(name);
  let updatedEntry = null;
  const next = current.map(entry => {
    if (entry.id !== id) {
      return entry;
    }

    updatedEntry = { ...entry, ...updates };
    return updatedEntry;
  });

  if (updatedEntry) {
    await writeCollection(name, next);
  }

  return updatedEntry;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

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
    sendJson(res, 403, { error: 'Forbidden' });
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
      sendJson(res, 404, { error: 'Not found' });
    }
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const adminMatch = url.pathname.match(/^\/api\/admin\/([a-zA-Z-]+)(?:\/([^/]+))?$/);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'the-winepress-backend' });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
    const overview = {};
    for (const name of adminCollections) {
      overview[name] = (await readCollection(name)).length;
    }
    sendJson(res, 200, { collections: overview });
    return true;
  }

  if (adminMatch) {
    const collectionName = adminMatch[1];
    const entryId = adminMatch[2];

    if (!adminCollections.has(collectionName)) {
      sendJson(res, 404, { error: 'Collection not found.' });
      return true;
    }

    if (req.method === 'GET' && !entryId) {
      const items = await readCollection(collectionName);
      sendJson(res, 200, { items });
      return true;
    }

    if (req.method === 'DELETE' && entryId) {
      const removed = await removeFromCollection(collectionName, entryId);
      if (!removed) {
        sendJson(res, 404, { error: 'Entry not found.' });
        return true;
      }

      sendJson(res, 200, { message: 'Entry deleted.' });
      return true;
    }

    if (req.method === 'PATCH' && entryId) {
      const payload = await readRequestBody(req);

      if (collectionName !== 'testimonies') {
        sendJson(res, 400, { error: 'This collection does not support updates.' });
        return true;
      }

      const status = sanitizeText(payload.status, 40);
      if (!status) {
        sendJson(res, 400, { error: 'A status value is required.' });
        return true;
      }

      const updated = await updateCollectionEntry(collectionName, entryId, { status });
      if (!updated) {
        sendJson(res, 404, { error: 'Entry not found.' });
        return true;
      }

      sendJson(res, 200, { message: 'Entry updated.', item: updated });
      return true;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/prayer-wall') {
    const wallItems = await readCollection('prayerWall');
    const items = wallItems.map(item => ({
      ...item,
      timeLabel: relativeTime(item.createdAt),
      safeText: escapeHtml(item.text),
      safeCategory: escapeHtml(item.category)
    }));
    sendJson(res, 200, { items });
    return true;
  }

  if (req.method !== 'POST') {
    return false;
  }

  const payload = await readRequestBody(req);

  if (url.pathname === '/api/subscriptions') {
    const subscriberName = sanitizeText(payload.name, 160);
    const source = sanitizeText(payload.source, 120) || 'website';
    if (!subscriberName) {
      sendJson(res, 400, { error: 'A name is required.' });
      return true;
    }

    await appendCollection('subscriptions', {
      id: createId('sub'),
      name: subscriberName,
      source,
      createdAt: new Date().toISOString()
    });
    sendJson(res, 201, { message: 'Subscription saved.' });
    return true;
  }

  if (url.pathname === '/api/prayer-requests') {
    const request = sanitizeText(payload.request, 4000);
    const topics = Array.isArray(payload.topics)
      ? payload.topics.map(topic => sanitizeText(topic, 60)).filter(Boolean)
      : [];
    const addToWall = Boolean(payload.addToWall);

    if (!request) {
      sendJson(res, 400, { error: 'A prayer request is required.' });
      return true;
    }

    const entry = {
      id: createId('prayer'),
      name: sanitizeText(payload.name, 120) || 'Anonymous',
      season: sanitizeText(payload.season, 160),
      topics,
      request,
      addToWall,
      createdAt: new Date().toISOString()
    };

    await appendCollection('prayerRequests', entry);

    if (addToWall) {
      await appendCollection('prayerWall', {
        id: createId('wall'),
        category: topics[0] || 'Prayer',
        text: request,
        authorLabel: 'Anonymous',
        createdAt: entry.createdAt,
        prayerCount: 0
      });
    }

    sendJson(res, 201, { message: 'Prayer request received.' });
    return true;
  }

  if (url.pathname === '/api/messages') {
    const name = sanitizeText(payload.name, 120);
    const message = sanitizeText(payload.message, 4000);
    if (!name || !message) {
      sendJson(res, 400, { error: 'Name and message are required.' });
      return true;
    }

    await appendCollection('messages', {
      id: createId('msg'),
      name,
      city: sanitizeText(payload.city, 160),
      subject: sanitizeText(payload.subject, 160) || 'General enquiry',
      message,
      createdAt: new Date().toISOString()
    });
    sendJson(res, 201, { message: 'Message received.' });
    return true;
  }

  if (url.pathname === '/api/collaborations') {
    const name = sanitizeText(payload.name, 120);
    const idea = sanitizeText(payload.idea, 4000);
    if (!name || !idea) {
      sendJson(res, 400, { error: 'Name and collaboration idea are required.' });
      return true;
    }

    await appendCollection('collaborations', {
      id: createId('collab'),
      name,
      organisation: sanitizeText(payload.organisation, 160),
      platform: sanitizeText(payload.platform, 160),
      type: sanitizeText(payload.type, 160) || 'General collaboration',
      idea,
      createdAt: new Date().toISOString()
    });
    sendJson(res, 201, { message: 'Collaboration proposal received.' });
    return true;
  }

  if (url.pathname === '/api/testimonies') {
    const headline = sanitizeText(payload.headline, 200);
    const story = sanitizeText(payload.story, 6000);
    if (!headline || !story) {
      sendJson(res, 400, { error: 'Headline and testimony are required.' });
      return true;
    }

    await appendCollection('testimonies', {
      id: createId('testimony'),
      anonymous: Boolean(payload.anonymous),
      firstName: sanitizeText(payload.firstName, 120),
      lastName: sanitizeText(payload.lastName, 120),
      origin: sanitizeText(payload.origin, 160),
      theme: sanitizeText(payload.theme, 120),
      headline,
      story,
      verse: sanitizeText(payload.verse, 120),
      createdAt: new Date().toISOString(),
      status: 'pending-review'
    });
    sendJson(res, 201, { message: 'Testimony submitted.' });
    return true;
  }

  return false;
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
    sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

ensureDataFiles()
  .then(() => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`The Winepress backend is running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize backend files.', error);
    process.exit(1);
  });
