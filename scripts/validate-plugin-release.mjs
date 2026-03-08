import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['manifest.json', 'main.js', 'versions.json'];
const optionalFiles = ['styles.css'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readUtf8NoBom(fileName) {
  const fullPath = path.join(root, fileName);
  const content = await readFile(fullPath);
  const hasBom = content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf;
  assert(!hasBom, `${fileName} must be UTF-8 without BOM`);
  return content.toString('utf8');
}

async function run() {
  const requiredContent = {};
  for (const file of requiredFiles) {
    const text = await readUtf8NoBom(file);
    assert(text.trim().length > 0, `${file} is empty`);
    requiredContent[file] = text;
  }

  for (const file of optionalFiles) {
    try {
      await readUtf8NoBom(file);
    } catch (error) {
      if (!String(error.message || '').includes('ENOENT')) {
        throw error;
      }
    }
  }

  const manifest = JSON.parse(await readUtf8NoBom('manifest.json'));
  const versions = JSON.parse(await readUtf8NoBom('versions.json'));
  const mainJs = requiredContent['main.js'];

  assert(manifest.id === 'homepage', 'manifest.json id must be homepage');
  assert(typeof manifest.version === 'string' && manifest.version.length > 0, 'manifest.json version is missing');
  assert(typeof manifest.minAppVersion === 'string' && manifest.minAppVersion.length > 0, 'manifest.json minAppVersion is missing');
  assert(Object.prototype.hasOwnProperty.call(versions, manifest.version), `versions.json missing key ${manifest.version}`);
  assert(
    versions[manifest.version] === manifest.minAppVersion,
    `versions.json minAppVersion mismatch for ${manifest.version}: expected ${manifest.minAppVersion}, got ${versions[manifest.version]}`
  );
  assert(!/require\(\s*['"]\.\.?\//.test(mainJs), 'main.js must be self-contained for BRAT (no local file require)');

  console.log('[validate-plugin-release] ok');
}

run().catch((error) => {
  console.error('[validate-plugin-release] failed:', error.message);
  process.exit(1);
});
