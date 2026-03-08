'use strict';

const os = require('os');
const path = require('path');

const HOMEPAGE_THEME_PRESETS = Object.freeze(['sunrise', 'ocean', 'forest']);
const HOMEPAGE_BACKGROUND_MODES = Object.freeze(['none', 'embedded', 'vault', 'external']);

const DEFAULT_HOMEPAGE_UI = Object.freeze({
  heroEmoji: '🏫',
  heroTitle: '우리 반 학급 홈페이지',
  heroSubtitle: '오늘의 공지, 출석, 우리반 상점, 리포트를 한 곳에서 정리합니다.',
  themePreset: 'sunrise',
  accentColor: '#2f6fdd',
  heroHeight: 360,
  heroOverlayStrength: 72,
  showRelationshipGraph: true,
  backgroundImageMode: 'none',
  backgroundImageDataUrl: '',
  backgroundImageLabel: '',
  backgroundImagePath: '',
  backgroundImageExternalPath: '',
});

const DEFAULT_SETTINGS = Object.freeze({
  homepagePath: '홈/홈페이지.md',
  newsFolder: '3. 뉴스읽기',
  formLink: '',
  homepageUi: DEFAULT_HOMEPAGE_UI,
  googleForm: {
    newsSubmissionUrl: '',
    parentSurveyUrl: '',
    weeklyCheckinUrl: '',
    prefillTemplate: '',
    responseSheetUrl: '',
  },
});

const REQUIRED_FOLDERS = Object.freeze([
  '홈',
  '1. 공지사항',
  '2. 주간학습안내',
  '3. 뉴스읽기',
  '4. 수업활동',
  '5. 설문',
  '6. 학생성장',
  '6. 학생성장/일일체크인-요약',
  '6. 학생성장/목표추적-요약',
  '6. 학생성장/질문활동-요약',
  '6. 학생성장/관계그래프',
  '6. 학생성장/칭찬후보',
  '999-Attachments',
  'docs',
  'docs/contracts',
]);

const DEFAULT_PATHS = Object.freeze({
  homepage: '홈/홈페이지.md',
  newsTemplate: 'docs/뉴스읽기-템플릿.md',
  noticeFolder: '1. 공지사항',
});

function normalizeGoogleFormSettings(value = {}) {
  return {
    newsSubmissionUrl: String(value.newsSubmissionUrl || '').trim(),
    parentSurveyUrl: String(value.parentSurveyUrl || '').trim(),
    weeklyCheckinUrl: String(value.weeklyCheckinUrl || '').trim(),
    prefillTemplate: String(value.prefillTemplate || '').trim(),
    responseSheetUrl: String(value.responseSheetUrl || '').trim(),
  };
}

