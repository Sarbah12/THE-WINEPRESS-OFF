const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

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

async function build() {
  await ensureCleanDir(DIST_DIR);

  const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.html') && !entry.name.endsWith('.xml')) {
      continue;
    }

    await copyIfExists(
      path.join(ROOT_DIR, entry.name),
      path.join(DIST_DIR, entry.name)
    );
  }

  await copyIfExists(path.join(ROOT_DIR, 'assets'), path.join(DIST_DIR, 'assets'));
}

build().catch(error => {
  console.error('Failed to build static site.', error);
  process.exit(1);
});
