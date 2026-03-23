const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');
const SESSION_COOKIE = 'winepress_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'winepress-admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD || 'winepress-dev-session-secret';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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

let cachedStorage = null;

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value, maxLength = 2000) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
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

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return raw.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) {
      return acc;
    }

    acc[key] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4 || 4)) % 4;
  return Buffer.from(`${padded}${'='.repeat(padLength)}`, 'base64').toString('utf8');
}

function signValue(value) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(value)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createSessionCookie(username) {
  const payload = base64UrlEncode(JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_TTL_MS
  }));
  const signature = signValue(payload);
  return `${payload}.${signature}`;
}

function getActiveSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  if (signValue(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...JSON_HEADERS,
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendUnauthorized(res) {
  sendJson(res, 401, { error: 'Unauthorized' });
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function createFileStorage() {
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

  await ensureDataFiles();

  return {
    type: 'file',
    readCollection,
    writeCollection
  };
}

async function createBlobStorage() {
  const blob = require('@vercel/blob');
  const { put, get } = blob;

  async function readCollection(name) {
    const pathname = `collections/${name}.json`;
    const result = await get(pathname, { access: 'private' });

    if (!result || result.statusCode === 404 || !result.stream) {
      const seed = dataFiles[name] || [];
      await writeCollection(name, seed);
      return seed;
    }

    const contents = await new Response(result.stream).text();
    return JSON.parse(contents);
  }

  async function writeCollection(name, data) {
    await put(
      `collections/${name}.json`,
      `${JSON.stringify(data, null, 2)}\n`,
      {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json'
      }
    );
  }

  for (const [name, seed] of Object.entries(dataFiles)) {
    await readCollection(name).catch(async () => {
      await writeCollection(name, seed);
    });
  }

  return {
    type: 'blob',
    readCollection,
    writeCollection
  };
}

async function getStorage() {
  if (cachedStorage) {
    return cachedStorage;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    cachedStorage = await createBlobStorage();
    return cachedStorage;
  }

  cachedStorage = await createFileStorage();
  return cachedStorage;
}

async function appendCollection(name, entry) {
  const storage = await getStorage();
  const current = await storage.readCollection(name);
  current.unshift(entry);
  await storage.writeCollection(name, current);
  return entry;
}

async function removeFromCollection(name, id) {
  const storage = await getStorage();
  const current = await storage.readCollection(name);
  const filtered = current.filter(entry => entry.id !== id);
  const removed = filtered.length !== current.length;
  if (removed) {
    await storage.writeCollection(name, filtered);
  }
  return removed;
}

async function updateCollectionEntry(name, id, updates) {
  const storage = await getStorage();
  const current = await storage.readCollection(name);
  let updatedEntry = null;
  const next = current.map(entry => {
    if (entry.id !== id) {
      return entry;
    }

    updatedEntry = { ...entry, ...updates };
    return updatedEntry;
  });

  if (updatedEntry) {
    await storage.writeCollection(name, next);
  }

  return updatedEntry;
}

async function readCollection(name) {
  const storage = await getStorage();
  return storage.readCollection(name);
}

async function handleApi(req, res) {
  const origin = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${origin}`);
  const adminMatch = url.pathname.match(/^\/api\/admin\/([a-zA-Z-]+)(?:\/([^/]+))?$/);

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    if (!ADMIN_PASSWORD) {
      sendJson(res, 503, { error: 'Admin password is not configured on the server.' });
      return true;
    }

    const payload = await readRequestBody(req);
    const username = sanitizeText(payload.username, 120);
    const password = String(payload.password || '');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: 'Invalid admin credentials.' });
      return true;
    }

    sendJson(
      res,
      200,
      { ok: true, username },
      {
        'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(createSessionCookie(username))}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
      }
    );
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    sendJson(
      res,
      200,
      { ok: true },
      {
        'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
      }
    );
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/session') {
    const session = getActiveSession(req);
    if (!session) {
      sendUnauthorized(res);
      return true;
    }

    sendJson(res, 200, { ok: true, username: session.username });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const storage = await getStorage();
    sendJson(res, 200, { ok: true, service: 'the-winepress-backend', storage: storage.type });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
    const session = getActiveSession(req);
    if (!session) {
      sendUnauthorized(res);
      return true;
    }

    const overview = {};
    for (const name of adminCollections) {
      overview[name] = (await readCollection(name)).length;
    }
    sendJson(res, 200, { collections: overview });
    return true;
  }

  if (adminMatch) {
    const session = getActiveSession(req);
    if (!session) {
      sendUnauthorized(res);
      return true;
    }

    const collectionName = adminMatch[1];
    const entryId = adminMatch[2];

    if (!adminCollections.has(collectionName)) {
      sendJson(res, 404, { error: 'Collection not found.' });
      return true;
    }

    if (req.method === 'GET' && !entryId) {
      sendJson(res, 200, { items: await readCollection(collectionName) });
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
      email: sanitizeText(payload.email, 180),
      phone: sanitizeText(payload.phone, 80),
      season: sanitizeText(payload.season, 160),
      urgency: sanitizeText(payload.urgency, 40) || 'normal',
      followUp: Boolean(payload.followUp),
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

module.exports = {
  JSON_HEADERS,
  getActiveSession,
  getStorage,
  handleApi
};
