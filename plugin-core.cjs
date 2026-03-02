'use strict';

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
  { id: 'apply-miricanvas-homepage-template', name: '미리캔버스 스타일 홈페이지 적용', method: 'applyMiricanvasHomepageTemplate' },
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
    'priority: HIGH',
    'tags: [홈페이지, 학급운영, 공지]',
    'share_link:',
    `share_updated: ${dateText}`,
    'target: 학부모/학생',
    '---',
    '',
    '# 🏫 학급 홈페이지',
    '',
    '> [!info] 운영 안내',
    '> - 대상: 학부모 · 학생',
    '> - 업데이트: 매일 수업 전/후',
    '> - 문의: 클래스룸 메시지 또는 담임 이메일',
    '',
    '## 🧭 오늘 운영 루틴 (수업 전/중/후)',
    '',
    '### 1) 수업 전',
    '- [ ] 출결/결석 사유 확인',
    '- [ ] 오늘 공지 핵심 문구 작성',
    '- [ ] 준비물/과제 링크 점검',
    '',
    '### 2) 수업 중',
    '- [ ] 활동 안내 시 공지 링크 공유',
    '- [ ] 이해도/지원 필요 학생 메모',
    '',
    '### 3) 수업 후',
    '- [ ] 오늘 공지/과제 최종 업데이트',
    '- [ ] 학부모 확인 요청 문구 발송',
    '- [ ] 미제출/추가 안내 대상 체크',
    '',
    '## 📣 학부모 소통 보드',
    '| 항목 | 오늘 내용 | 확인 |',
    '| --- | --- | --- |',
    '| 핵심 전달 문구 |  | [ ] |',
    '| 준비물/일정 |  | [ ] |',
    `| 공지 링크 | [[1. 공지사항/${dateText}-공지]] | [ ] |`,
    '| 설문/응답 링크 |  | [ ] |',
    '',
    '## 🔔 오늘 공지',
    `- [ ] ${dateText} 공지 게시`,
    '- [ ] 준비물/일정 확인 안내',
    '- [ ] 미제출/변경사항 반영',
    '',
    '## 📅 이번 주 학습 일정',
    '| 요일 | 학습 주제 | 준비물 | 전달 상태 |',
    '| --- | --- | --- | --- |',
    '| 월 |  |  | [ ] |',
    '| 화 |  |  | [ ] |',
    '| 수 |  |  | [ ] |',
    '| 목 |  |  | [ ] |',
    '| 금 |  |  | [ ] |',
    '',
    '## 📝 과제 제출 링크',
    '| 과목 | 과제 | 제출 기한 | 제출 위치(링크) |',
    '| --- | --- | --- | --- |',
    '| 국어 |  |  |  |',
    '| 수학 |  |  |  |',
    '| 사회/과학 |  |  |  |',
    '',
    '## 🔗 빠른 실행',
    '- [[1. 공지사항]] 새 공지 작성',
    '- [[2. 주간학습안내]] 이번 주 계획 확인',
    '- [[3. 뉴스읽기]] 오늘 과제 배부',
    '- [[5. 설문]] 제출 현황 확인',
    '',
    '## 🧾 학부모 전달용 문구(복사)',
    '- 오늘 학급 공지와 준비물 안내를 업데이트했습니다. 확인 부탁드립니다.',
    '- 뉴스읽기 과제와 설문 링크를 함께 전달합니다.',
    '- 문의는 클래스룸 메시지로 보내주세요.',
    '',
    '> [!teacher] 교사용 체크리스트',
    '> - [ ] 오늘 공지 확인',
    '> - [ ] 주간학습안내 업데이트',
    '> - [ ] 뉴스읽기/설문 링크 점검',
    '> - [ ] 결석·지각 학생 안내 처리',
    '',
  ].join('\n');
}

function buildMiricanvasHomepageTemplate(dateText) {
  return [
    '---',
    'category: 홈',
    'priority: HIGH',
    'tags: [홈페이지, 학급운영, 학부모, 공지]',
    'share_link:',
    `share_updated: ${dateText}`,
    'target: 학부모/학생',
    'theme: miricanvas-like',
    '---',
    '',
    '# 학부모님께 드리는 말씀',
    '',
    '## Properties',
    '- share_link: ',
    `- share_updated: ${dateText}`,
    '- priority: HIGH',
    '- tags: 공지, 학부모, 안내',
    '- category: 1. 공지사항',
    '',
    '> [!note] 배너 영역',
    '> - 미리캔버스에서 만든 배너를 첨부하세요',
    '> - 예시: ![[999-Attachments/학부모공지-배너.png]]',
    '',
    '## 인사말',
    '- 안녕하세요. 이번 주 학급 운영 핵심 안내를 드립니다.',
    '',
    '## 교육 목표',
    '1. 기본 학습 습관 형성',
    '2. 협력적 문제 해결',
    '3. 자기주도 학습 강화',
    '',
    '## 이번 주 공지',
    '- [ ] 핵심 공지 1',
    '- [ ] 핵심 공지 2',
    '',
    '## 준비물/일정',
    '| 항목 | 내용 | 확인 |',
    '| --- | --- | --- |',
    '| 준비물 |  | [ ] |',
    '| 주요 일정 |  | [ ] |',
    '| 제출 과제 |  | [ ] |',
    '',
    '## 빠른 이동',
    '- [[1. 공지사항]]',
    '- [[2. 주간학습안내]]',
    '- [[3. 뉴스읽기]]',
    '- [[4. 수업활동]]',
    '- [[5. 설문]]',
    '',
    '## 학부모 확인 요청',
    '- [ ] 공지 확인 완료',
    '- [ ] 준비물 확인 완료',
    '- [ ] 문의사항 전달',
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
    const header = `## 🔔 오늘 공지 (${dateText})`;
    const legacyHeader = `## 오늘 공지 체크리스트 (${dateText})`;
    if (oldContent.includes(header) || oldContent.includes(legacyHeader)) {
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

  async applyMiricanvasHomepageTemplate() {
    await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const result = await this.createOrUpdateNote(
      this.getHomepagePath(),
      buildMiricanvasHomepageTemplate(dateText),
      { overwrite: true, backup: true, backupStamp: formatTimestamp(this.now()) }
    );
    await this.openFileByPath(result.path);
    return { notice: `미리캔버스 스타일 홈페이지를 적용했습니다: ${result.path}` };
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

module.exports = {
  COMMAND_SPECS,
  DEFAULT_PATHS,
  DEFAULT_SETTINGS,
  REQUIRED_FOLDERS,
  ClassHomepageCore,
  buildHomepageTemplate,
  buildMiricanvasHomepageTemplate,
  buildNewsTemplate,
  buildNoticeTemplate,
  formatDate,
  getCommandDefinitions,
  normalizeNotePath,
  normalizeVaultPath,
};
