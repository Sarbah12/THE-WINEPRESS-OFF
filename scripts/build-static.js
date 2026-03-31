const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIRS = [
  path.join(ROOT_DIR, 'public'),
  path.join(ROOT_DIR, 'dist')
];
const SITE_URL = (process.env.SITE_URL || 'https://thewinepressofficial.com').replace(/\/+$/, '');
const EXCLUDED_FROM_INDEXING = new Set(['admin.html']);

function normalizePath(entryName) {
  if (entryName === 'index.html') {
    return '/';
  }
  return `/${entryName.replace(/\.html$/, '')}/`;
}

function toAbsoluteUrl(pathname) {
  if (!SITE_URL) {
    return pathname;
  }
  return new URL(pathname, `${SITE_URL}/`).toString();
}

function sitemapMetaForEntry(entryName) {
  if (entryName === 'index.html') {
    return { changefreq: 'daily', priority: '1.0' };
  }
  if (entryName === 'about.html' || entryName === 'devotionals.html' || entryName === 'blog.html') {
    return { changefreq: 'weekly', priority: '0.9' };
  }
  if (entryName.startsWith('alignment')) {
    return { changefreq: 'daily', priority: '0.8' };
  }
  return { changefreq: 'weekly', priority: '0.7' };
}

function buildSitemap(entries) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = entries
    .filter(entry => entry.endsWith('.html'))
    .filter(entry => !EXCLUDED_FROM_INDEXING.has(entry))
    .sort((a, b) => {
      if (a === 'index.html') {
        return -1;
      }
      if (b === 'index.html') {
        return 1;
      }
      return a.localeCompare(b);
    })
    .map(entry => {
      const pathname = normalizePath(entry);
      const meta = sitemapMetaForEntry(entry);
      return `  <url>\n    <loc>${toAbsoluteUrl(pathname)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${meta.changefreq}</changefreq>\n    <priority>${meta.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobotsTxt() {
  const sitemapLine = SITE_URL ? `Sitemap: ${new URL('/sitemap.xml', `${SITE_URL}/`).toString()}\n` : '';
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\n\n${sitemapLine}`;
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyIfExists(sourcePath, targetPath) {
  try {
    const stats = await fs.stat(sourcePath);
    if (stats.isDirectory()) {
      await fs.cp(sourcePath, targetPath, { recursive: true });
      return;
    }

    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function writeAdminAlias(targetPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="refresh" content="0; url=/admin.html"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Redirecting...</title>
  <script>
    window.location.replace('/admin.html');
  </script>
</head>
<body></body>
</html>
`;
  await fs.writeFile(targetPath, html);
}

async function build() {
  for (const dir of OUTPUT_DIRS) {
    await ensureCleanDir(dir);
  }

  const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true });
  const htmlAndXmlEntries = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.html') && !entry.name.endsWith('.xml')) {
      continue;
    }

    if (entry.name !== 'sitemap.xml') {
      htmlAndXmlEntries.push(entry.name);
    }

    for (const dir of OUTPUT_DIRS) {
      await copyIfExists(
        path.join(ROOT_DIR, entry.name),
        path.join(dir, entry.name)
      );

      if (entry.name !== 'index.html' && entry.name.endsWith('.html')) {
        const aliasDir = path.join(dir, entry.name.replace(/\.html$/, ''));
        await fs.mkdir(aliasDir, { recursive: true });
        const aliasPath = path.join(aliasDir, 'index.html');
        if (entry.name === 'admin.html') {
          await writeAdminAlias(aliasPath);
        } else {
          await copyIfExists(
            path.join(ROOT_DIR, entry.name),
            aliasPath
          );
        }
      }
    }
  }

  for (const dir of OUTPUT_DIRS) {
    await copyIfExists(path.join(ROOT_DIR, 'assets'), path.join(dir, 'assets'));
  }

  const sitemap = buildSitemap(htmlAndXmlEntries);
  const robotsTxt = buildRobotsTxt();

  await fs.writeFile(path.join(ROOT_DIR, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(ROOT_DIR, 'robots.txt'), robotsTxt);

  for (const dir of OUTPUT_DIRS) {
    await fs.writeFile(path.join(dir, 'sitemap.xml'), sitemap);
    await fs.writeFile(path.join(dir, 'robots.txt'), robotsTxt);
  }
}

build().catch(error => {
  console.error('Failed to build static site.', error);
  process.exit(1);
});
