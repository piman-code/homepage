'use strict';

const { Plugin, PluginSettingTab, Setting, Notice, normalizePath } = require('obsidian');

const DEFAULT_SETTINGS = Object.freeze({
  homepagePath: '홈/홈페이지.md',
  newsFolder: '3. 뉴스읽기',
  formLink: '',
});

const REQUIRED_FOLDERS = Object.freeze([
  '홈',
  '1. 공지사항',
  '2. 주간학습안내',
  '3. 뉴스읽기',
  '4. 수업활동',
  '5. 설문',
  '999-Attachments',
  'docs',
]);

const DEFAULT_PATHS = Object.freeze({
  homepage: '홈/홈페이지.md',
  newsTemplate: 'docs/뉴스읽기-템플릿.md',
  noticeFolder: '1. 공지사항',
});

const COMMAND_SPECS = Object.freeze([
  { id: 'open-class-homepage', name: '학급 홈페이지 열기', method: 'openHomepage' },
  { id: 'append-today-notice-section', name: '오늘 공지 섹션 추가', method: 'appendTodayNoticeSection' },
  { id: 'create-news-reading-template', name: '뉴스읽기 템플릿 생성', method: 'createNewsTemplateNote' },
  { id: 'regenerate-class-structure', name: '학급 기본 구조 재생성(백업 후 덮어쓰기)', method: 'regenerateStructureWithBackup' },
  { id: 'create-today-notice-note', name: '오늘자 공지 노트 생성', method: 'createTodayNoticeNote' },
  { id: 'create-today-news-assignment', name: '오늘자 뉴스읽기 과제 생성', method: 'createTodayNewsAssignment' },
]);

