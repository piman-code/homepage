import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const {
  ClassHomepageCore,
  DEFAULT_SETTINGS,
  getCommandDefinitions,
  normalizeNotePath,
  normalizeVaultPath,
} = require('../../plugin-core.cjs');

class FakeVault {
  constructor() {
    this.folders = new Set();
    this.files = new Map();
  }

  _normalize(pathValue) {
    return normalizeVaultPath(pathValue);
  }

  _ensureParent(pathValue) {
    const normalized = this._normalize(pathValue);
    const index = normalized.lastIndexOf('/');
    if (index <= 0) {
      return;
    }
    const folder = normalized.slice(0, index);
    const segments = folder.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      this.folders.add(current);
    }
  }

  getAbstractFileByPath(pathValue) {
    const normalized = this._normalize(pathValue);
    if (this.files.has(normalized)) {
      return this.files.get(normalized).file;
    }
    if (this.folders.has(normalized)) {
      return { path: normalized, type: 'folder' };
    }
    return null;
  }

  async createFolder(pathValue) {
    const normalized = this._normalize(pathValue);
    const segments = normalized.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      this.folders.add(current);
    }
    return { path: normalized, type: 'folder' };
  }

  async create(pathValue, content) {
    const normalized = this._normalize(pathValue);
    this._ensureParent(normalized);
    const file = { path: normalized, type: 'file' };
    this.files.set(normalized, { file, content });
    return file;
  }

  async read(file) {
    return this.files.get(this._normalize(file.path)).content;
  }

  async modify(file, content) {
    const normalized = this._normalize(file.path);
    const entry = this.files.get(normalized);
    if (!entry) {
      throw new Error(`No such file: ${normalized}`);
    }
    entry.content = content;
  }
}

class FakeWorkspace {
  constructor() {
    this.openedPaths = [];
  }

  getLeaf() {
    return {
      openFile: async (file) => {
        this.openedPaths.push(file.path);
      },
    };
  }
}

function createCore(settingsOverrides = {}) {
  const vault = new FakeVault();
  const workspace = new FakeWorkspace();
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverrides };
  const core = new ClassHomepageCore({
    app: { vault, workspace },
    settings,
    normalizePath: normalizeVaultPath,
    now: () => new Date('2026-02-28T09:00:00'),
  });
  return { core, vault, workspace };
}

function commandByName(core, name) {
  const command = getCommandDefinitions(core).find((item) => item.name === name);
  assert.ok(command, `command not found: ${name}`);
  return command;
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
    return true;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    return false;
  }
}

const results = [];

results.push(
  await runTest('command execution creates expected class-management files', async () => {
    const { core, vault } = createCore({ formLink: 'https://forms.gle/test-link' });

    await commandByName(core, '학급 홈페이지 열기').run();
    await commandByName(core, '오늘자 공지 노트 생성').run();
    await commandByName(core, '오늘자 뉴스읽기 과제 생성').run();

    assert.ok(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.ok(vault.getAbstractFileByPath('1. 공지사항/2026-02-28-공지.md'));
    assert.ok(vault.getAbstractFileByPath('3. 뉴스읽기/2026-02-28-뉴스읽기 과제.md'));
    assert.ok(vault.getAbstractFileByPath('docs/뉴스읽기-템플릿.md'));
  })
);

results.push(
  await runTest('missing homepage is auto-created and opened', async () => {
    const { core, vault, workspace } = createCore();

    assert.equal(vault.getAbstractFileByPath('홈/홈페이지.md'), null);
    await commandByName(core, '학급 홈페이지 열기').run();

    assert.ok(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.deepEqual(workspace.openedPaths, ['홈/홈페이지.md']);
  })
);

results.push(
  await runTest('news template includes frontmatter and configured form link', async () => {
    const formLink = 'https://forms.gle/demo-link';
    const { core, vault } = createCore({ formLink });

    await commandByName(core, '뉴스읽기 템플릿 생성').run();
    const file = vault.getAbstractFileByPath('docs/뉴스읽기-템플릿.md');
    const content = await vault.read(file);

    assert.match(content, /category: 3\. 뉴스읽기/);
    assert.match(content, /priority: HIGH/);
    assert.match(content, /tags: \[뉴스읽기, 시사, 토론\]/);
    assert.match(content, /source_url:/);
    assert.match(content, /difficulty: medium/);
    assert.match(content, new RegExp(formLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  })
);

results.push(
  await runTest('path normalization handles slash and backslash', async () => {
    assert.equal(normalizeNotePath('홈\\학급\\..\\홈페이지', '홈/홈페이지.md'), '홈/홈페이지.md');
    assert.equal(normalizeNotePath('3. 뉴스읽기\\2026-02-28-뉴스읽기 과제', ''), '3. 뉴스읽기/2026-02-28-뉴스읽기 과제.md');

    const { core, vault } = createCore({ homepagePath: '홈\\내반\\..\\홈페이지' });
    await commandByName(core, '학급 홈페이지 열기').run();
    assert.ok(vault.getAbstractFileByPath('홈/홈페이지.md'));
  })
);

results.push(
  await runTest('BRAT-required files exist and parse', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(testDir, '../..');
    const manifestPath = path.join(rootDir, 'manifest.json');
    const versionsPath = path.join(rootDir, 'versions.json');
    const mainPath = path.join(rootDir, 'main.js');

    const [manifestText, versionsText, mainText] = await Promise.all([
      readFile(manifestPath, 'utf8'),
      readFile(versionsPath, 'utf8'),
      readFile(mainPath, 'utf8'),
    ]);

    const manifest = JSON.parse(manifestText);
    const versions = JSON.parse(versionsText);

    assert.equal(manifest.id, 'class-homepage-brat-lite');
    assert.ok(manifest.version in versions);
    assert.equal(versions[manifest.version], manifest.minAppVersion);
    assert.match(mainText, /ClassHomepageBratLite/);
    assert.doesNotMatch(mainText, /require\(\s*['"]\.\.?\//);
  })
);

const failed = results.filter((item) => !item).length;
if (failed > 0) {
  console.error(`[plugin-acceptance] ${failed} test(s) failed`);
  process.exit(1);
}

console.log(`[plugin-acceptance] all ${results.length} tests passed`);
