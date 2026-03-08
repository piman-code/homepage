import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const {
  ClassHomepageCore,
  DEFAULT_SETTINGS,
  buildHomepageTemplate,
  getCommandDefinitions,
  normalizeGoogleFormSettings,
  normalizeHomepageUiSettings,
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

    const homepageFile = vault.getAbstractFileByPath('홈/홈페이지.md');
    assert.ok(homepageFile);
    const homepageContent = await vault.read(homepageFile);

    assert.match(homepageContent, /## 🎛 오늘의 홈 대시보드/);
    assert.match(homepageContent, /```homepage-dashboard/);
    assert.match(homepageContent, /## ✍️ 오늘 한 줄 요약/);
    assert.match(homepageContent, /## 📣 오늘의 공지/);
    assert.match(homepageContent, /## ✅ 오늘의 출석/);
    assert.match(homepageContent, /## 🪙 우리반 상점/);
    assert.match(homepageContent, /## 📘 우리반 리포트/);
    assert.match(homepageContent, /## 🔒 교사용 학생 관계 그래프/);
    assert.match(homepageContent, /\[\[1\. 공지사항\/2026-02-28-공지\]\]/);
    assert.deepEqual(workspace.openedPaths, ['홈/홈페이지.md']);
  })
);

results.push(
  await runTest('existing homepage removes legacy hero intro when dashboard is refreshed', async () => {
    const { core, vault } = createCore();

    await vault.create('홈/홈페이지.md', [
      '---',
      'category: 홈',
      'priority: HIGH',
      '---',
      '',
      '# 🏫 우리 반 학급 홈페이지',
      '',
      '학생 성장과 공지 흐름을 하나의 홈에서 운영합니다.',
      '',
      '## ✍️ 오늘 한 줄 요약',
      '- [ ] 확인',
      '',
    ].join('\n'));

    await commandByName(core, '학급 홈페이지 열기').run();

    const homepageContent = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.match(homepageContent, /## 🎛 오늘의 홈 대시보드/);
    assert.doesNotMatch(homepageContent, /^# 🏫 우리 반 학급 홈페이지/m);
    assert.doesNotMatch(homepageContent, /학생 성장과 공지 흐름을 하나의 홈에서 운영합니다\./);
  })
);

results.push(
  await runTest('homepage refresh removes duplicate dashboard blocks and legacy teacher panel callout', async () => {
    const { core, vault } = createCore();

    await vault.create('홈/홈페이지.md', [
      '---',
      'category: 홈',
      'priority: HIGH',
      '---',
      '',
      '## 🎛 오늘의 홈 대시보드',
      '> [!teacher] 클릭형 운영 패널',
      '> - 아래 버튼에서 공지, 학생 성장, 칭찬 후보 흐름을 바로 실행할 수 있습니다.',
      '> - 학생 성장 요약과 칭찬 후보는 OmniForge summary JSON이 없으면 샘플 데이터로 생성됩니다.',
      '',
      '```homepage-dashboard',
      'date: 2026-02-28',
      'notice: 1. 공지사항/2026-02-28-공지.md',
      '```',
      '',
      '## ✍️ 오늘 한 줄 요약',
      '- [ ] 확인',
      '',
      '## 🎛 오늘의 홈 대시보드',
      '```homepage-dashboard',
      'date: 2026-02-28',
      'notice: 1. 공지사항/2026-02-28-공지.md',
      '```',
      '',
    ].join('\n'));

    await commandByName(core, '학급 홈페이지 열기').run();

    const homepageContent = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.equal((homepageContent.match(/## 🎛 오늘의 홈 대시보드/g) || []).length, 1);
    assert.equal((homepageContent.match(/```homepage-dashboard/g) || []).length, 1);
    assert.doesNotMatch(homepageContent, /클릭형 운영 패널/);
  })
);

results.push(
  await runTest('news template uses segmented google form setting first', async () => {
    const segmentedLink = 'https://forms.gle/segmented-link';
    const { core, vault } = createCore({
      formLink: 'https://forms.gle/legacy-link',
      googleForm: { ...DEFAULT_SETTINGS.googleForm, newsSubmissionUrl: segmentedLink },
    });

    await commandByName(core, '뉴스읽기 템플릿 생성').run();
    const file = vault.getAbstractFileByPath('docs/뉴스읽기-템플릿.md');
    const content = await vault.read(file);

    assert.match(content, /category: 3\. 뉴스읽기/);
    assert.match(content, /priority: HIGH/);
    assert.match(content, /tags: \[뉴스읽기, 시사, 토론\]/);
    assert.match(content, /source_url:/);
    assert.match(content, /difficulty: medium/);
    assert.match(content, new RegExp(segmentedLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(content, /legacy-link/);
  })
);

results.push(
  await runTest('news template falls back to legacy formLink when segmented link is empty', async () => {
    const legacyLink = 'https://forms.gle/fallback-legacy';
    const { core, vault } = createCore({
      formLink: legacyLink,
      googleForm: { ...DEFAULT_SETTINGS.googleForm, newsSubmissionUrl: '' },
    });

    await commandByName(core, '뉴스읽기 템플릿 생성').run();
    const file = vault.getAbstractFileByPath('docs/뉴스읽기-템플릿.md');
    const content = await vault.read(file);

    assert.match(content, new RegExp(legacyLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
  await runTest('settings normalization trims values and keeps homepage UI bounds safe', async () => {
    assert.deepEqual(
      normalizeGoogleFormSettings({
        newsSubmissionUrl: ' https://forms.gle/news ',
        parentSurveyUrl: ' https://forms.gle/parent ',
        weeklyCheckinUrl: ' ',
        prefillTemplate: ' https://docs.google.com/forms/d/e/... ',
        responseSheetUrl: ' https://docs.google.com/spreadsheets/d/... ',
      }),
      {
        newsSubmissionUrl: 'https://forms.gle/news',
        parentSurveyUrl: 'https://forms.gle/parent',
        weeklyCheckinUrl: '',
        prefillTemplate: 'https://docs.google.com/forms/d/e/...',
        responseSheetUrl: 'https://docs.google.com/spreadsheets/d/...',
      }
    );

    const normalizedUi = normalizeHomepageUiSettings({
      heroHeight: 999,
      heroOverlayStrength: -10,
      showRelationshipGraph: false,
      backgroundImageMode: 'mystery-mode',
      backgroundImageExternalPath: ' "~/Pictures/home hero.png" ',
    });

    assert.equal(normalizedUi.heroHeight, 640);
    assert.equal(normalizedUi.heroOverlayStrength, 10);
    assert.equal(normalizedUi.showRelationshipGraph, false);
    assert.equal(normalizedUi.backgroundImageMode, 'external');
    assert.match(normalizedUi.backgroundImageExternalPath, /Pictures\/home hero\.png$/);
  })
);

results.push(
  await runTest('homepage template keeps dashboard bridge block without duplicating hero copy', async () => {
    assert.equal(DEFAULT_SETTINGS.homepageUi.backgroundImagePath, '');
    assert.equal(DEFAULT_SETTINGS.homepageUi.backgroundImageMode, 'none');
    assert.equal(DEFAULT_SETTINGS.homepageUi.backgroundImageDataUrl, '');
    assert.equal(DEFAULT_SETTINGS.homepageUi.backgroundImageLabel, '');
    assert.equal(DEFAULT_SETTINGS.homepageUi.backgroundImageExternalPath, '');
    assert.equal(DEFAULT_SETTINGS.homepageUi.heroHeight, 360);
    assert.equal(DEFAULT_SETTINGS.homepageUi.heroOverlayStrength, 72);
    assert.equal(DEFAULT_SETTINGS.homepageUi.showRelationshipGraph, true);

    const template = buildHomepageTemplate('2026-02-28', {
      heroEmoji: '🌿',
      heroTitle: '2-1 성장 허브',
      heroSubtitle: '오늘의 공지, 출석, 우리반 상점, 리포트를 한 곳에서 정리합니다.',
      themePreset: 'forest',
      accentColor: '#2d8f5b',
    });

    assert.doesNotMatch(template, /2-1 성장 허브/);
    assert.doesNotMatch(template, /오늘의 공지, 출석, 우리반 상점, 리포트를 한 곳에서 정리합니다\./);
    assert.match(template, /theme_preset: forest/);
    assert.match(template, /accent_color: #2d8f5b/);
    assert.match(template, /```homepage-dashboard/);
    assert.match(template, /attendance: 6\. 학생성장\/일일체크인-요약\/2026-02-28-체크인 요약\.md/);
    assert.match(template, /classStore: 6\. 학생성장\/칭찬후보\/2026-02-23~2026-03-01-칭찬 후보\.md/);
    assert.match(template, /classReport: 2\. 주간학습안내\/2026-02-23~2026-03-01-주간 자동 보고\.md/);
    assert.match(template, /studentGraph: 6\. 학생성장\/관계그래프\/2026-02-28-학생 관계 그래프\.json/);
    assert.match(template, /studentGraphView: 6\. 학생성장\/관계그래프\/2026-02-28-학생 관계 그래프 뷰\.md/);
    assert.match(template, /## ✍️ 오늘 한 줄 요약/);
    assert.match(template, /## 📘 우리반 리포트/);
  })
);

results.push(
  await runTest('apply google form links updates homepage/notice/survey notes', async () => {
    const { core, vault } = createCore({
      googleForm: {
        ...DEFAULT_SETTINGS.googleForm,
        newsSubmissionUrl: 'https://forms.gle/news-submit',
        parentSurveyUrl: 'https://forms.gle/parent',
      },
    });

    await commandByName(core, '폼 링크 자동 적용').run();

    const homepage = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    const notice = await vault.read(vault.getAbstractFileByPath('1. 공지사항/2026-02-28-공지.md'));
    const survey = await vault.read(vault.getAbstractFileByPath('5. 설문/2026-02-28-설문 링크.md'));

    for (const content of [homepage, notice, survey]) {
      assert.match(content, /## 🔗 Google Form 링크/);
      assert.match(content, /https:\/\/forms\.gle\/news-submit/);
      assert.match(content, /https:\/\/forms\.gle\/parent/);
    }

    await commandByName(core, '폼 링크 자동 적용').run();
    const rerunHomepage = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    const headingCount = (rerunHomepage.match(/## 🔗 Google Form 링크/g) || []).length;
    assert.equal(headingCount, 1);
  })
);

results.push(
  await runTest('generate weekly auto report creates weekly note with core links', async () => {
    const { core, vault } = createCore({
      googleForm: {
        ...DEFAULT_SETTINGS.googleForm,
        newsSubmissionUrl: 'https://forms.gle/news-submit',
        weeklyCheckinUrl: 'https://forms.gle/weekly-checkin',
      },
    });

    await commandByName(core, '주간 자동 보고서 생성').run();

    const reportFile = vault.getAbstractFileByPath('2. 주간학습안내/2026-02-23~2026-03-01-주간 자동 보고.md');
    assert.ok(reportFile);

    const reportContent = await vault.read(reportFile);
    assert.match(reportContent, /# 2026-02-23~2026-03-01 주간 자동 보고/);
    assert.match(reportContent, /\[\[홈\/홈페이지\]\]/);
    assert.match(reportContent, /\[\[1\. 공지사항\/2026-02-28-공지\]\]/);
    assert.match(reportContent, /\[\[3\. 뉴스읽기\/2026-02-28-뉴스읽기 과제\]\]/);
    assert.match(reportContent, /https:\/\/forms\.gle\/weekly-checkin/);
  })
);

results.push(
  await runTest('student growth summary command consumes JSON summary and updates homepage section', async () => {
    const { core, vault, workspace } = createCore();
    await commandByName(core, '학급 홈페이지 열기').run();

    await vault.create(
      '6. 학생성장/일일체크인-요약/2026-02-28-체크인 요약.json',
      JSON.stringify({
        contract: 'omniforge.checkin.summary.v1',
        date: '2026-02-28',
        classroomId: 'class-2-1',
        submittedCount: 19,
        missingCount: 5,
        moodSignals: {
          stable: 12,
          low: 4,
          highEnergy: 3,
        },
        supportFlags: [
          { studentRef: 'stu_support_1', reason: 'support_request' },
        ],
        topWriters: [
          { studentRef: 'stu_writer_1', score: 0.95 },
          { studentRef: 'stu_writer_2', score: 0.9 },
        ],
      }, null, 2)
    );

    await commandByName(core, '학생 성장 요약 불러오기').run();

    const noteFile = vault.getAbstractFileByPath('6. 학생성장/일일체크인-요약/2026-02-28-체크인 요약.md');
    assert.ok(noteFile);
    const noteContent = await vault.read(noteFile);
    assert.match(noteContent, /# 2026-02-28 학생 성장 요약/);
    assert.match(noteContent, /- 제출: 19명/);
    assert.match(noteContent, /- 미제출: 5명/);
    assert.match(noteContent, /stu_writer_1: 95점/);

    const homepage = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.match(homepage, /## ✅ 오늘의 출석/);
    assert.match(homepage, /\[\[6\. 학생성장\/일일체크인-요약\/2026-02-28-체크인 요약\]\]/);
    assert.match(homepage, /지원 필요 신호: 1건/);
    assert.deepEqual(workspace.openedPaths.at(-1), '홈/홈페이지.md');
  })
);

results.push(
  await runTest('praise candidates command creates sample summary and keeps homepage section single', async () => {
    const { core, vault } = createCore();

    await commandByName(core, '칭찬 후보 요약 불러오기').run();
    await commandByName(core, '칭찬 후보 요약 불러오기').run();

    const jsonFile = vault.getAbstractFileByPath('6. 학생성장/칭찬후보/2026-02-23~2026-03-01-칭찬 후보.json');
    const noteFile = vault.getAbstractFileByPath('6. 학생성장/칭찬후보/2026-02-23~2026-03-01-칭찬 후보.md');
    assert.ok(jsonFile);
    assert.ok(noteFile);

    const noteContent = await vault.read(noteFile);
    assert.match(noteContent, /# 2026-W09 칭찬 후보 요약/);
    assert.match(noteContent, /teacher_approval_required: true/);

    const homepage = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.match(homepage, /## 🪙 우리반 상점/);
    const headingCount = (homepage.match(/## 🪙 우리반 상점/g) || []).length;
    assert.equal(headingCount, 1);
    assert.match(homepage, /\[\[6\. 학생성장\/칭찬후보\/2026-02-23~2026-03-01-칭찬 후보\]\]/);
  })
);

results.push(
  await runTest('opening homepage refreshes dated markers and rewrites synced summary sections without duplicates', async () => {
    const { core, vault } = createCore();

    await vault.create('홈/홈페이지.md', [
      '---',
      'category: 홈',
      'priority: HIGH',
      'share_updated: 2026-02-20',
      '---',
      '',
      '## 🎛 오늘의 홈 대시보드',
      '```homepage-dashboard',
      'date: 2026-02-20',
      'notice: 1. 공지사항/2026-02-20-공지.md',
      '```',
      '',
      '## 📣 학부모 소통 보드',
      '| 항목 | 오늘 내용 | 확인 |',
      '| --- | --- | --- |',
      '| 공지 링크 | [[1. 공지사항/2026-02-20-공지]] | [ ] |',
      '',
      '## 🌱 학생 성장 요약',
      '- 오늘 체크인 요약: [[6. 학생성장/일일체크인-요약/2026-02-20-체크인 요약]]',
      '- 제출 현황: 10명 제출 / 10명 미제출',
      '- 지원 필요 신호: 2건',
      '- 우수 기록자: old_writer',
      '- 오늘 체크인 요약: [[6. 학생성장/일일체크인-요약/2026-02-20-체크인 요약]]',
      '- 제출 현황: 10명 제출 / 10명 미제출',
      '',
      '## 🌟 이번 주 칭찬 후보',
      '- 후보 요약: [[6. 학생성장/칭찬후보/2026-02-16~2026-02-22-칭찬 후보]]',
      '- 기록 성실: old_writer',
      '',
    ].join('\n'));

    await vault.create(
      '6. 학생성장/일일체크인-요약/2026-02-28-체크인 요약.json',
      JSON.stringify({
        contract: 'omniforge.checkin.summary.v1',
        date: '2026-02-28',
        classroomId: 'class-2-1',
        submittedCount: 23,
        missingCount: 1,
        supportFlags: [{ studentRef: 'stu_need_help', reason: 'support_request' }],
        topWriters: [{ studentRef: 'stu_writer_today', score: 0.93 }],
      }, null, 2)
    );

    await vault.create(
      '6. 학생성장/칭찬후보/2026-02-23~2026-03-01-칭찬 후보.json',
      JSON.stringify({
        contract: 'omniforge.praise.candidates.v1',
        period: '2026-W09',
        categories: {
          daily_writer: [{ studentRef: 'stu_writer_today', score: 0.91 }],
          goal_keeper: [{ studentRef: 'stu_goal_keeper', score: 0.82 }],
          question_asker: [{ studentRef: 'stu_question', score: 0.8 }],
        },
      }, null, 2)
    );

    await commandByName(core, '학급 홈페이지 열기').run();

    const homepage = await vault.read(vault.getAbstractFileByPath('홈/홈페이지.md'));
    assert.match(homepage, /share_updated: 2026-02-28/);
    assert.match(homepage, /\| 공지 링크 \| \[\[1\. 공지사항\/2026-02-28-공지\]\] \| \[ \] \|/);
    assert.match(homepage, /23명 제출 \/ 1명 미제출/);
    assert.match(homepage, /stu_writer_today/);
    assert.equal((homepage.match(/출석 요약 노트:/g) || []).length, 1);
    assert.equal((homepage.match(/## ✅ 오늘의 출석/g) || []).length, 1);
    assert.match(homepage, /stu_goal_keeper/);
    assert.equal((homepage.match(/## 🪙 우리반 상점/g) || []).length, 1);
    assert.equal((homepage.match(/## ✍️ 오늘 한 줄 요약/g) || []).length, 1);
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

    assert.equal(manifest.id, 'homepage');
    assert.ok(manifest.version in versions);
    assert.equal(versions[manifest.version], manifest.minAppVersion);
    assert.match(mainText, /ClassHomepageBratLite/);
    assert.match(mainText, /registerMarkdownCodeBlockProcessor\('homepage-dashboard'/);
    assert.match(mainText, /registerMarkdownCodeBlockProcessor\('student-relationship-graph'/);
    assert.match(mainText, /getLeaf\('tab'\)/);
    assert.match(mainText, /backgroundImageExternalPath/);
    assert.match(mainText, /backgroundImageDataUrl/);
    assert.match(mainText, /backgroundImageLabel/);
    assert.match(mainText, /pickHomepageImageFile/);
    assert.match(mainText, /readVaultImageAsDataUrl/);
    assert.match(mainText, /studentGraph:/);
    assert.match(mainText, /studentGraphView:/);
    assert.match(mainText, /pointerdown/);
    assert.match(mainText, /pathToFileURL/);
    assert.match(mainText, /heroOverlayStrength/);
    assert.match(mainText, /showRelationshipGraph/);
    assert.match(mainText, /heroHeight/);
    assert.doesNotMatch(mainText, /require\(\s*['"]\.\.?\//);
  })
);

const failed = results.filter((item) => !item).length;
if (failed > 0) {
  console.error(`[plugin-acceptance] ${failed} test(s) failed`);
  process.exit(1);
}

console.log(`[plugin-acceptance] all ${results.length} tests passed`);