const COMMAND_SPECS = Object.freeze([
  { id: 'open-class-homepage', name: '학급 홈페이지 열기', method: 'openHomepage' },
  { id: 'append-today-notice-section', name: '오늘 공지 섹션 추가', method: 'appendTodayNoticeSection' },
  { id: 'create-news-reading-template', name: '뉴스읽기 템플릿 생성', method: 'createNewsTemplateNote' },
  { id: 'regenerate-class-structure', name: '학급 기본 구조 재생성(백업 후 덮어쓰기)', method: 'regenerateStructureWithBackup' },
  { id: 'create-today-notice-note', name: '오늘자 공지 노트 생성', method: 'createTodayNoticeNote' },
  { id: 'create-today-news-assignment', name: '오늘자 뉴스읽기 과제 생성', method: 'createTodayNewsAssignment' },
  { id: 'apply-google-form-links', name: '폼 링크 자동 적용', method: 'applyGoogleFormLinks' },
  { id: 'generate-weekly-auto-report', name: '주간 자동 보고서 생성', method: 'generateWeeklyAutoReport' },
  { id: 'load-student-growth-summary', name: '학생 성장 요약 불러오기', method: 'loadStudentGrowthSummary' },
  { id: 'load-praise-candidates-summary', name: '칭찬 후보 요약 불러오기', method: 'loadPraiseCandidatesSummary' },
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

function normalizeExternalImagePath(value, fallback = '') {
  const raw = String(value || fallback || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) {
    return '';
  }
  if (/^(?:https?|file):\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith('~/')) {
    return path.join(os.homedir(), raw.slice(2));
  }
  return raw;
}

function resolveHomepageBackgroundMode(modeValue, vaultPath, externalPath, dataUrl) {
  const mode = String(modeValue || '').trim();
  if (HOMEPAGE_BACKGROUND_MODES.includes(mode)) {
    return mode;
  }
  if (dataUrl) {
    return 'embedded';
  }
  if (externalPath) {
    return 'external';
  }
  if (vaultPath) {
    return 'vault';
  }
  return 'none';
}

function normalizeDataUrl(value, fallback = '') {
  const normalized = String(value || fallback || '').trim();
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized) ? normalized : '';
}

function normalizeBackgroundLabel(value, fallback = '') {
  return String(value || fallback || '').trim();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizeHeroHeight(value, fallback = DEFAULT_HOMEPAGE_UI.heroHeight) {
  return Math.round(clampNumber(value, 240, 640, fallback));
}

function normalizeHeroOverlayStrength(value, fallback = DEFAULT_HOMEPAGE_UI.heroOverlayStrength) {
  return Math.round(clampNumber(value, 10, 100, fallback));
}

function normalizeBooleanSetting(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return fallback;
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

function getWeekRange(date) {
  const base = new Date(date);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(base);
  start.setDate(base.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function normalizeAccentColor(value, fallback = DEFAULT_HOMEPAGE_UI.accentColor) {
  const normalized = String(value || '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
}

function normalizeHomepageUiSettings(value = {}) {
  const themePreset = String(value.themePreset || '').trim();
  const backgroundImageDataUrl = normalizeDataUrl(value.backgroundImageDataUrl, '');
  const backgroundImagePath = normalizeVaultPath(value.backgroundImagePath, '');
  const backgroundImageExternalPath = normalizeExternalImagePath(value.backgroundImageExternalPath, '');
  const backgroundImageLabel = normalizeBackgroundLabel(
    value.backgroundImageLabel,
    backgroundImagePath || backgroundImageExternalPath,
  );
  return {
    heroEmoji: String(value.heroEmoji || DEFAULT_HOMEPAGE_UI.heroEmoji).trim() || DEFAULT_HOMEPAGE_UI.heroEmoji,
    heroTitle: String(value.heroTitle || DEFAULT_HOMEPAGE_UI.heroTitle).trim() || DEFAULT_HOMEPAGE_UI.heroTitle,
    heroSubtitle: String(value.heroSubtitle || DEFAULT_HOMEPAGE_UI.heroSubtitle).trim() || DEFAULT_HOMEPAGE_UI.heroSubtitle,
    themePreset: HOMEPAGE_THEME_PRESETS.includes(themePreset) ? themePreset : DEFAULT_HOMEPAGE_UI.themePreset,
    accentColor: normalizeAccentColor(value.accentColor, DEFAULT_HOMEPAGE_UI.accentColor),
    heroHeight: normalizeHeroHeight(value.heroHeight, DEFAULT_HOMEPAGE_UI.heroHeight),
    heroOverlayStrength: normalizeHeroOverlayStrength(value.heroOverlayStrength, DEFAULT_HOMEPAGE_UI.heroOverlayStrength),
    showRelationshipGraph: normalizeBooleanSetting(value.showRelationshipGraph, DEFAULT_HOMEPAGE_UI.showRelationshipGraph),
    backgroundImageMode: resolveHomepageBackgroundMode(value.backgroundImageMode, backgroundImagePath, backgroundImageExternalPath, backgroundImageDataUrl),
    backgroundImageDataUrl,
    backgroundImageLabel,
    backgroundImagePath,
    backgroundImageExternalPath,
  };
}

function formatIsoWeek(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${pad2(weekNumber)}`;
}

function buildSampleCheckinSummary(dateText) {
  return {
    contract: 'omniforge.checkin.summary.v1',
    date: dateText,
    classroomId: 'class-2-1',
    submittedCount: 21,
    missingCount: 3,
    moodSignals: {
      stable: 14,
      low: 5,
      highEnergy: 2,
    },
    supportFlags: [
      { studentRef: 'stu_ab12cd34', reason: 'support_request' },
    ],
    topWriters: [
      { studentRef: 'stu_ef56gh78', score: 0.91 },
      { studentRef: 'stu_ij90kl12', score: 0.87 },
      { studentRef: 'stu_mn34op56', score: 0.83 },
    ],
  };
}

function buildSamplePraiseCandidates(period) {
  return {
    contract: 'omniforge.praise.candidates.v1',
    period,
    classroomId: 'class-2-1',
    categories: {
      daily_writer: [
        { studentRef: 'stu_ef56gh78', score: 0.93 },
        { studentRef: 'stu_ij90kl12', score: 0.89 },
      ],
      goal_keeper: [
        { studentRef: 'stu_qr78st90', score: 0.88 },
      ],
      question_asker: [
        { studentRef: 'stu_uv12wx34', score: 0.9 },
      ],
    },
    teacherApprovalRequired: true,
  };
}

function deriveStudentGraphViewPath(graphPath, dateText) {
  const normalized = normalizeVaultPath(
    graphPath,
    `6. 학생성장/관계그래프/${dateText}-학생 관계 그래프.json`
  );
  if (!normalized) {
    return normalizeNotePath(`6. 학생성장/관계그래프/${dateText}-학생 관계 그래프 뷰`);
  }
  if (normalized.toLowerCase().endsWith('.json')) {
    return normalizeNotePath(normalized.replace(/\.json$/i, ' 뷰.md'));
  }
  return normalizeNotePath(`${normalized} 뷰`);
}

function formatMaybeCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}명` : '확인 필요';
}

function getStudentRefValue(item) {
  if (typeof item === 'string') return item.trim();
  return String(item && item.studentRef ? item.studentRef : '').trim();
}

function formatStudentRefs(items) {
  if (!Array.isArray(items) || items.length === 0) return '없음';
  return items
    .slice(0, 3)
    .map((item) => getStudentRefValue(item))
    .filter(Boolean)
    .join(', ') || '없음';
}

function formatScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return '-';
  return `${Math.round(score * 100)}점`;
}

function formatNoteLink(pathValue, fallbackText = '아직 연결된 노트가 없습니다.') {
  const normalized = normalizeNotePath(pathValue, '');
  return normalized ? `[[${normalized.replace(/\.md$/i, '')}]]` : fallbackText;
}

function extractMarkdownSection(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(content || '').match(new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\r?\\n## |$)`));
  return match ? match[0] : '';
}

function parseCountBullet(content, label) {
  const match = String(content || '').match(new RegExp(`-\\s*${label}:\\s*(\\d+)명`, 'm'));
  return match ? Number(match[1]) : null;
}

function parseStudentRefBullets(section) {
  return String(section || '')
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^- +([^:\n]+?)(?::|$)/);
      if (!match) return '';
      const value = String(match[1] || '').trim();
      if (!value || /^(?:없음|후보 없음|지원 없음)$/u.test(value)) return '';
      return value;
    })
    .filter(Boolean)
    .map((studentRef) => ({ studentRef }));
}

function parseStudentGrowthSummaryFromNote(content = '') {
  const supportFlags = parseStudentRefBullets(extractMarkdownSection(content, '## 지원 필요 신호'));
  const topWriters = parseStudentRefBullets(extractMarkdownSection(content, '## 우수 기록자'));
  return {
    submittedCount: parseCountBullet(content, '제출'),
    missingCount: parseCountBullet(content, '미제출'),
    supportFlags,
    topWriters,
  };
}

function parsePraiseCandidatesFromNote(content = '') {
  return {
    categories: {
      daily_writer: parseStudentRefBullets(extractMarkdownSection(content, '## 기록 성실 후보')),
      goal_keeper: parseStudentRefBullets(extractMarkdownSection(content, '## 목표 실천 후보')),
      question_asker: parseStudentRefBullets(extractMarkdownSection(content, '## 질문 활동 후보')),
    },
  };
}

function buildStudentGrowthHomepageLines(summary = {}, notePath = '') {
  const topWriters = Array.isArray(summary.topWriters) ? summary.topWriters : [];
  const supportFlags = Array.isArray(summary.supportFlags) ? summary.supportFlags : [];
  return [
    `- 출석 요약 노트: ${formatNoteLink(notePath)}`,
    `- 제출 현황: ${formatMaybeCount(summary.submittedCount)} 제출 / ${formatMaybeCount(summary.missingCount)} 미제출`,
    `- 지원 필요 신호: ${supportFlags.length}건`,
    `- 우수 기록자: ${formatStudentRefs(topWriters)}`,
  ];
}

function buildPendingStudentGrowthHomepageLines(notePath = '') {
  return [
    notePath
      ? `- 출석 요약 노트: ${formatNoteLink(notePath)}`
      : '- 출석 요약 노트: 아직 연결된 출결 요약 노트가 없습니다.',
    '- 제출 현황: 아직 동기화되지 않음',
    '- 지원 필요 신호: 아직 동기화되지 않음',
    '- 실행: 상단 버튼으로 오늘의 출석을 불러오면 즉시 반영됩니다.',
  ];
}

function buildPraiseCandidatesHomepageLines(summary = {}, notePath = '') {
  const categories = summary && typeof summary.categories === 'object' ? summary.categories : {};
  return [
    `- 상점 요약 노트: ${formatNoteLink(notePath)}`,
    `- 기록 성실 상점: ${formatStudentRefs(categories.daily_writer)}`,
    `- 목표 실천 상점: ${formatStudentRefs(categories.goal_keeper)}`,
    `- 질문 활동 상점: ${formatStudentRefs(categories.question_asker)}`,
    '- 공개 전 안내: 교사 검토 후 반영',
  ];
}

function buildPendingPraiseHomepageLines(notePath = '') {
  return [
    notePath
      ? `- 상점 요약 노트: ${formatNoteLink(notePath)}`
      : '- 상점 요약 노트: 아직 연결된 상점 요약 노트가 없습니다.',
    '- 기록 성실 상점: 아직 동기화되지 않음',
    '- 목표 실천 상점: 아직 동기화되지 않음',
    '- 질문 활동 상점: 아직 동기화되지 않음',
    '- 공개 전 안내: 교사 검토 후 반영',
  ];
}

function buildHomepageOverviewLines({
  dateText,
  week,
  growthSummary = null,
  growthNotePath = '',
  praiseSummary = null,
  praiseNotePath = '',
} = {}) {
  const categories = praiseSummary && typeof praiseSummary.categories === 'object' ? praiseSummary.categories : {};
  const attendanceText = growthSummary
    ? `${formatMaybeCount(growthSummary.submittedCount)} 제출 / ${formatMaybeCount(growthSummary.missingCount)} 미제출`
    : '아직 동기화되지 않음';
  const storeText = praiseSummary
    ? [
      `기록 ${formatStudentRefs(categories.daily_writer)}`,
      `목표 ${formatStudentRefs(categories.goal_keeper)}`,
      `질문 ${formatStudentRefs(categories.question_asker)}`,
    ].join(' · ')
    : '아직 동기화되지 않음';
  const attendanceDetail = growthNotePath ? ` · ${formatNoteLink(growthNotePath)}` : '';
  const storeDetail = praiseNotePath ? ` · ${formatNoteLink(praiseNotePath)}` : '';
  return [
    `- 오늘의 공지: ${formatNoteLink(`1. 공지사항/${dateText}-공지`)}`,
    `- 오늘의 출석: ${attendanceText}${attendanceDetail}`,
    `- 우리반 상점: ${storeText}${storeDetail}`,
    `- 우리반 리포트: ${formatNoteLink(`2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고`)}`,
  ];
}

function buildStudentGrowthSummaryNote(summary = {}) {
  const moodSignals = summary.moodSignals && typeof summary.moodSignals === 'object' ? summary.moodSignals : {};
  const supportFlags = Array.isArray(summary.supportFlags) ? summary.supportFlags : [];
  const topWriters = Array.isArray(summary.topWriters) ? summary.topWriters : [];

  return [
    '---',
    'category: 6. 학생성장',
    'priority: MEDIUM',
    'tags: [학생성장, 체크인, omniforge-bridge]',
    `summary_date: ${String(summary.date || '').trim()}`,
    `classroom_id: ${String(summary.classroomId || '').trim()}`,
    '---',
    '',
    `# ${String(summary.date || '오늘')} 학생 성장 요약`,
    '',
    '## 제출 현황',
    `- 제출: ${formatMaybeCount(summary.submittedCount)}`,
    `- 미제출: ${formatMaybeCount(summary.missingCount)}`,
    '',
    '## 기분 신호',
    `- 안정: ${typeof moodSignals.stable === 'number' ? moodSignals.stable : 0}명`,
    `- 낮은 기분: ${typeof moodSignals.low === 'number' ? moodSignals.low : 0}명`,
    `- 높은 에너지: ${typeof moodSignals.highEnergy === 'number' ? moodSignals.highEnergy : 0}명`,
    '',
    '## 지원 필요 신호',
    ...(supportFlags.length > 0
      ? supportFlags.map((item) => `- ${item.studentRef}: ${item.reason || '확인 필요'}`)
      : ['- 특이 신호 없음']),
    '',
    '## 우수 기록자',
    ...(topWriters.length > 0
      ? topWriters.map((item) => `- ${item.studentRef}: ${formatScore(item.score)}`)
      : ['- 우수 기록자 정보 없음']),
    '',
    '## 비고',
    '- 이 노트는 OmniForge summary contract 또는 샘플 JSON을 읽어 생성됩니다.',
    '- 학생 실명과 민감 원문은 포함하지 않습니다.',
    '',
  ].join('\n');
}

function buildPraiseCandidatesNote(summary = {}) {
  const categories = summary.categories && typeof summary.categories === 'object' ? summary.categories : {};
  const dailyWriter = Array.isArray(categories.daily_writer) ? categories.daily_writer : [];
  const goalKeeper = Array.isArray(categories.goal_keeper) ? categories.goal_keeper : [];
  const questionAsker = Array.isArray(categories.question_asker) ? categories.question_asker : [];

  return [
    '---',
    'category: 6. 학생성장',
    'priority: MEDIUM',
    'tags: [학생성장, 칭찬후보, omniforge-bridge]',
    `period: ${String(summary.period || '').trim()}`,
    `classroom_id: ${String(summary.classroomId || '').trim()}`,
    'teacher_approval_required: true',
    '---',
    '',
    `# ${String(summary.period || '이번 주')} 칭찬 후보 요약`,
    '',
    '## 기록 성실 후보',
    ...(dailyWriter.length > 0
      ? dailyWriter.map((item) => `- ${item.studentRef}: ${formatScore(item.score)}`)
      : ['- 후보 없음']),
    '',
    '## 목표 실천 후보',
    ...(goalKeeper.length > 0
      ? goalKeeper.map((item) => `- ${item.studentRef}: ${formatScore(item.score)}`)
      : ['- 후보 없음']),
    '',
    '## 질문 활동 후보',
    ...(questionAsker.length > 0
      ? questionAsker.map((item) => `- ${item.studentRef}: ${formatScore(item.score)}`)
      : ['- 후보 없음']),
    '',
    '## 공개 전 안내',
    '- 자동 추천은 보조 지표입니다.',
    '- 공개 칭찬/스티커 부여 전 반드시 교사 검토가 필요합니다.',
    '',
  ].join('\n');
}

function buildHomepageDashboardBody(dateText) {
  const week = getWeekRange(new Date(`${dateText}T12:00:00`));
  return [
    '```homepage-dashboard',
    `date: ${dateText}`,
    `notice: 1. 공지사항/${dateText}-공지.md`,
    `attendance: 6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.md`,
    `growth: 6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.md`,
    `classStore: 6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.md`,
    `praise: 6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.md`,
    `classReport: 2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고.md`,
    `weeklyReport: 2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고.md`,
    `studentGraph: 6. 학생성장/관계그래프/${dateText}-학생 관계 그래프.json`,
    `studentGraphView: 6. 학생성장/관계그래프/${dateText}-학생 관계 그래프 뷰.md`,
    '```',
  ];
}

function buildHomepageTemplate(dateText, homepageUi = DEFAULT_HOMEPAGE_UI) {
  const ui = normalizeHomepageUiSettings(homepageUi);
  const week = getWeekRange(new Date(`${dateText}T12:00:00`));
  const noticePath = `1. 공지사항/${dateText}-공지`;
  const attendancePath = `6. 학생성장/일일체크인-요약/${dateText}-체크인 요약`;
  const classStorePath = `6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보`;
  const classReportPath = `2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고`;
  const graphViewPath = deriveStudentGraphViewPath(`6. 학생성장/관계그래프/${dateText}-학생 관계 그래프.json`, dateText);
  return [
    '---',
    'category: 홈',
    'priority: HIGH',
    'tags: [홈페이지, 학급운영, 공지]',
    'share_link:',
    `share_updated: ${dateText}`,
    'target: 학부모/학생',
    `theme_preset: ${ui.themePreset}`,
    `accent_color: ${ui.accentColor}`,
    '---',
    '',
    '## 🎛 오늘의 홈 대시보드',
    ...buildHomepageDashboardBody(dateText),
    '',
    '## ✍️ 오늘 한 줄 요약',
    ...buildHomepageOverviewLines({ dateText, week }),
    '',
    '## 📣 오늘의 공지',
    `- 공지 노트: ${formatNoteLink(noticePath)}`,
    '- 오늘 공지 초안은 공지 노트에서 바로 수정합니다.',
    '- 준비물, 일정, 전달 문구를 공지 노트에 쓰면 홈페이지 카드와 연결됩니다.',
    '',
    '## ✅ 오늘의 출석',
    ...buildPendingStudentGrowthHomepageLines(attendancePath),
    '',
    '## 🪙 우리반 상점',
    ...buildPendingPraiseHomepageLines(classStorePath),
    '',
    '## 📘 우리반 리포트',
    `- 이번 주 리포트: ${formatNoteLink(classReportPath)}`,
    `- 기간: ${week.start} ~ ${week.end}`,
    '- 상단 카드에서 우리반 리포트를 생성하면 최신 주간 노트가 연결됩니다.',
    '',
    '## 🔒 교사용 학생 관계 그래프',
    `- 교사용 보기: ${formatNoteLink(graphViewPath)}`,
    '- 학생 관계 그래프는 교사용 노트에서만 확인합니다.',
    '',
  ].join('\n');
}

function buildMiricanvasHomepageTemplate(dateText, homepageUi = DEFAULT_HOMEPAGE_UI) {
  const ui = normalizeHomepageUiSettings(homepageUi);
  const week = getWeekRange(new Date(`${dateText}T12:00:00`));
  const noticePath = `1. 공지사항/${dateText}-공지`;
  const attendancePath = `6. 학생성장/일일체크인-요약/${dateText}-체크인 요약`;
  const classStorePath = `6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보`;
  const classReportPath = `2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고`;
  const graphViewPath = deriveStudentGraphViewPath(`6. 학생성장/관계그래프/${dateText}-학생 관계 그래프.json`, dateText);
  return [
    '---',
    'category: 홈',
    'priority: HIGH',
    'tags: [홈페이지, 학급운영, 학부모, 공지]',
    'share_link:',
    `share_updated: ${dateText}`,
    'target: 학부모/학생',
    'theme: miricanvas-like',
    `theme_preset: ${ui.themePreset}`,
    `accent_color: ${ui.accentColor}`,
    '---',
    '',
    '## 🎛 오늘의 홈 대시보드',
    ...buildHomepageDashboardBody(dateText),
    '',
    '## 학급 홈페이지 핵심',
    ...buildHomepageOverviewLines({ dateText, week }),
    '',
    '## 오늘의 공지',
    `- 공지 노트: ${formatNoteLink(noticePath)}`,
    '- 오늘 공지 초안과 전달 문구를 한 노트에서 관리합니다.',
    '',
    '> [!note] 배너 영역',
    '> - 미리캔버스에서 만든 배너를 첨부하세요',
    '> - 예시: ![[999-Attachments/학부모공지-배너.png]]',
    '',
    '## 오늘의 출석',
    ...buildPendingStudentGrowthHomepageLines(attendancePath),
    '',
    '## 우리반 상점',
    ...buildPendingPraiseHomepageLines(classStorePath),
    '',
    '## 우리반 리포트',
    `- 리포트 노트: ${formatNoteLink(classReportPath)}`,
    `- 이번 주 범위: ${week.start} ~ ${week.end}`,
    '- 상단 카드에서 생성하면 최신 노트가 연결됩니다.',
    '',
    '## 교사용 학생 관계 그래프',
    `- 교사용 보기: ${formatNoteLink(graphViewPath)}`,
    '- 그래프는 교사용 노트에서만 확인합니다.',
    '',
  ].join('\n');
}

function findHomepageDashboardInsertIndex(content) {
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const start = frontmatterMatch ? frontmatterMatch[0].length : 0;
  const headingMatch = content.slice(start).match(/\r?\n## /);
  if (headingMatch && typeof headingMatch.index === 'number') {
    return start + headingMatch.index + headingMatch[0].length - 3;
  }
  return content.length;
}

function stripLegacyHomepageIntro(content) {
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const prefix = frontmatterMatch ? frontmatterMatch[0] : '';
  const body = frontmatterMatch ? content.slice(prefix.length) : content;
  const nextBody = body.replace(
    /^\s*# .+\r?\n(?:\r?\n)?(?:[^\r\n#].*\r?\n)?(?:\r?\n)*(?=## 🎛 오늘의 홈 대시보드)/,
    ''
  );
  return `${prefix}${nextBody.replace(/^\s+/, '\n')}`;
}

function stripLegacyHomepagePanelCallout(content) {
  return String(content || '').replace(
    /(?:^|\r?\n)> \[!teacher\] 클릭형 운영 패널\r?\n(?:>.*\r?\n)*/g,
    '\n'
  );
}

function dedupeHomepageDashboardSections(content) {
  const heading = '## 🎛 오늘의 홈 대시보드';
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let seen = 0;
  return String(content || '').replace(
    new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\r?\\n## |$)`, 'g'),
    (section) => {
      seen += 1;
      return seen === 1 ? section : '';
    }
  );
}

function dedupeHomepageDashboardCodeBlocks(content) {
  let seen = 0;
  return String(content || '').replace(/```homepage-dashboard[\s\S]*?```/g, (block) => {
    seen += 1;
    return seen === 1 ? block : '';
  });
}

function cleanupHomepageDashboardArtifactsText(content) {
  let next = String(content || '');
  next = stripLegacyHomepageIntro(next);
  next = stripLegacyHomepagePanelCallout(next);
  next = dedupeHomepageDashboardSections(next);
  next = dedupeHomepageDashboardCodeBlocks(next);
  next = next.replace(/\n{3,}/g, '\n\n');
  return next.trimEnd().concat('\n');
}

function dedupeSectionByHeading(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let seen = 0;
  return String(content || '')
    .replace(new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\r?\\n## |$)`, 'g'), (section) => {
      seen += 1;
      return seen === 1 ? section : '';
    })
    .replace(/\n{3,}/g, '\n\n');
}

function syncHomepageOperationalText(content, dateText) {
  let next = String(content || '');
  if (!next) return next;
  next = next.replace(/^share_updated:\s*.*$/m, `share_updated: ${dateText}`);
  next = next.replace(/^\| 공지 링크 \| .* \| \[ \] \|$/m, `| 공지 링크 | [[1. 공지사항/${dateText}-공지]] | [ ] |`);
  next = next.replace(/^- \[ \] \d{4}-\d{2}-\d{2} 공지 게시$/m, `- [ ] ${dateText} 공지 게시`);
  return next;
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

  getStudentGrowthCheckinJsonPath(dateText) {
    return this.normalizePath(normalizeVaultPath(`6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.json`));
  }

  getStudentGrowthCheckinNotePath(dateText) {
    return this.normalizePath(normalizeNotePath(`6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.md`));
  }

  getPraiseCandidatesJsonPath(week) {
    return this.normalizePath(normalizeVaultPath(`6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.json`));
  }

  getPraiseCandidatesNotePath(week) {
    return this.normalizePath(normalizeNotePath(`6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.md`));
  }

  getNewsSubmissionUrl() {
    const googleFormLink = this.settings.googleForm && this.settings.googleForm.newsSubmissionUrl;
    return String(googleFormLink || this.settings.formLink || '').trim();
  }

  getTodayNoticePath(dateText) {
    return this.normalizePath(normalizeNotePath(`${DEFAULT_PATHS.noticeFolder}/${dateText}-공지.md`));
  }

  getTodayNewsPath(dateText) {
    return this.normalizePath(normalizeNotePath(`${this.getNewsFolderPath()}/${dateText}-뉴스읽기 과제.md`));
  }

  getGoogleFormLinkLines() {
    const links = [];
    const googleForm = this.settings.googleForm || {};
    const add = (label, value) => {
      const normalized = String(value || '').trim();
      if (normalized) links.push(`- ${label}: ${normalized}`);
    };

    add('뉴스 제출', this.getNewsSubmissionUrl());
    add('학부모 설문', googleForm.parentSurveyUrl);
    add('주간 체크인', googleForm.weeklyCheckinUrl);
    add('사전입력 템플릿', googleForm.prefillTemplate);
    add('응답 시트', googleForm.responseSheetUrl);

    if (links.length === 0) {
      return ['- 링크가 비어 있습니다. 설정에서 Google Form URL을 입력하세요.'];
    }

    return links;
  }

  async upsertSection(pathValue, heading, bodyLines) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    await this.ensureParentFolder(normalized);

    const section = [heading, ...bodyLines, ''].join('\n');
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) {
      const content = [section].join('\n');
      const file = await this.app.vault.create(normalized, content);
      return { file, path: normalized, created: true, updated: false };
    }

    const oldContent = await this.app.vault.read(existing);
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\r?\\n## |$)`);

    if (sectionRegex.test(oldContent)) {
      const nextContent = dedupeSectionByHeading(oldContent.replace(sectionRegex, section.trimEnd()), heading);
      if (nextContent !== oldContent) {
        await this.app.vault.modify(existing, nextContent);
        return { file: existing, path: normalized, created: false, updated: true };
      }
      return { file: existing, path: normalized, created: false, updated: false };
    }

    const nextContent = dedupeSectionByHeading(`${oldContent.trimEnd()}\n\n${section}`, heading);
    await this.app.vault.modify(existing, nextContent);
    return { file: existing, path: normalized, created: false, updated: true };
  }

  async upsertHomepageDashboardSection(pathValue, dateText) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) {
      return { path: normalized, created: false, updated: false };
    }

    const heading = '## 🎛 오늘의 홈 대시보드';
    const section = [heading, ...buildHomepageDashboardBody(dateText), ''].join('\n');
    const oldContent = await this.app.vault.read(existing);
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\r?\\n## |$)`);

    let nextContent = oldContent;
    if (sectionRegex.test(oldContent)) {
      nextContent = oldContent.replace(sectionRegex, section.trimEnd());
    } else {
      const insertIndex = findHomepageDashboardInsertIndex(oldContent);
      const before = oldContent.slice(0, insertIndex).trimEnd();
      const after = oldContent.slice(insertIndex).trimStart();
      nextContent = after
        ? `${before}\n\n${section}\n${after}`
        : `${before}\n\n${section}`;
    }

    if (nextContent !== oldContent) {
      await this.app.vault.modify(existing, nextContent);
      return { file: existing, path: normalized, created: false, updated: true };
    }

    return { file: existing, path: normalized, created: false, updated: false };
  }

  async cleanupHomepageHeroIntro(pathValue) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) return { path: normalized, updated: false };

    const oldContent = await this.app.vault.read(existing);
    const nextContent = cleanupHomepageDashboardArtifactsText(oldContent);
    if (nextContent !== oldContent) {
      await this.app.vault.modify(existing, nextContent);
      return { file: existing, path: normalized, updated: true };
    }

    return { file: existing, path: normalized, updated: false };
  }

  async syncHomepageOperationalMarkers(pathValue, dateText) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) return { path: normalized, updated: false };

    const oldContent = await this.app.vault.read(existing);
    const nextContent = syncHomepageOperationalText(oldContent, dateText);
    if (nextContent !== oldContent) {
      await this.app.vault.modify(existing, nextContent);
      return { file: existing, path: normalized, updated: true };
    }

    return { file: existing, path: normalized, updated: false };
  }

  async ensureTodayNoticeNote() {
    const dateText = this.getToday();
    const pathValue = this.getTodayNoticePath(dateText);
    const existing = this.app.vault.getAbstractFileByPath(pathValue);
    if (existing) return { file: existing, path: pathValue, created: false };
    const created = await this.createOrUpdateNote(pathValue, buildNoticeTemplate(dateText), { overwrite: false, backup: false });
    return { file: created.file, path: created.path, created: created.created };
  }

  async loadJsonSummary(pathValue, sampleData, options = {}) {
    const normalized = this.normalizePath(normalizeVaultPath(pathValue));
    await this.ensureParentFolder(normalized);
    const createIfMissing = options.createIfMissing !== false;

    let file = this.app.vault.getAbstractFileByPath(normalized);
    let created = false;
    if (!file) {
      if (!createIfMissing) {
        return { file: null, path: normalized, data: null, created: false, missing: true };
      }
      file = await this.app.vault.create(normalized, `${JSON.stringify(sampleData, null, 2)}\n`);
      created = true;
    }

    const content = await this.app.vault.read(file);
    let data;
    try {
      data = JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON parse failed for ${normalized}`);
    }

    return { file, path: normalized, data, created };
  }

  async readTextFileIfExists(pathValue) {
    const normalized = this.normalizePath(normalizeNotePath(pathValue));
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!file) return { file: null, path: normalized, content: '' };
    return { file, path: normalized, content: await this.app.vault.read(file) };
  }

  async syncStudentGrowthHomepageSection(options = {}) {
    const dateText = String(options.dateText || this.getToday()).trim();
    let homepagePath = this.getHomepagePath();

    if (options.ensureStructure) {
      await this.ensureRequiredFolders();
      const structure = await this.createInitialStructure({ overwrite: false, backup: false });
      homepagePath = structure.homepagePath;
    }

    const homepageFile = this.app.vault.getAbstractFileByPath(homepagePath);
    if (!homepageFile) {
      return { homepagePath, skipped: true };
    }

    const homepageContent = await this.app.vault.read(homepageFile);
    const migratedContent = dedupeSectionByHeading(
      homepageContent.replace(/## 🌱 학생 성장 요약/g, '## ✅ 오늘의 출석'),
      '## ✅ 오늘의 출석'
    );
    if (migratedContent !== homepageContent) {
      await this.app.vault.modify(homepageFile, migratedContent);
    }

    const summaryInfo = options.summaryInfo || await this.loadJsonSummary(
      this.getStudentGrowthCheckinJsonPath(dateText),
      buildSampleCheckinSummary(dateText),
      { createIfMissing: Boolean(options.createSample) }
    );

    let noteResult = options.noteResult || null;
    const notePath = this.getStudentGrowthCheckinNotePath(dateText);
    let summaryData = summaryInfo && summaryInfo.data ? summaryInfo.data : null;

    if (summaryData && !noteResult && options.refreshDerivedNote !== false) {
      noteResult = await this.createOrUpdateNote(
        notePath,
        buildStudentGrowthSummaryNote(summaryData),
        { overwrite: true, backup: false }
      );
    }

    if (!summaryData) {
      const noteInfo = await this.readTextFileIfExists(notePath);
      if (noteInfo.file) {
        summaryData = parseStudentGrowthSummaryFromNote(noteInfo.content);
      }
    }

    const finalNotePath = noteResult && noteResult.path
      ? noteResult.path
      : (this.app.vault.getAbstractFileByPath(notePath) ? notePath : '');
    const lines = summaryData
      ? buildStudentGrowthHomepageLines(summaryData, finalNotePath)
      : buildPendingStudentGrowthHomepageLines(finalNotePath);
    const homepageResult = await this.upsertSection(homepagePath, '## ✅ 오늘의 출석', lines);

    return {
      homepagePath,
      jsonPath: summaryInfo.path,
      notePath: finalNotePath || notePath,
      sampleCreated: Boolean(summaryInfo.created),
      hasData: Boolean(summaryData),
      source: summaryInfo && summaryInfo.data ? 'json' : (finalNotePath ? 'note' : 'placeholder'),
      summaryData,
      homepageResult,
    };
  }

  async syncPraiseHomepageSection(options = {}) {
    const week = options.week || getWeekRange(this.now());
    let homepagePath = this.getHomepagePath();

    if (options.ensureStructure) {
      await this.ensureRequiredFolders();
      const structure = await this.createInitialStructure({ overwrite: false, backup: false });
      homepagePath = structure.homepagePath;
    }

    const homepageFile = this.app.vault.getAbstractFileByPath(homepagePath);
    if (!homepageFile) {
      return { homepagePath, skipped: true };
    }

    const homepageContent = await this.app.vault.read(homepageFile);
    const migratedContent = dedupeSectionByHeading(
      homepageContent.replace(/## 🌟 이번 주 칭찬 후보/g, '## 🪙 우리반 상점'),
      '## 🪙 우리반 상점'
    );
    if (migratedContent !== homepageContent) {
      await this.app.vault.modify(homepageFile, migratedContent);
    }

    const summaryInfo = options.summaryInfo || await this.loadJsonSummary(
      this.getPraiseCandidatesJsonPath(week),
      buildSamplePraiseCandidates(formatIsoWeek(this.now())),
      { createIfMissing: Boolean(options.createSample) }
    );

    let noteResult = options.noteResult || null;
    const notePath = this.getPraiseCandidatesNotePath(week);
    let summaryData = summaryInfo && summaryInfo.data ? summaryInfo.data : null;

    if (summaryData && !noteResult && options.refreshDerivedNote !== false) {
      noteResult = await this.createOrUpdateNote(
        notePath,
        buildPraiseCandidatesNote(summaryData),
        { overwrite: true, backup: false }
      );
    }

    if (!summaryData) {
      const noteInfo = await this.readTextFileIfExists(notePath);
      if (noteInfo.file) {
        summaryData = parsePraiseCandidatesFromNote(noteInfo.content);
      }
    }

    const finalNotePath = noteResult && noteResult.path
      ? noteResult.path
      : (this.app.vault.getAbstractFileByPath(notePath) ? notePath : '');
    const lines = summaryData
      ? buildPraiseCandidatesHomepageLines(summaryData, finalNotePath)
      : buildPendingPraiseHomepageLines(finalNotePath);
    const homepageResult = await this.upsertSection(homepagePath, '## 🪙 우리반 상점', lines);

    return {
      homepagePath,
      jsonPath: summaryInfo.path,
      notePath: finalNotePath || notePath,
      sampleCreated: Boolean(summaryInfo.created),
      hasData: Boolean(summaryData),
      source: summaryInfo && summaryInfo.data ? 'json' : (finalNotePath ? 'note' : 'placeholder'),
      summaryData,
      homepageResult,
    };
  }

  async syncHomepageOverviewSection(options = {}) {
    const dateText = String(options.dateText || this.getToday()).trim();
    const week = options.week || getWeekRange(this.now());
    let homepagePath = this.getHomepagePath();

    if (options.ensureStructure) {
      await this.ensureRequiredFolders();
      const structure = await this.createInitialStructure({ overwrite: false, backup: false });
      homepagePath = structure.homepagePath;
    }

    const homepageFile = this.app.vault.getAbstractFileByPath(homepagePath);
    if (!homepageFile) {
      return { homepagePath, skipped: true };
    }

    const growth = options.growth || await this.syncStudentGrowthHomepageSection({
      dateText,
      ensureStructure: false,
      createSample: false,
      refreshDerivedNote: false,
    });
    const praise = options.praise || await this.syncPraiseHomepageSection({
      week,
      ensureStructure: false,
      createSample: false,
      refreshDerivedNote: false,
    });

    const lines = buildHomepageOverviewLines({
      dateText,
      week,
      growthSummary: growth.summaryData || null,
      growthNotePath: growth.notePath || '',
      praiseSummary: praise.summaryData || null,
      praiseNotePath: praise.notePath || '',
    });
    const homepageResult = await this.upsertSection(homepagePath, '## ✍️ 오늘 한 줄 요약', lines);
    return { homepagePath, homepageResult };
  }

  async syncHomepageBridgeSections(options = {}) {
    const growth = await this.syncStudentGrowthHomepageSection(options);
    const praise = await this.syncPraiseHomepageSection(options);
    const overview = await this.syncHomepageOverviewSection({
      ...options,
      growth,
      praise,
      ensureStructure: false,
    });
    return {
      growth,
      praise,
      overview,
      homepagePath: growth.homepagePath || praise.homepagePath || overview.homepagePath || this.getHomepagePath(),
    };
  }

  async applyGoogleFormLinks() {
    await this.ensureRequiredFolders();
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    const dateText = this.getToday();
    const noticeInfo = await this.ensureTodayNoticeNote();
    const lines = this.getGoogleFormLinkLines();
    const heading = '## 🔗 Google Form 링크';

    const homepageResult = await this.upsertSection(summary.homepagePath, heading, lines);
    const noticeResult = await this.upsertSection(this.getTodayNoticePath(dateText), heading, lines);
    const surveyPath = normalizeNotePath(`5. 설문/${dateText}-설문 링크`);
    const surveyResult = await this.upsertSection(surveyPath, heading, lines);

    const touched = [homepageResult, noticeResult, surveyResult]
      .filter((item) => item.created || item.updated)
      .map((item) => item.path);

    await this.openFileByPath(summary.homepagePath);

    return {
      notice: touched.length > 0
        ? `폼 링크를 ${touched.length}개 노트에 적용했습니다.`
        : '폼 링크 변경사항이 없어 기존 내용을 유지했습니다.',
      summary: {
        touched,
        noticeCreated: noticeInfo.created,
      },
    };
  }

  async generateWeeklyAutoReport() {
    await this.ensureRequiredFolders();
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    const dateText = this.getToday();
    await this.ensureTodayNoticeNote();
    const todayNews = await this.createOrUpdateNote(
      this.getTodayNewsPath(dateText),
      buildNewsTemplate({ dateText, formLink: this.getNewsSubmissionUrl() }),
      { overwrite: false, backup: false }
    );

    const week = getWeekRange(this.now());
    const reportPath = normalizeNotePath(`2. 주간학습안내/${week.start}~${week.end}-주간 자동 보고`);
    const reportBody = [
      '---',
      'category: 2. 주간학습안내',
      'priority: HIGH',
      'tags: [주간보고, 자동생성, 학급운영]',
      `week_start: ${week.start}`,
      `week_end: ${week.end}`,
      `generated_on: ${dateText}`,
      '---',
      '',
      `# ${week.start}~${week.end} 주간 자동 보고`,
      '',
      '## 핵심 링크',
      `- 홈페이지: [[${summary.homepagePath.replace(/\.md$/i, '')}]]`,
      `- 오늘 공지: [[${this.getTodayNoticePath(dateText).replace(/\.md$/i, '')}]]`,
      `- 오늘 뉴스읽기 과제: [[${this.getTodayNewsPath(dateText).replace(/\.md$/i, '')}]]`,
      '',
      '## Google Form 링크 현황',
      ...this.getGoogleFormLinkLines(),
      '',
      '## 주간 실행 체크리스트',
      '- [ ] 이번 주 공지/가정통신문 업데이트',
      '- [ ] 뉴스읽기 과제 배포 및 제출 현황 확인',
      '- [ ] 학부모 설문/체크인 응답 점검',
      '- [ ] 다음 주 안내 문구 초안 작성',
      '',
    ].join('\n');

    const reportResult = await this.createOrUpdateNote(reportPath, reportBody, { overwrite: true, backup: false });
    await this.openFileByPath(reportResult.path);

    return {
      notice: `주간 자동 보고서를 생성했습니다: ${reportResult.path}`,
      summary: {
        reportPath: reportResult.path,
        homepagePath: summary.homepagePath,
        todayNoticePath: this.getTodayNoticePath(dateText),
        todayNewsPath: todayNews.path,
        weekStart: week.start,
        weekEnd: week.end,
      },
    };
  }

  async loadStudentGrowthSummary() {
    const dateText = this.getToday();
    const summaryInfo = await this.loadJsonSummary(
      this.getStudentGrowthCheckinJsonPath(dateText),
      buildSampleCheckinSummary(dateText)
    );
    const noteResult = await this.createOrUpdateNote(
      this.getStudentGrowthCheckinNotePath(dateText),
      buildStudentGrowthSummaryNote(summaryInfo.data),
      { overwrite: true, backup: false }
    );
    const syncResult = await this.syncStudentGrowthHomepageSection({
      ensureStructure: true,
      createSample: true,
      dateText,
      summaryInfo,
      noteResult,
    });

    await this.openFileByPath(syncResult.homepagePath);
    return {
      notice: summaryInfo.created
        ? '학생 성장 요약 샘플을 생성하고 홈페이지에 반영했습니다.'
        : '학생 성장 요약을 홈페이지에 반영했습니다.',
      summary: {
        jsonPath: summaryInfo.path,
        notePath: noteResult.path,
        sampleCreated: summaryInfo.created,
        homepagePath: syncResult.homepagePath,
      },
    };
  }

  async loadPraiseCandidatesSummary() {
    const week = getWeekRange(this.now());
    const period = formatIsoWeek(this.now());
    const summaryInfo = await this.loadJsonSummary(
      this.getPraiseCandidatesJsonPath(week),
      buildSamplePraiseCandidates(period)
    );
    const noteResult = await this.createOrUpdateNote(
      this.getPraiseCandidatesNotePath(week),
      buildPraiseCandidatesNote(summaryInfo.data),
      { overwrite: true, backup: false }
    );
    const syncResult = await this.syncPraiseHomepageSection({
      ensureStructure: true,
      createSample: true,
      week,
      summaryInfo,
      noteResult,
    });

    await this.openFileByPath(syncResult.homepagePath);
    return {
      notice: summaryInfo.created
        ? '칭찬 후보 샘플을 생성하고 홈페이지에 반영했습니다.'
        : '칭찬 후보 요약을 홈페이지에 반영했습니다.',
      summary: {
        jsonPath: summaryInfo.path,
        notePath: noteResult.path,
        sampleCreated: summaryInfo.created,
        homepagePath: syncResult.homepagePath,
      },
    };
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

    const current = typeof this.app.vault.read === 'function'
      ? await this.app.vault.read(existing)
      : '';
    if (current === content) {
      return { file: existing, path: normalized, created: false, overwritten: false, backupPath: '' };
    }

    let backupPath = '';
    if (options.backup) {
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
      buildHomepageTemplate(dateText, this.settings.homepageUi),
      options
    );
    await this.upsertHomepageDashboardSection(homepageResult.path, dateText);
    await this.cleanupHomepageHeroIntro(homepageResult.path);
    await this.syncHomepageOperationalMarkers(homepageResult.path, dateText);
    const newsTemplateResult = await this.createOrUpdateNote(
      this.getNewsTemplatePath(),
      buildNewsTemplate({ formLink: this.getNewsSubmissionUrl() }),
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
    await this.syncHomepageBridgeSections({ ensureStructure: false, createSample: false });
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
      buildNewsTemplate({ formLink: this.getNewsSubmissionUrl() }),
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
      buildNewsTemplate({ dateText, formLink: this.getNewsSubmissionUrl() }),
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
      buildMiricanvasHomepageTemplate(dateText, this.settings.homepageUi),
      { overwrite: true, backup: true, backupStamp: formatTimestamp(this.now()) }
    );
    await this.upsertHomepageDashboardSection(result.path, dateText);
    await this.cleanupHomepageHeroIntro(result.path);
    await this.syncHomepageOperationalMarkers(result.path, dateText);
    await this.syncHomepageBridgeSections({ ensureStructure: false, createSample: false });
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
  normalizeGoogleFormSettings,
  normalizeHomepageUiSettings,
  normalizeNotePath,
  normalizeVaultPath,
};