function normalizeSlashes(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function normalizeVaultPath(value, fallback = '') {
  const source = normalizeSlashes((value || fallback || '').trim());
  const segments = [];
  for (const segment of source.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (segments.length > 0) {
        segments.pop();
      }
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

function normalizeNotePath(value, fallback = '') {
  const normalized = normalizeVaultPath(value, fallback);
  if (!normalized) {
    return '';
  }
  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTimestamp(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function buildHomepageTemplate(dateText) {
  return [
    '---',
    'category: 홈',
    'target: 학부모/학생',
    `updated: ${dateText}`,
    '---',
    '',
    '# 학급 홈페이지',
    '',
    '> [!info] 기본 운영 정보',
    '> - 대상: 학부모 · 학생',
    '> - 업데이트 주기: 매일 1회 이상',
    '> - 문의: 클래스룸 메시지 또는 담임 이메일',
    '',
    '## 오늘 공지 체크리스트',
    `- [ ] ${dateText} 공지 게시`,
    '- [ ] 준비물/일정 확인 요청',
    '- [ ] 결석·지각 안내 반영',
    '',
    '## 이번 주 학습 일정',
    '| 요일 | 학습 주제 | 준비물 | 비고 |',
    '| --- | --- | --- | --- |',
    '| 월 |  |  |  |',
    '| 화 |  |  |  |',
    '| 수 |  |  |  |',
    '| 목 |  |  |  |',
    '| 금 |  |  |  |',
    '',
    '## 과제 안내 표',
    '| 과목 | 과제 | 제출 기한 | 제출 위치 |',
    '| --- | --- | --- | --- |',
    '| 국어 |  |  |  |',
    '| 수학 |  |  |  |',
    '| 사회/과학 |  |  |  |',
    '',
    '## 빠른 링크',
    '- [[1. 공지사항]]',
    '- [[2. 주간학습안내]]',
    '- [[3. 뉴스읽기]]',
    '- [[4. 수업활동]]',
    '- [[5. 설문]]',
    '',
    '## 학부모 소통 바로가기',
    '- 공지 확인: [[1. 공지사항]]',
    '- 설문 참여: [[5. 설문]]',
    '- 개별 문의: 클래스룸 메시지',
    '',
    '> [!teacher] 교사용 체크리스트',
    '> - [ ] 오늘 공지 확인',
    '> - [ ] 주간학습안내 업데이트',
    '> - [ ] 뉴스읽기 과제 링크 점검',
    '> - [ ] 누락 제출자 확인',
    '',
  ].join('\n');
}

function buildNoticeTemplate(dateText) {
  return [
    '---',
    'category: 1. 공지사항',
    'priority: HIGH',
    'tags: [공지, 학부모, 안내]',
    'share_link:',
    'share_updated:',
    '---',
    '',
    `# 학부모님께 드리는 말씀 (${dateText})`,
    '',
    '## 핵심 안내',
    '- ',
    '',
    '## 일정/준비물',
    '- ',
    '',
    '## 학부모 확인 포인트',
    '- ',
    '',
    '## 문의 방법',
    '- 클래스룸 메시지',
    '- 담임 이메일',
    '',
  ].join('\n');
}

function buildNewsTemplate(options = {}) {
  const dateText = options.dateText || '';
  const formLink = String(options.formLink || '').trim();
  const title = dateText ? `# 뉴스읽기 과제 (${dateText})` : '# 뉴스읽기 과제 템플릿';
  const submission = formLink ? formLink : '[구글폼 링크 입력]';

  return [
    '---',
    'category: 3. 뉴스읽기',
    'priority: HIGH',
    'tags: [뉴스읽기, 시사, 토론]',
    'source_url:',
    'difficulty: medium',
    '---',
    '',
    title,
    '',
    '## 기사 제목/출처/링크',
    '- 기사 제목:',
    '- 출처:',
    '- 링크:',
    '',
    '## 핵심 요약(3줄)',
    '1. ',
    '2. ',
    '3. ',
    '',
    '## 근거 찾기(2개)',
    '- 근거 1:',
    '- 근거 2:',
    '',
    '## 내 생각(2~3문장)',
    '- ',
    '',
    '## 토론 질문',
    '- ',
    '',
    '## 제출(구글폼 링크)',
    `- ${submission}`,
    '',
  ].join('\n');
}

class ClassHomepageCore {
  constructor(context) {
    this.app = context.app;
    this.settings = context.settings;
    this.normalizePath = context.normalizePath || normalizeVaultPath;
    this.now = context.now || (() => new Date());
  }

  getToday() {
    return formatDate(this.now());
  }

  getHomepagePath() {
    return this.normalizePath(normalizeNotePath(this.settings.homepagePath, DEFAULT_PATHS.homepage));
  }

  getNewsFolderPath() {
    return this.normalizePath(normalizeVaultPath(this.settings.newsFolder, DEFAULT_SETTINGS.newsFolder));
  }

  getNewsTemplatePath() {
    return this.normalizePath(normalizeNotePath(DEFAULT_PATHS.newsTemplate, DEFAULT_PATHS.newsTemplate));
  }

  getTodayNoticePath(dateText) {
    return this.normalizePath(normalizeNotePath(`${DEFAULT_PATHS.noticeFolder}/${dateText}-공지.md`));
  }

  getTodayNewsPath(dateText) {
    return this.normalizePath(normalizeNotePath(`${this.getNewsFolderPath()}/${dateText}-뉴스읽기 과제.md`));
  }

  async ensureFolder(pathValue) {
    const folderPath = this.normalizePath(normalizeVaultPath(pathValue));
    if (!folderPath) {
      return false;
    }
    if (this.app.vault.getAbstractFileByPath(folderPath)) {
      return false;
    }
    await this.app.vault.createFolder(folderPath);
    return true;
  }

  async ensureParentFolder(filePath) {
    const normalized = this.normalizePath(normalizeVaultPath(filePath));
    const index = normalized.lastIndexOf('/');
    if (index <= 0) {
      return;
    }

    const folderPath = normalized.slice(0, index);
    const segments = folderPath.split('/');
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      await this.ensureFolder(current);
    }
  }

  async ensureRequiredFolders() {
    let created = 0;
    for (const folder of REQUIRED_FOLDERS) {
      if (await this.ensureFolder(folder)) {
        created += 1;
      }
    }
    return created;
  }

  async openFileByPath(pathValue) {
    const normalized = this.normalizePath(pathValue);
    const file = this.app.vault.getAbstractFileByPath(normalized);
    await this.app.workspace.getLeaf(true).openFile(file);
    return file;
  }

  async backupFile(pathValue, originalContent, stamp) {
    const backupBase = `999-Attachments/backups/${stamp}`;
    const backupPath = normalizeNotePath(`${backupBase}/${pathValue}`);
    await this.ensureParentFolder(backupPath);
    await this.app.vault.create(this.normalizePath(backupPath), originalContent);
    return this.normalizePath(backupPath);
  }

  async createOrUpdateNote(pathValue, content, options = {}) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    await this.ensureParentFolder(normalized);
    const existing = this.app.vault.getAbstractFileByPath(normalized);

    if (!existing) {
      const file = await this.app.vault.create(normalized, content);
      return { file, path: normalized, created: true, overwritten: false, backupPath: '' };
    }

    if (!options.overwrite) {
      return { file: existing, path: normalized, created: false, overwritten: false, backupPath: '' };
    }

    let backupPath = '';
    if (options.backup) {
      const current = await this.app.vault.read(existing);
      backupPath = await this.backupFile(normalized, current, options.backupStamp || formatTimestamp(this.now()));
    }

    await this.app.vault.modify(existing, content);
    return { file: existing, path: normalized, created: false, overwritten: true, backupPath };
  }

  async createInitialStructure(options = {}) {
    const folderCreated = await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const homepageResult = await this.createOrUpdateNote(
      this.getHomepagePath(),
      buildHomepageTemplate(dateText),
      options
    );
    const newsTemplateResult = await this.createOrUpdateNote(
      this.getNewsTemplatePath(),
      buildNewsTemplate({ formLink: this.settings.formLink }),
      options
    );

    const fileCreated = [homepageResult, newsTemplateResult].filter((result) => result.created).length;
    const fileOverwritten = [homepageResult, newsTemplateResult].filter((result) => result.overwritten).length;
    const backupPaths = [homepageResult.backupPath, newsTemplateResult.backupPath].filter(Boolean);

    return {
      folderCreated,
      fileCreated,
      fileOverwritten,
      backupPaths,
      homepagePath: homepageResult.path,
    };
  }

  async openHomepage() {
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    await this.openFileByPath(summary.homepagePath);
    return {
      notice: `학급 홈페이지를 열었습니다: ${summary.homepagePath}`,
      summary,
    };
  }

  async appendTodayNoticeSection() {
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    const homepagePath = summary.homepagePath;
    const file = this.app.vault.getAbstractFileByPath(homepagePath);
    const oldContent = await this.app.vault.read(file);
    const dateText = this.getToday();
    const header = `## 오늘 공지 체크리스트 (${dateText})`;
    if (oldContent.includes(header)) {
      await this.openFileByPath(homepagePath);
      return { notice: `오늘 공지 섹션이 이미 존재합니다: ${dateText}` };
    }

    const appended = [
      '',
      header,
      '- [ ] 공지 제목 작성',
      '- [ ] 전달 대상 점검',
      '- [ ] 학부모 확인 요청',
      '',
    ].join('\n');
    await this.app.vault.modify(file, `${oldContent.trimEnd()}\n${appended}`);
    await this.openFileByPath(homepagePath);
    return { notice: `오늘 공지 섹션을 추가했습니다: ${dateText}` };
  }

  async createNewsTemplateNote() {
    await this.ensureRequiredFolders();
    const result = await this.createOrUpdateNote(
      this.getNewsTemplatePath(),
      buildNewsTemplate({ formLink: this.settings.formLink }),
      { overwrite: false, backup: false }
    );
    await this.openFileByPath(result.path);
    return {
      notice: result.created
        ? `뉴스읽기 템플릿을 생성했습니다: ${result.path}`
        : `뉴스읽기 템플릿이 이미 있습니다: ${result.path}`,
    };
  }

  async createTodayNoticeNote() {
    await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const result = await this.createOrUpdateNote(
      this.getTodayNoticePath(dateText),
      buildNoticeTemplate(dateText),
      { overwrite: false, backup: false }
    );
    await this.openFileByPath(result.path);
    return {
      notice: result.created
        ? `오늘자 공지 노트를 생성했습니다: ${result.path}`
        : `오늘자 공지 노트가 이미 있습니다: ${result.path}`,
    };
  }

  async createTodayNewsAssignment() {
    await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const result = await this.createOrUpdateNote(
      this.getTodayNewsPath(dateText),
      buildNewsTemplate({ dateText, formLink: this.settings.formLink }),
      { overwrite: false, backup: false }
    );
    await this.openFileByPath(result.path);
    return {
      notice: result.created
        ? `오늘자 뉴스읽기 과제를 생성했습니다: ${result.path}`
        : `오늘자 뉴스읽기 과제가 이미 있습니다: ${result.path}`,
    };
  }

  async regenerateStructureWithBackup() {
    const backupStamp = formatTimestamp(this.now());
    const summary = await this.createInitialStructure({
      overwrite: true,
      backup: true,
      backupStamp,
    });
    await this.openFileByPath(summary.homepagePath);
    const backupCount = summary.backupPaths.length;
    return {
      notice: `기본 구조를 재생성했습니다. 백업 ${backupCount}건: 999-Attachments/backups/${backupStamp}`,
      summary,
    };
  }
}

function getCommandDefinitions(core) {
  return COMMAND_SPECS.map((command) => ({
    id: command.id,
    name: command.name,
    run: () => core[command.method](),
  }));
}

module.exports = class ClassHomepageBratLite extends Plugin {
  async onload() {
    await this.loadSettings();
    this.rebuildCore();

    for (const command of getCommandDefinitions(this.core)) {
      this.addCommand({
        id: command.id,
        name: command.name,
        callback: async () => {
          await this.executeCommand(command);
        },
      });
    }

    this.addRibbonIcon('home', '학급 홈페이지 열기', async () => {
      const command = getCommandDefinitions(this.core).find((item) => item.id === 'open-class-homepage');
      if (command) {
        await this.executeCommand(command);
      }
    });

    this.addSettingTab(new ClassHomepageSettingTab(this.app, this));
  }

  rebuildCore() {
    this.core = new ClassHomepageCore({
      app: this.app,
      settings: this.settings,
      normalizePath,
      now: () => new Date(),
    });
  }

  async executeCommand(command) {
    try {
      const result = await command.run();
      if (result && result.notice) {
        new Notice(result.notice);
      }
    } catch (error) {
      console.error('[class-homepage-brat-lite] command error', command.id, error);
      new Notice(`${command.name} 실행 중 오류가 발생했습니다.`);
    }
  }

  async ensureInitialStructureSafe() {
    try {
      const summary = await this.core.createInitialStructure({ overwrite: false, backup: false });
      new Notice(`초기 구조 생성 완료: 폴더 ${summary.folderCreated}개, 파일 ${summary.fileCreated}개 생성`);
    } catch (error) {
      console.error('[class-homepage-brat-lite] ensureInitialStructureSafe error', error);
      new Notice('초기 구조 생성에 실패했습니다.');
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class ClassHomepageSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Class Homepage BRAT Lite 설정' });

    new Setting(containerEl)
      .setName('홈페이지 노트 경로')
      .setDesc('예: 홈/홈페이지.md (슬래시/백슬래시 모두 허용)')
      .addText((text) =>
        text
          .setPlaceholder('홈/홈페이지.md')
          .setValue(this.plugin.settings.homepagePath)
          .onChange(async (value) => {
            this.plugin.settings.homepagePath = value.trim();
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
          })
      );

    new Setting(containerEl)
      .setName('뉴스읽기 폴더')
      .setDesc('예: 3. 뉴스읽기')
      .addText((text) =>
        text
          .setPlaceholder('3. 뉴스읽기')
          .setValue(this.plugin.settings.newsFolder)
          .onChange(async (value) => {
            this.plugin.settings.newsFolder = value.trim();
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
          })
      );

    new Setting(containerEl)
      .setName('구글폼 링크')
      .setDesc('뉴스읽기 템플릿/오늘자 과제의 제출 섹션에 자동 삽입')
      .addText((text) =>
        text
          .setPlaceholder('https://forms.gle/...')
          .setValue(this.plugin.settings.formLink)
          .onChange(async (value) => {
            this.plugin.settings.formLink = value.trim();
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
          })
      );

    new Setting(containerEl)
      .setName('초기 구조 생성')
      .setDesc('기존 파일은 유지하고 누락된 기본 폴더/파일만 생성합니다.')
      .addButton((button) =>
        button.setButtonText('초기 구조 생성').setCta().onClick(async () => {
          await this.plugin.ensureInitialStructureSafe();
        })
      );
  }
}
