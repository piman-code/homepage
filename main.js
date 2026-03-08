'use strict';

const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { Plugin, PluginSettingTab, Setting, Notice, normalizePath, setIcon, FuzzySuggestModal, TFile } = require('obsidian');

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

const HOMEPAGE_IMAGE_EXTENSIONS = Object.freeze(new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']));

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

const HOMEPAGE_DASHBOARD_ACTIONS = Object.freeze([
  {
    commandId: 'create-today-notice-note',
    targetKey: 'notice',
    title: '오늘의 공지',
    description: '오늘 공지 초안을 만들고 바로 엽니다.',
    icon: 'megaphone',
    tone: 'support',
  },
  {
    commandId: 'load-student-growth-summary',
    targetKey: 'attendance',
    title: '오늘의 출석',
    description: '오늘 체크인·출결 요약을 반영합니다.',
    icon: 'book-open',
    tone: 'primary',
  },
  {
    commandId: 'load-praise-candidates-summary',
    targetKey: 'classStore',
    title: '우리반 상점',
    description: '이번 주 상점 순위와 후보를 갱신합니다.',
    icon: 'sparkles',
    tone: 'primary',
  },
  {
    commandId: 'generate-weekly-auto-report',
    targetKey: 'classReport',
    title: '우리반 리포트',
    description: '이번 주 리포트 노트를 만듭니다.',
    icon: 'calendar',
    tone: 'support',
  },
]);

const HOMEPAGE_DASHBOARD_LINKS = Object.freeze([
  {
    key: 'notice',
    title: '오늘의 공지',
    description: '오늘 공지 노트 열기',
    icon: 'file-text',
    fallbackCommandId: 'create-today-notice-note',
  },
  {
    key: 'attendance',
    title: '오늘의 출석',
    description: '출결·체크인 요약 노트 열기',
    icon: 'book-open',
    fallbackCommandId: 'load-student-growth-summary',
  },
  {
    key: 'classStore',
    title: '우리반 상점',
    description: '이번 주 상점 순위 노트 열기',
    icon: 'award',
    fallbackCommandId: 'load-praise-candidates-summary',
  },
  {
    key: 'classReport',
    title: '우리반 리포트',
    description: '주간 리포트 노트 열기',
    icon: 'calendar',
    fallbackCommandId: 'generate-weekly-auto-report',
  },
]);

function normalizeSlashes(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function normalizeVaultPath(value, fallback = '') {
  const source = normalizeSlashes((value || fallback || '').trim());
  const segments = [];
  for (const segment of source.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length > 0) segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

function normalizeNotePath(value, fallback = '') {
  const normalized = normalizeVaultPath(value, fallback);
  if (!normalized) return '';
  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
}

function normalizeExternalImagePath(value, fallback = '') {
  const raw = String(value || fallback || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) return '';
  if (/^(?:https?|file):\/\//i.test(raw)) return raw;
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2));
  return raw;
}

function resolveHomepageBackgroundMode(modeValue, vaultPath, externalPath, dataUrl) {
  const mode = String(modeValue || '').trim();
  if (HOMEPAGE_BACKGROUND_MODES.includes(mode)) return mode;
  if (dataUrl) return 'embedded';
  if (externalPath) return 'external';
  if (vaultPath) return 'vault';
  return 'none';
}

function resolveExternalImageResourcePath(value) {
  const normalized = normalizeExternalImagePath(value, '');
  if (!normalized) return '';
  if (/^(?:https?|file):\/\//i.test(normalized)) return normalized;
  if (!path.isAbsolute(normalized)) return '';
  try {
    return pathToFileURL(normalized).href;
  } catch (error) {
    console.warn('[homepage] failed to resolve external image path', normalized, error);
    return '';
  }
}

function normalizeDataUrl(value, fallback = '') {
  const normalized = String(value || fallback || '').trim();
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized) ? normalized : '';
}

function normalizeBackgroundLabel(value, fallback = '') {
  return String(value || fallback || '').trim();
}

function getImageMimeTypeFromName(name = '') {
  const extension = String(name || '').split('.').pop().toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeHeroHeight(value, fallback = DEFAULT_HOMEPAGE_UI.heroHeight) {
  return Math.round(clampNumber(value, 240, 640, fallback));
}

function normalizeHeroOverlayStrength(value, fallback = DEFAULT_HOMEPAGE_UI.heroOverlayStrength) {
  return Math.round(clampNumber(value, 10, 100, fallback));
}

function normalizeBooleanSetting(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function buildOverlayStrengthVars(strengthValue) {
  const strength = normalizeHeroOverlayStrength(strengthValue, DEFAULT_HOMEPAGE_UI.heroOverlayStrength) / 100;
  return {
    top: (0.1 + (strength * 0.18)).toFixed(2),
    middle: (0.26 + (strength * 0.34)).toFixed(2),
    bottom: (0.42 + (strength * 0.46)).toFixed(2),
    sideStart: (0.28 + (strength * 0.48)).toFixed(2),
    sideCenter: (0.08 + (strength * 0.26)).toFixed(2),
    sideEnd: (0.22 + (strength * 0.44)).toFixed(2),
  };
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
    backgroundImageMode: resolveHomepageBackgroundMode(
      value.backgroundImageMode,
      backgroundImagePath,
      backgroundImageExternalPath,
      backgroundImageDataUrl,
    ),
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

function buildSampleStudentRelationshipGraph(dateText) {
  return {
    contract: 'omniforge.student.relationship-graph.v1',
    date: dateText,
    title: '학생 관계 / 이해도',
    subtitle: '노드를 끌어 학생 간 거리와 연결을 직접 살펴볼 수 있습니다.',
    nodes: [
      { id: 'teacher', label: '담임', x: 0.5, y: 0.14, kind: 'hub' },
      { id: 'minsuh', label: '민서', x: 0.22, y: 0.34, kind: 'mentor', mastery: 0.86 },
      { id: 'jiho', label: '지호', x: 0.78, y: 0.3, kind: 'support', mastery: 0.42 },
      { id: 'seoyeon', label: '서연', x: 0.26, y: 0.72, kind: 'steady', mastery: 0.73 },
      { id: 'dohoon', label: '도훈', x: 0.72, y: 0.7, kind: 'question', mastery: 0.66 },
      { id: 'cluster_math', label: '분수', x: 0.5, y: 0.5, kind: 'topic' },
    ],
    edges: [
      { source: 'teacher', target: 'minsuh', weight: 0.7, relation: '칭찬' },
      { source: 'teacher', target: 'jiho', weight: 0.9, relation: '지원' },
      { source: 'teacher', target: 'seoyeon', weight: 0.58, relation: '안정' },
      { source: 'teacher', target: 'dohoon', weight: 0.66, relation: '질문' },
      { source: 'minsuh', target: 'cluster_math', weight: 0.78, relation: '이해' },
      { source: 'jiho', target: 'cluster_math', weight: 0.35, relation: '보완' },
      { source: 'seoyeon', target: 'cluster_math', weight: 0.62, relation: '적용' },
      { source: 'dohoon', target: 'cluster_math', weight: 0.55, relation: '탐구' },
      { source: 'minsuh', target: 'jiho', weight: 0.4, relation: '짝활동' },
      { source: 'seoyeon', target: 'dohoon', weight: 0.48, relation: '토론' },
    ],
    source: 'sample',
  };
}

function normalizeGraphPercent(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return parsed * 100;
  return clampNumber(parsed, 6, 94, fallback);
}

function normalizeStudentRelationshipGraph(payload, fallbackDateText) {
  const fallback = buildSampleStudentRelationshipGraph(fallbackDateText);
  const sourceNodes = Array.isArray(payload && payload.nodes) ? payload.nodes : fallback.nodes;
  const sourceEdges = Array.isArray(payload && payload.edges) ? payload.edges : fallback.edges;
  const nodes = sourceNodes
    .map((node, index) => ({
      id: String(node && node.id ? node.id : `node_${index}`),
      label: String(node && node.label ? node.label : `학생 ${index + 1}`),
      x: normalizeGraphPercent(node && node.x, normalizeGraphPercent(fallback.nodes[index % fallback.nodes.length].x, 50)),
      y: normalizeGraphPercent(node && node.y, normalizeGraphPercent(fallback.nodes[index % fallback.nodes.length].y, 50)),
      kind: String(node && node.kind ? node.kind : 'student'),
      mastery: typeof (node && node.mastery) === 'number' ? clampNumber(node.mastery, 0, 1, 0.5) : null,
    }))
    .filter((node) => node.id);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = sourceEdges
    .map((edge) => ({
      source: String(edge && edge.source ? edge.source : ''),
      target: String(edge && edge.target ? edge.target : ''),
      weight: clampNumber(edge && edge.weight, 0.15, 1, 0.45),
      relation: String(edge && edge.relation ? edge.relation : '').trim(),
    }))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return {
    title: String(payload && payload.title ? payload.title : fallback.title),
    subtitle: String(payload && payload.subtitle ? payload.subtitle : fallback.subtitle),
    date: String(payload && payload.date ? payload.date : fallbackDateText),
    source: String(payload && payload.source ? payload.source : 'sample'),
    nodes,
    edges,
  };
}

function summarizeStudentRelationshipGraph(graphData = {}) {
  const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData.edges) ? graphData.edges : [];
  const studentNodes = nodes.filter((node) => !['hub', 'topic'].includes(String(node.kind || 'student')));
  const lowMasteryCount = studentNodes.filter((node) => typeof node.mastery === 'number' && node.mastery < 0.5).length;
  const supportCount = studentNodes.filter((node) => node.kind === 'support' || (typeof node.mastery === 'number' && node.mastery < 0.45)).length;
  return {
    nodeCount: nodes.length,
    studentCount: studentNodes.length,
    topicCount: nodes.filter((node) => node.kind === 'topic').length,
    edgeCount: edges.length,
    lowMasteryCount,
    supportCount,
  };
}

function countDistinctStudentRefs(groups = []) {
  const refs = new Set();
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const ref = getStudentRefValue(item);
      if (ref) refs.add(ref);
    }
  }
  return refs.size;
}

function buildGraphDegreeMap(graphData = {}) {
  const degree = new Map((Array.isArray(graphData.nodes) ? graphData.nodes : []).map((node) => [node.id, 0]));
  for (const edge of Array.isArray(graphData.edges) ? graphData.edges : []) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + Number(edge.weight || 0.4));
    degree.set(edge.target, (degree.get(edge.target) || 0) + Number(edge.weight || 0.4));
  }
  return degree;
}

function buildPreviewStudentRelationshipGraph(graphData = {}, maxNodes = 12) {
  const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData.edges) ? graphData.edges : [];
  if (nodes.length <= maxNodes) {
    return { ...graphData, isPreview: false, hiddenCount: 0 };
  }

  const degree = buildGraphDegreeMap(graphData);
  const kindPriority = {
    hub: 100,
    topic: 80,
    support: 72,
    mentor: 68,
    question: 64,
    steady: 52,
  };
  const selectedNodes = [...nodes]
    .sort((left, right) => {
      const leftScore = (kindPriority[left.kind] || 40)
        + (degree.get(left.id) || 0)
        + (typeof left.mastery === 'number' ? Math.abs(left.mastery - 0.55) * 10 : 0);
      const rightScore = (kindPriority[right.kind] || 40)
        + (degree.get(right.id) || 0)
        + (typeof right.mastery === 'number' ? Math.abs(right.mastery - 0.55) * 10 : 0);
      return rightScore - leftScore;
    })
    .slice(0, maxNodes);

  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = edges
    .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0))
    .slice(0, Math.max(maxNodes * 2, 12));

  return {
    ...graphData,
    nodes: selectedNodes,
    edges: selectedEdges,
    isPreview: true,
    hiddenCount: Math.max(nodes.length - selectedNodes.length, 0),
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

function buildStudentRelationshipGraphViewNote({ dateText, graphPath, graphData }) {
  const metrics = summarizeStudentRelationshipGraph(graphData);
  return [
    '---',
    'category: 6. 학생성장',
    'priority: MEDIUM',
    'tags: [학생성장, 관계그래프, omniforge-bridge]',
    `graph_date: ${dateText}`,
    `graph_source: ${graphPath}`,
    '---',
    '',
    `# ${String(graphData && graphData.title ? graphData.title : `${dateText} 학생 관계 그래프`)} 뷰`,
    '',
    `- 원본 JSON: \`${graphPath}\``,
    `- 학생 노드: ${metrics.studentCount}명`,
    `- 주제 노드: ${metrics.topicCount}개`,
    `- 관계선: ${metrics.edgeCount}개`,
    `- 지원 관찰 대상: ${metrics.supportCount}명`,
    '',
    '```student-relationship-graph',
    `date: ${dateText}`,
    `path: ${graphPath}`,
    'mode: full',
    '```',
    '',
    '## 해석 가이드',
    '- 홈페이지 히어로의 관계도는 미리보기입니다.',
    '- 학생 수가 많을수록 이 노트에서 전체 관계망과 이해도 신호를 확인하는 쪽이 적절합니다.',
    '- 수업태도, 설문, 질문활동 누적 집계는 OmniForge skill이 만들고, homepage는 결과를 보여주는 역할을 맡습니다.',
    '',
  ].join('\n');
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

function stripMarkdownFrontmatter(content = '') {
  return String(content || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function extractMarkdownTitle(content = '') {
  const match = stripMarkdownFrontmatter(content).match(/^#\s+(.+)$/m);
  return match ? String(match[1] || '').trim() : '';
}

function extractBulletValues(section = '') {
  return String(section || '')
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^- +(.*)$/);
      return match ? String(match[1] || '').trim() : '';
    })
    .filter((value) => value && value !== '-');
}

function summarizeNoticeNote(content = '', dateText = '') {
  const title = extractMarkdownTitle(content) || `${dateText} 공지`;
  const highlights = extractBulletValues(extractMarkdownSection(content, '## 핵심 안내'))
    .filter((value) => value && value !== '-')
    .slice(0, 2);
  const summary = highlights.length > 0
    ? highlights.join(' · ')
    : '핵심 안내를 입력하면 이곳에 자동 요약됩니다.';
  return { title, summary };
}

function summarizeStudentGrowthNote(content = '') {
  const parsed = parseStudentGrowthSummaryFromNote(content);
  return {
    title: extractMarkdownTitle(content) || '오늘의 출석',
    summary: parsed.submittedCount == null && parsed.missingCount == null
      ? '출결·체크인 요약을 불러오면 이곳에 자동 반영됩니다.'
      : `${formatMaybeCount(parsed.submittedCount)} 제출 · ${formatMaybeCount(parsed.missingCount)} 미제출 · 지원 필요 ${Array.isArray(parsed.supportFlags) ? parsed.supportFlags.length : 0}건`,
  };
}

function summarizePraiseNote(content = '') {
  const parsed = parsePraiseCandidatesFromNote(content);
  const categories = parsed && typeof parsed.categories === 'object' ? parsed.categories : {};
  return {
    title: extractMarkdownTitle(content) || '우리반 상점',
    summary: [
      `기록 ${formatStudentRefs(categories.daily_writer)}`,
      `목표 ${formatStudentRefs(categories.goal_keeper)}`,
      `질문 ${formatStudentRefs(categories.question_asker)}`,
    ].join(' · '),
  };
}

function summarizeWeeklyReportNote(content = '', pathValue = '') {
  const title = extractMarkdownTitle(content) || path.basename(String(pathValue || '').replace(/\.md$/i, '')) || '우리반 리포트';
  const checklistCount = (String(content || '').match(/^- \[ \]/gm) || []).length;
  const linkCount = (String(content || '').match(/\[\[[^\]]+\]\]/g) || []).length;
  const parts = [];
  if (checklistCount > 0) parts.push(`체크리스트 ${checklistCount}개`);
  if (linkCount > 0) parts.push(`핵심 링크 ${linkCount}개`);
  return {
    title,
    summary: parts.length > 0 ? parts.join(' · ') : '주간 리포트 노트를 열어 업데이트할 수 있습니다.',
  };
}

function buildPendingDashboardSummary(linkSpec) {
  switch (linkSpec.key) {
    case 'notice':
      return '핵심 안내를 입력하면 이곳에 자동 요약됩니다.';
    case 'attendance':
      return '출결·체크인 요약을 불러오면 이곳에 자동 반영됩니다.';
    case 'classStore':
      return '이번 주 상점 순위와 후보를 불러오면 이곳에 자동 요약됩니다.';
    case 'classReport':
      return '주간 리포트 노트를 만들면 핵심 링크와 체크리스트가 요약됩니다.';
    default:
      return '연결된 노트를 읽어 자동 요약합니다.';
  }
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

function parseHomepageDashboardConfig(source) {
  const config = {};
  for (const rawLine of String(source || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) config[key] = value;
  }
  return config;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDashboardPathLabel(pathValue) {
  const normalized = String(pathValue || '').trim();
  if (!normalized) return '클릭 시 생성 후 이동';
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 2) return normalized;
  return `.../${segments.slice(-2).join('/')}`;
}

function isSupportedImageExtension(extension) {
  return HOMEPAGE_IMAGE_EXTENSIONS.has(String(extension || '').trim().toLowerCase());
}

function isSupportedImageFile(file) {
  return file instanceof TFile && isSupportedImageExtension(file.extension);
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

  getToday() { return formatDate(this.now()); }
  getHomepagePath() { return this.normalizePath(normalizeNotePath(this.settings.homepagePath, DEFAULT_PATHS.homepage)); }
  getNewsFolderPath() { return this.normalizePath(normalizeVaultPath(this.settings.newsFolder, DEFAULT_SETTINGS.newsFolder)); }
  getNewsTemplatePath() { return this.normalizePath(normalizeNotePath(DEFAULT_PATHS.newsTemplate, DEFAULT_PATHS.newsTemplate)); }
  getStudentGrowthCheckinJsonPath(dateText) { return this.normalizePath(normalizeVaultPath(`6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.json`)); }
  getStudentGrowthCheckinNotePath(dateText) { return this.normalizePath(normalizeNotePath(`6. 학생성장/일일체크인-요약/${dateText}-체크인 요약.md`)); }
  getPraiseCandidatesJsonPath(week) { return this.normalizePath(normalizeVaultPath(`6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.json`)); }
  getPraiseCandidatesNotePath(week) { return this.normalizePath(normalizeNotePath(`6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.md`)); }
  getNewsSubmissionUrl() {
    const googleFormLink = this.settings.googleForm && this.settings.googleForm.newsSubmissionUrl;
    return String(googleFormLink || this.settings.formLink || '').trim();
  }
  getTodayNoticePath(dateText) { return this.normalizePath(normalizeNotePath(`${DEFAULT_PATHS.noticeFolder}/${dateText}-공지.md`)); }
  getTodayNewsPath(dateText) { return this.normalizePath(normalizeNotePath(`${this.getNewsFolderPath()}/${dateText}-뉴스읽기 과제.md`)); }

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
    if (!existing) return { path: normalized, created: false, updated: false };

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
    if (!folderPath) return false;
    if (this.app.vault.getAbstractFileByPath(folderPath)) return false;
    await this.app.vault.createFolder(folderPath);
    return true;
  }

  async ensureParentFolder(filePath) {
    const normalized = this.normalizePath(normalizeVaultPath(filePath));
    const index = normalized.lastIndexOf('/');
    if (index <= 0) return;
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
    for (const folder of REQUIRED_FOLDERS) if (await this.ensureFolder(folder)) created += 1;
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

    if (!options.overwrite) return { file: existing, path: normalized, created: false, overwritten: false, backupPath: '' };

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
    const homepageResult = await this.createOrUpdateNote(this.getHomepagePath(), buildHomepageTemplate(dateText, this.settings.homepageUi), options);
    await this.upsertHomepageDashboardSection(homepageResult.path, dateText);
    await this.cleanupHomepageHeroIntro(homepageResult.path);
    await this.syncHomepageOperationalMarkers(homepageResult.path, dateText);
    const newsTemplateResult = await this.createOrUpdateNote(this.getNewsTemplatePath(), buildNewsTemplate({ formLink: this.getNewsSubmissionUrl() }), options);
    const fileCreated = [homepageResult, newsTemplateResult].filter((r) => r.created).length;
    const fileOverwritten = [homepageResult, newsTemplateResult].filter((r) => r.overwritten).length;
    const backupPaths = [homepageResult.backupPath, newsTemplateResult.backupPath].filter(Boolean);
    return { folderCreated, fileCreated, fileOverwritten, backupPaths, homepagePath: homepageResult.path };
  }

  async openHomepage() {
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    await this.syncHomepageBridgeSections({ ensureStructure: false, createSample: false });
    await this.openFileByPath(summary.homepagePath);
    return { notice: `학급 홈페이지를 열었습니다: ${summary.homepagePath}`, summary };
  }

  async appendTodayNoticeSection() {
    const summary = await this.createInitialStructure({ overwrite: false, backup: false });
    const file = this.app.vault.getAbstractFileByPath(summary.homepagePath);
    const oldContent = await this.app.vault.read(file);
    const dateText = this.getToday();
    const header = `## 🔔 오늘 공지 (${dateText})`;
    const legacyHeader = `## 오늘 공지 체크리스트 (${dateText})`;
    if (oldContent.includes(header) || oldContent.includes(legacyHeader)) {
      await this.openFileByPath(summary.homepagePath);
      return { notice: `오늘 공지 섹션이 이미 존재합니다: ${dateText}` };
    }
    const appended = ['', header, '- [ ] 공지 제목 작성', '- [ ] 전달 대상 점검', '- [ ] 학부모 확인 요청', ''].join('\n');
    await this.app.vault.modify(file, `${oldContent.trimEnd()}\n${appended}`);
    await this.openFileByPath(summary.homepagePath);
    return { notice: `오늘 공지 섹션을 추가했습니다: ${dateText}` };
  }

  async createNewsTemplateNote() {
    await this.ensureRequiredFolders();
    const result = await this.createOrUpdateNote(this.getNewsTemplatePath(), buildNewsTemplate({ formLink: this.getNewsSubmissionUrl() }), { overwrite: false, backup: false });
    await this.openFileByPath(result.path);
    return { notice: result.created ? `뉴스읽기 템플릿을 생성했습니다: ${result.path}` : `뉴스읽기 템플릿이 이미 있습니다: ${result.path}` };
  }

  async createTodayNoticeNote() {
    await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const result = await this.createOrUpdateNote(this.getTodayNoticePath(dateText), buildNoticeTemplate(dateText), { overwrite: false, backup: false });
    await this.openFileByPath(result.path);
    return { notice: result.created ? `오늘자 공지 노트를 생성했습니다: ${result.path}` : `오늘자 공지 노트가 이미 있습니다: ${result.path}` };
  }

  async createTodayNewsAssignment() {
    await this.ensureRequiredFolders();
    const dateText = this.getToday();
    const result = await this.createOrUpdateNote(this.getTodayNewsPath(dateText), buildNewsTemplate({ dateText, formLink: this.getNewsSubmissionUrl() }), { overwrite: false, backup: false });
    await this.openFileByPath(result.path);
    return { notice: result.created ? `오늘자 뉴스읽기 과제를 생성했습니다: ${result.path}` : `오늘자 뉴스읽기 과제가 이미 있습니다: ${result.path}` };
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
    const summary = await this.createInitialStructure({ overwrite: true, backup: true, backupStamp });
    await this.openFileByPath(summary.homepagePath);
    return { notice: `기본 구조를 재생성했습니다. 백업 ${summary.backupPaths.length}건: 999-Attachments/backups/${backupStamp}`, summary };
  }
}

function getCommandDefinitions(core) {
  return COMMAND_SPECS.map((command) => ({ id: command.id, name: command.name, run: () => core[command.method]() }));
}

class HomepageBackgroundImageModal extends FuzzySuggestModal {
  constructor(app, files, onChoose) {
    super(app);
    this.files = files;
    this.onChoose = onChoose;
    this.setPlaceholder('홈페이지 배경 이미지 선택');
    if (this.modalEl && typeof this.modalEl.addClass === 'function') {
      this.modalEl.addClass('homepage-image-modal');
    }
  }

  getItems() {
    return this.files;
  }

  getItemText(file) {
    return file.path;
  }

  renderSuggestion(file, el) {
    el.createDiv({ cls: 'homepage-image-modal__name', text: file.name });
    el.createDiv({ cls: 'homepage-image-modal__path', text: file.path });
  }

  onChooseItem(file) {
    if (typeof this.onChoose === 'function') {
      void this.onChoose(file);
    }
  }
}

module.exports = class ClassHomepageBratLite extends Plugin {
  async onload() {
    await this.loadSettings();
    this.rebuildCore();

    for (const command of getCommandDefinitions(this.core)) {
      this.addCommand({ id: command.id, name: command.name, callback: async () => this.executeCommand(command) });
    }

    this.addRibbonIcon('home', '학급 홈페이지 열기', async () => {
      const command = getCommandDefinitions(this.core).find((item) => item.id === 'open-class-homepage');
      if (command) await this.executeCommand(command);
    });

    this.registerMarkdownCodeBlockProcessor('homepage-dashboard', async (source, el) => {
      await this.renderHomepageDashboard(source, el);
    });
    this.registerMarkdownCodeBlockProcessor('student-relationship-graph', async (source, el) => {
      await this.renderStudentRelationshipGraphBlock(source, el);
    });

    this.addSettingTab(new ClassHomepageSettingTab(this.app, this));
    this.registerHomepageBridgeSyncEvents();
    void this.syncHomepageBridgeState();
  }

  rebuildCore() {
    this.core = new ClassHomepageCore({ app: this.app, settings: this.settings, normalizePath, now: () => new Date() });
  }

  async executeCommand(command) {
    try {
      const result = await command.run();
      if (result && result.notice) new Notice(result.notice);
      return result;
    } catch (error) {
      console.error('[homepage] command error', command.id, error);
      new Notice(`${command.name} 실행 중 오류가 발생했습니다.`);
      return null;
    }
  }

  async executeCommandById(commandId) {
    const command = getCommandDefinitions(this.core).find((item) => item.id === commandId);
    if (!command) {
      new Notice('홈페이지 액션을 찾지 못했습니다.');
      return null;
    }
    return this.executeCommand(command);
  }

  getLeafForOpen(mode = 'replace') {
    const getLeaf = this.app.workspace && typeof this.app.workspace.getLeaf === 'function'
      ? this.app.workspace.getLeaf.bind(this.app.workspace)
      : null;
    if (!getLeaf) return null;
    if (mode === 'tab') {
      try {
        return getLeaf('tab');
      } catch (error) {
        return getLeaf(true);
      }
    }
    return getLeaf(true);
  }

  async openFileByPath(pathValue, mode = 'replace') {
    const normalized = this.core.normalizePath(normalizeVaultPath(pathValue));
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!file) return null;
    const leaf = this.getLeafForOpen(mode);
    if (!leaf || typeof leaf.openFile !== 'function') return null;
    await leaf.openFile(file);
    return file;
  }

  async openDashboardTarget(pathValue, linkSpec, options = {}) {
    const normalized = this.core.normalizePath(normalizeVaultPath(pathValue));
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (file) {
      await this.openFileByPath(normalized, options.newTab ? 'tab' : 'replace');
      return;
    }
    if (linkSpec && linkSpec.fallbackCommandId) {
      new Notice(`${linkSpec.title} 파일이 없어 먼저 생성합니다.`);
      await this.executeCommandById(linkSpec.fallbackCommandId);
      const retriedFile = this.app.vault.getAbstractFileByPath(normalized);
      if (retriedFile) {
        await this.openFileByPath(normalized, options.newTab ? 'tab' : 'replace');
        return;
      }
      return;
    }
    new Notice(`${linkSpec && linkSpec.title ? linkSpec.title : '대상 노트'}를 찾지 못했습니다.`);
  }

  getHomepageImageFiles() {
    if (!this.app || !this.app.vault || typeof this.app.vault.getFiles !== 'function') {
      return [];
    }
    return this.app.vault.getFiles().filter((file) => isSupportedImageFile(file));
  }

  getHomepageBackgroundFile() {
    const ui = normalizeHomepageUiSettings(this.settings.homepageUi);
    if (ui.backgroundImageMode !== 'vault') return null;
    const pathValue = normalizeVaultPath(ui.backgroundImagePath, '');
    if (!pathValue) return null;
    const file = this.app.vault.getAbstractFileByPath(pathValue);
    return isSupportedImageFile(file) ? file : null;
  }

  getHomepageBackgroundResourcePath() {
    const ui = normalizeHomepageUiSettings(this.settings.homepageUi);
    if (ui.backgroundImageMode === 'embedded' && ui.backgroundImageDataUrl) {
      return ui.backgroundImageDataUrl;
    }
    if (ui.backgroundImageMode === 'external') {
      return resolveExternalImageResourcePath(ui.backgroundImageExternalPath);
    }
    const file = this.getHomepageBackgroundFile();
    if (!file) return '';
    const adapter = this.app && this.app.vault ? this.app.vault.adapter : null;
    return adapter && typeof adapter.getResourcePath === 'function' ? adapter.getResourcePath(file.path) : '';
  }

  async updateHomepageUi(partial) {
    this.settings.homepageUi = normalizeHomepageUiSettings(Object.assign({}, this.settings.homepageUi, partial));
    await this.saveSettings();
    this.rebuildCore();
    this.requestHomepageRefresh();
  }

  async setHomepageBackgroundMode(modeValue) {
    await this.updateHomepageUi({ backgroundImageMode: String(modeValue || 'none').trim() });
  }

  async setHomepageBackgroundImageData(dataUrl, label = '') {
    const nextDataUrl = normalizeDataUrl(dataUrl, '');
    await this.updateHomepageUi({
      backgroundImageMode: nextDataUrl ? 'embedded' : 'none',
      backgroundImageDataUrl: nextDataUrl,
      backgroundImageLabel: normalizeBackgroundLabel(label, ''),
      backgroundImagePath: '',
      backgroundImageExternalPath: '',
    });
  }

  async setHomepageBackgroundImagePath(pathValue) {
    const nextPath = normalizeVaultPath(pathValue, '');
    await this.updateHomepageUi({
      backgroundImageMode: nextPath
        ? 'vault'
        : (normalizeExternalImagePath(this.settings.homepageUi.backgroundImageExternalPath, '') ? 'external' : (normalizeDataUrl(this.settings.homepageUi.backgroundImageDataUrl, '') ? 'embedded' : 'none')),
      backgroundImagePath: nextPath,
    });
  }

  async setHomepageExternalBackgroundImagePath(pathValue) {
    const nextPath = normalizeExternalImagePath(pathValue, '');
    await this.updateHomepageUi({
      backgroundImageMode: nextPath
        ? 'external'
        : (normalizeVaultPath(this.settings.homepageUi.backgroundImagePath, '') ? 'vault' : (normalizeDataUrl(this.settings.homepageUi.backgroundImageDataUrl, '') ? 'embedded' : 'none')),
      backgroundImageExternalPath: nextPath,
    });
  }

  async clearHomepageBackgroundImage() {
    await this.updateHomepageUi({
      backgroundImageMode: 'none',
      backgroundImageDataUrl: '',
      backgroundImageLabel: '',
      backgroundImagePath: '',
      backgroundImageExternalPath: '',
    });
  }

  async pickHomepageImageFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';

      let settled = false;
      const cleanup = () => {
        window.removeEventListener('focus', onWindowFocus, true);
        input.remove();
      };
      const finalize = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value || null);
      };
      const onWindowFocus = () => {
        window.setTimeout(() => {
          if (settled) return;
          const file = input.files && input.files[0];
          if (!file) finalize(null);
        }, 480);
      };

      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) {
          finalize(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          finalize({
            dataUrl: normalizeDataUrl(reader.result, ''),
            label: file.name || '선택한 이미지',
          });
        };
        reader.onerror = () => {
          new Notice('이미지 파일을 읽지 못했습니다.');
          finalize(null);
        };
        reader.readAsDataURL(file);
      }, { once: true });
      window.addEventListener('focus', onWindowFocus, true);
      document.body.appendChild(input);
      input.click();
    });
  }

  async readVaultImageAsDataUrl(file) {
    if (!isSupportedImageFile(file)) {
      return null;
    }
    const adapter = this.app && this.app.vault ? this.app.vault.adapter : null;
    if (!adapter || typeof adapter.readBinary !== 'function') {
      return null;
    }
    const binary = await adapter.readBinary(file.path);
    const mime = getImageMimeTypeFromName(file.name || file.path || '');
    return {
      dataUrl: `data:${mime};base64,${arrayBufferToBase64(binary)}`,
      label: file.path,
    };
  }

  async executeDashboardAction(action, config) {
    await this.executeCommandById(action.commandId);
    const targetPath = action.targetKey ? String(config[action.targetKey] || '').trim() : '';
    if (!targetPath) return;
    await this.openDashboardTarget(targetPath, { title: action.title }, { newTab: true });
  }

  buildDashboardActionCard(container, action, config) {
    const button = container.createEl('button', {
      cls: 'homepage-dashboard__action',
      attr: { type: 'button' },
    });
    button.dataset.tone = action.tone;

    const iconWrap = button.createDiv({ cls: 'homepage-dashboard__icon' });
    setIcon(iconWrap, action.icon);

    const copy = button.createDiv({ cls: 'homepage-dashboard__copy' });
    copy.createDiv({ cls: 'homepage-dashboard__action-title', text: action.title });
    copy.createDiv({ cls: 'homepage-dashboard__action-description', text: action.description });

    button.addEventListener('click', () => {
      void this.executeDashboardAction(action, config);
    });
  }

  async resolveDashboardSummaryItem(config, linkSpec, dateText) {
    const targetPath = this.core.normalizePath(normalizeVaultPath(config[linkSpec.key] || ''));
    const file = targetPath ? this.app.vault.getAbstractFileByPath(targetPath) : null;
    if (!(file instanceof TFile)) {
      return {
        linkSpec,
        targetPath,
        summary: buildPendingDashboardSummary(linkSpec),
        pathLabel: targetPath ? formatDashboardPathLabel(targetPath) : '연결된 노트가 아직 없습니다.',
      };
    }

    const content = await this.app.vault.read(file);
    let summaryState = null;
    switch (linkSpec.key) {
      case 'notice':
        summaryState = summarizeNoticeNote(content, dateText);
        break;
      case 'attendance':
        summaryState = summarizeStudentGrowthNote(content);
        break;
      case 'classStore':
        summaryState = summarizePraiseNote(content);
        break;
      case 'classReport':
        summaryState = summarizeWeeklyReportNote(content, targetPath);
        break;
      default:
        summaryState = { summary: buildPendingDashboardSummary(linkSpec) };
        break;
    }

    return {
      linkSpec,
      targetPath,
      summary: String(summaryState && summaryState.summary ? summaryState.summary : buildPendingDashboardSummary(linkSpec)).trim(),
      pathLabel: formatDashboardPathLabel(targetPath),
    };
  }

  buildDashboardSummaryLine(container, summaryItem) {
    const entry = container.createDiv({ cls: 'homepage-dashboard__summary-entry' });
    const line = entry.createDiv({ cls: 'homepage-dashboard__summary-line' });
    const titleButton = line.createEl('button', {
      cls: 'homepage-dashboard__summary-link',
      attr: { type: 'button' },
      text: summaryItem.linkSpec.title,
    });
    titleButton.addEventListener('click', () => {
      void this.openDashboardTarget(summaryItem.targetPath, summaryItem.linkSpec, { newTab: true });
    });

    const summaryText = line.createSpan({ cls: 'homepage-dashboard__summary-text' });
    summaryText.setText(` · ${summaryItem.summary}`);

    const meta = entry.createDiv({ cls: 'homepage-dashboard__summary-meta' });
    meta.setText(summaryItem.pathLabel);
  }

  async loadStudentRelationshipGraph(config) {
    const dateText = String(config.date || this.core.getToday()).trim();
    const fallbackPath = normalizeVaultPath(`6. 학생성장/관계그래프/${dateText}-학생 관계 그래프.json`);
    const graphPath = this.core.normalizePath(normalizeVaultPath(config.path || config.studentGraph || fallbackPath));
    const graphFile = this.app.vault.getAbstractFileByPath(graphPath);
    if (graphFile instanceof TFile) {
      try {
        const text = await this.app.vault.read(graphFile);
        const parsed = JSON.parse(text);
        return {
          path: graphPath,
          exists: true,
          payload: normalizeStudentRelationshipGraph(parsed, dateText),
        };
      } catch (error) {
        console.warn('[homepage] failed to parse student relationship graph', graphPath, error);
      }
    }
    return {
      path: graphPath,
      exists: false,
      payload: normalizeStudentRelationshipGraph(null, dateText),
    };
  }

  getStudentGraphViewPath(config, graphState) {
    const dateText = String(config.date || this.core.getToday()).trim();
    const preferredPath = normalizeNotePath(String(config.studentGraphView || '').trim(), '');
    return this.core.normalizePath(preferredPath || deriveStudentGraphViewPath(graphState.path, dateText));
  }

  async ensureStudentRelationshipGraphView(config, graphState = null) {
    const state = graphState || await this.loadStudentRelationshipGraph(config);
    const dateText = String(config.date || this.core.getToday()).trim();
    const viewPath = this.getStudentGraphViewPath(config, state);
    const content = buildStudentRelationshipGraphViewNote({
      dateText,
      graphPath: state.path,
      graphData: state.payload,
    });
    await this.core.createOrUpdateNote(viewPath, content, { overwrite: true, backup: false });
    return viewPath;
  }

  buildMetricStrip(container, items = []) {
    const strip = container.createDiv({ cls: 'homepage-dashboard__graph-metrics' });
    for (const item of items) {
      const pill = strip.createDiv({ cls: 'homepage-dashboard__graph-metric' });
      pill.createSpan({ cls: 'homepage-dashboard__graph-metric-label', text: item.label });
      pill.createSpan({ cls: 'homepage-dashboard__graph-metric-value', text: item.value });
    }
  }

  buildGraphMetricStrip(container, metrics, options = {}) {
    const items = [
      { label: '학생', value: `${metrics.studentCount}명` },
      { label: '관계선', value: `${metrics.edgeCount}개` },
      { label: '지원 관찰', value: `${metrics.supportCount}명` },
      { label: '주제', value: `${metrics.topicCount}개` },
    ];
    if (options.hiddenCount > 0) {
      items.push({ label: '미리보기', value: `+${options.hiddenCount}` });
    }
    this.buildMetricStrip(container, items);
  }

  async loadClassStoreSummary(config) {
    const dateText = String(config.date || this.core.getToday()).trim();
    const baseDate = new Date(`${dateText}T12:00:00`);
    const week = getWeekRange(baseDate);
    const fallbackNotePath = `6. 학생성장/칭찬후보/${week.start}~${week.end}-칭찬 후보.md`;
    const notePath = this.core.normalizePath(
      normalizeNotePath(String(config.classStore || config.praise || '').trim(), fallbackNotePath)
    );

    const noteFile = this.app.vault.getAbstractFileByPath(notePath);
    if (noteFile instanceof TFile) {
      try {
        const text = await this.app.vault.read(noteFile);
        return {
          exists: true,
          notePath,
          summary: parsePraiseCandidatesFromNote(text),
        };
      } catch (error) {
        console.warn('[homepage] failed to read class store note', notePath, error);
      }
    }

    const jsonPath = notePath.replace(/\.md$/i, '.json');
    const jsonFile = this.app.vault.getAbstractFileByPath(jsonPath);
    if (jsonFile instanceof TFile) {
      try {
        const text = await this.app.vault.read(jsonFile);
        return {
          exists: true,
          notePath,
          summary: JSON.parse(text),
        };
      } catch (error) {
        console.warn('[homepage] failed to parse class store json', jsonPath, error);
      }
    }

    return {
      exists: false,
      notePath,
      summary: buildSamplePraiseCandidates(formatIsoWeek(baseDate)),
    };
  }

  buildStoreSummaryCard(container, options = {}) {
    const notePath = String(options.notePath || '').trim();
    const title = String(options.title || '우리반 상점').trim();
    const students = Array.isArray(options.students) ? options.students : [];
    const description = students.length > 0 ? formatStudentRefs(students) : '아직 후보가 없습니다.';

    const button = container.createEl('button', {
      cls: 'homepage-dashboard__link-card',
      attr: { type: 'button' },
    });

    const iconWrap = button.createDiv({ cls: 'homepage-dashboard__link-icon' });
    setIcon(iconWrap, String(options.icon || 'award'));

    const copy = button.createDiv({ cls: 'homepage-dashboard__copy' });
    copy.createDiv({ cls: 'homepage-dashboard__link-title', text: title });
    copy.createDiv({ cls: 'homepage-dashboard__link-description', text: description });

    const pathEl = copy.createDiv({ cls: 'homepage-dashboard__link-path' });
    pathEl.innerHTML = escapeHtml(formatDashboardPathLabel(notePath));
    pathEl.title = notePath || '클릭 시 생성 후 이동';

    button.addEventListener('click', () => {
      void this.openDashboardTarget(notePath, { title }, { newTab: true });
    });
  }

  async buildWeeklyStoreSignal(container, config) {
    const storeState = await this.loadClassStoreSummary(config);
    const categories = storeState.summary && typeof storeState.summary.categories === 'object'
      ? storeState.summary.categories
      : {};
    const dailyWriter = Array.isArray(categories.daily_writer) ? categories.daily_writer : [];
    const goalKeeper = Array.isArray(categories.goal_keeper) ? categories.goal_keeper : [];
    const questionAsker = Array.isArray(categories.question_asker) ? categories.question_asker : [];

    const panel = container.createDiv({ cls: 'homepage-dashboard__graph homepage-dashboard__graph--store' });
    panel.dataset.source = storeState.exists ? 'live' : 'sample';

    const header = panel.createDiv({ cls: 'homepage-dashboard__graph-header' });
    header.createDiv({
      cls: 'homepage-dashboard__graph-kicker',
      text: storeState.exists ? '이번 주 상점 순위' : '이번 주 상점 순위 · 샘플',
    });
    header.createDiv({ cls: 'homepage-dashboard__graph-title', text: '우리반 상점 카드' });
    header.createDiv({
      cls: 'homepage-dashboard__graph-caption',
      text: '학생 관계 그래프는 교사용 노트로 분리하고, 홈페이지에는 이번 주 상점 순위만 카드로 보여줍니다.',
    });

    this.buildMetricStrip(header, [
      { label: '후보', value: `${countDistinctStudentRefs([dailyWriter, goalKeeper, questionAsker])}명` },
      { label: '기록', value: `${dailyWriter.length}명` },
      { label: '목표', value: `${goalKeeper.length}명` },
      { label: '질문', value: `${questionAsker.length}명` },
    ]);

    const actions = header.createDiv({ cls: 'homepage-dashboard__graph-actions' });
    const graphButton = actions.createEl('button', {
      cls: 'homepage-dashboard__graph-open',
      text: '교사용 관계 그래프',
      attr: { type: 'button' },
    });
    graphButton.addEventListener('click', () => {
      void (async () => {
        const graphState = await this.loadStudentRelationshipGraph(config);
        const viewPath = await this.ensureStudentRelationshipGraphView(config, graphState);
        await this.openFileByPath(viewPath, 'tab');
      })();
    });

    const cards = panel.createDiv({ cls: 'homepage-dashboard__links homepage-dashboard__links--signal' });
    this.buildStoreSummaryCard(cards, {
      title: '기록 성실',
      students: dailyWriter,
      notePath: storeState.notePath,
      icon: 'sparkles',
    });
    this.buildStoreSummaryCard(cards, {
      title: '목표 실천',
      students: goalKeeper,
      notePath: storeState.notePath,
      icon: 'award',
    });
    this.buildStoreSummaryCard(cards, {
      title: '질문 활동',
      students: questionAsker,
      notePath: storeState.notePath,
      icon: 'message-square',
    });
  }

  renderRelationshipGraphCanvas(container, graphData, options = {}) {
    const canvas = container.createDiv({ cls: 'homepage-dashboard__graph-canvas' });
    if (options.full) {
      canvas.addClass('homepage-dashboard__graph-canvas--full');
    }

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'homepage-dashboard__graph-lines');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    canvas.appendChild(svg);
    const nodeLayer = canvas.createDiv({ cls: 'homepage-dashboard__graph-node-layer' });
    const state = new Map(graphData.nodes.map((node) => [node.id, { ...node }]));
    const edgeEls = graphData.edges.map((edge) => {
      const line = document.createElementNS(svgNs, 'line');
      line.dataset.relation = edge.relation || '';
      line.style.strokeWidth = `${1 + (edge.weight * 2.2)}`;
      line.style.opacity = `${0.24 + (edge.weight * 0.44)}`;
      svg.appendChild(line);
      return { edge, line };
    });
    const nodeEls = new Map();
    const renderGraph = () => {
      for (const { edge, line } of edgeEls) {
        const sourceNode = state.get(edge.source);
        const targetNode = state.get(edge.target);
        if (!sourceNode || !targetNode) continue;
        line.setAttribute('x1', String(sourceNode.x));
        line.setAttribute('y1', String(sourceNode.y));
        line.setAttribute('x2', String(targetNode.x));
        line.setAttribute('y2', String(targetNode.y));
      }
      for (const [nodeId, nodeEl] of nodeEls.entries()) {
        const node = state.get(nodeId);
        if (!node) continue;
        nodeEl.style.left = `${node.x}%`;
        nodeEl.style.top = `${node.y}%`;
      }
    };

    const bindDrag = (nodeId, nodeEl) => {
      if (options.draggable === false) return;
      let draggingPointerId = null;
      const stopDragging = () => {
        draggingPointerId = null;
        nodeEl.removeClass('is-dragging');
      };
      nodeEl.addEventListener('pointerdown', (event) => {
        draggingPointerId = event.pointerId;
        nodeEl.addClass('is-dragging');
        nodeEl.setPointerCapture(event.pointerId);
      });
      nodeEl.addEventListener('pointermove', (event) => {
        if (draggingPointerId !== event.pointerId) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const node = state.get(nodeId);
        if (!node) return;
        node.x = clampNumber(((event.clientX - rect.left) / rect.width) * 100, 8, 92, node.x);
        node.y = clampNumber(((event.clientY - rect.top) / rect.height) * 100, 10, 90, node.y);
        renderGraph();
      });
      nodeEl.addEventListener('pointerup', stopDragging);
      nodeEl.addEventListener('pointercancel', stopDragging);
      nodeEl.addEventListener('lostpointercapture', stopDragging);
    };

    for (const node of graphData.nodes) {
      const chip = nodeLayer.createEl('button', {
        cls: 'homepage-dashboard__graph-node',
        attr: { type: 'button' },
      });
      chip.dataset.kind = node.kind;
      if (typeof node.mastery === 'number') {
        chip.dataset.mastery = node.mastery >= 0.75 ? 'high' : node.mastery >= 0.5 ? 'mid' : 'low';
        chip.title = `${node.label} 이해도 ${Math.round(node.mastery * 100)}점`;
      } else {
        chip.title = node.label;
      }
      chip.setText(node.label);
      nodeEls.set(node.id, chip);
      bindDrag(node.id, chip);
    }

    renderGraph();
  }

  async buildRelationshipSignal(container, config) {
    const graphState = await this.loadStudentRelationshipGraph(config);
    const previewData = buildPreviewStudentRelationshipGraph(graphState.payload, 12);
    const metrics = summarizeStudentRelationshipGraph(graphState.payload);
    const graph = container.createDiv({ cls: 'homepage-dashboard__graph' });
    graph.dataset.source = graphState.exists ? 'live' : 'sample';
    if (previewData.isPreview) {
      graph.addClass('is-preview');
    }

    const graphHeader = graph.createDiv({ cls: 'homepage-dashboard__graph-header' });
    graphHeader.createDiv({ cls: 'homepage-dashboard__graph-kicker', text: graphState.exists ? '학생 데이터 그래프' : '학생 데이터 그래프 · 샘플' });
    graphHeader.createDiv({ cls: 'homepage-dashboard__graph-title', text: previewData.title });
    graphHeader.createDiv({
      cls: 'homepage-dashboard__graph-caption',
      text: previewData.isPreview
        ? `학생 수가 많아 ${previewData.nodes.length}개 노드만 미리 보여줍니다. 전체 관계도는 별도 그래프 뷰에서 확인하는 편이 적절합니다.`
        : (graphState.exists
          ? 'JSON 기반 관계/이해도 그래프입니다. 노드를 끌어 거리와 연결을 확인할 수 있습니다.'
          : '아직 학생 그래프 JSON이 없어 샘플로 보여줍니다. 이후 OmniForge 데이터로 바로 교체할 수 있습니다.'),
    });

    this.buildGraphMetricStrip(graphHeader, metrics, { hiddenCount: previewData.hiddenCount });

    const graphActions = graphHeader.createDiv({ cls: 'homepage-dashboard__graph-actions' });
    const openButton = graphActions.createEl('button', {
      cls: 'homepage-dashboard__graph-open',
      text: '전체 그래프 보기',
      attr: { type: 'button' },
    });
    openButton.addEventListener('click', () => {
      void (async () => {
        const viewPath = await this.ensureStudentRelationshipGraphView(config, graphState);
        await this.openFileByPath(viewPath, 'tab');
      })();
    });

    this.renderRelationshipGraphCanvas(graph, previewData, { full: false, draggable: true });
  }

  async renderStudentRelationshipGraphBlock(source, el) {
    const config = parseHomepageDashboardConfig(source);
    const graphState = await this.loadStudentRelationshipGraph(config);
    const metrics = summarizeStudentRelationshipGraph(graphState.payload);

    const graph = el.createDiv({ cls: 'homepage-dashboard__graph homepage-dashboard__graph--full' });
    graph.dataset.source = graphState.exists ? 'live' : 'sample';
    const header = graph.createDiv({ cls: 'homepage-dashboard__graph-header' });
    header.createDiv({ cls: 'homepage-dashboard__graph-kicker', text: graphState.exists ? '학생 관계 그래프 뷰' : '학생 관계 그래프 뷰 · 샘플' });
    header.createDiv({ cls: 'homepage-dashboard__graph-title', text: graphState.payload.title });
    header.createDiv({
      cls: 'homepage-dashboard__graph-caption',
      text: '학생 관계, 질문 활동, 이해도 신호를 한 화면에서 탐색합니다. 노드를 직접 끌어 배치하며 관계를 볼 수 있습니다.',
    });
    this.buildGraphMetricStrip(header, metrics);
    this.renderRelationshipGraphCanvas(graph, graphState.payload, { full: true, draggable: true });
  }

  async renderHomepageDashboard(source, el) {
    const config = parseHomepageDashboardConfig(source);
    const ui = normalizeHomepageUiSettings(this.settings.homepageUi);
    const dateText = String(config.date || this.core.getToday()).trim();
    const backgroundResourcePath = this.getHomepageBackgroundResourcePath();
    const overlayVars = buildOverlayStrengthVars(ui.heroOverlayStrength);

    const root = el.createDiv({ cls: 'homepage-dashboard' });
    root.dataset.preset = ui.themePreset;
    root.dataset.backgroundMode = ui.backgroundImageMode;
    root.dataset.showGraph = ui.showRelationshipGraph ? 'true' : 'false';
    root.style.setProperty('--homepage-accent', ui.accentColor);
    root.style.setProperty('--homepage-hero-height', `${ui.heroHeight}px`);
    root.style.setProperty('--homepage-overlay-top', overlayVars.top);
    root.style.setProperty('--homepage-overlay-middle', overlayVars.middle);
    root.style.setProperty('--homepage-overlay-bottom', overlayVars.bottom);
    root.style.setProperty('--homepage-overlay-side-start', overlayVars.sideStart);
    root.style.setProperty('--homepage-overlay-side-center', overlayVars.sideCenter);
    root.style.setProperty('--homepage-overlay-side-end', overlayVars.sideEnd);
    if (backgroundResourcePath) {
      root.addClass('has-background-image');
      root.style.setProperty('--homepage-bg-image', `url("${backgroundResourcePath.replace(/"/g, '\\"')}")`);
    }

    const hero = root.createDiv({ cls: 'homepage-dashboard__hero' });
    const heroLayout = hero.createDiv({ cls: 'homepage-dashboard__hero-layout' });
    const heroCopy = heroLayout.createDiv({ cls: 'homepage-dashboard__hero-copy' });
    heroCopy.createDiv({ cls: 'homepage-dashboard__eyebrow', text: `${dateText} 운영 허브` });
    heroCopy.createEl('h3', { cls: 'homepage-dashboard__title', text: `${ui.heroEmoji} ${ui.heroTitle}` });
    heroCopy.createEl('p', { cls: 'homepage-dashboard__subtitle', text: ui.heroSubtitle });

    const badges = heroCopy.createDiv({ cls: 'homepage-dashboard__badges' });
    for (const badgeText of ['오늘의 공지', '오늘의 출석', '우리반 상점', '교사용 그래프 분리']) {
      badges.createDiv({ cls: 'homepage-dashboard__badge', text: badgeText });
    }

    if (ui.showRelationshipGraph) {
      await this.buildWeeklyStoreSignal(heroLayout, config);
    }

    const actions = root.createDiv({ cls: 'homepage-dashboard__actions' });
    for (const action of HOMEPAGE_DASHBOARD_ACTIONS) {
      this.buildDashboardActionCard(actions, action, config);
    }

    const summary = root.createDiv({ cls: 'homepage-dashboard__summary' });
    summary.createDiv({ cls: 'homepage-dashboard__summary-title', text: '오늘 한 줄 요약' });
    const summaryBody = summary.createDiv({ cls: 'homepage-dashboard__summary-body' });
    for (const linkSpec of HOMEPAGE_DASHBOARD_LINKS) {
      const item = await this.resolveDashboardSummaryItem(config, linkSpec, dateText);
      this.buildDashboardSummaryLine(summaryBody, item);
    }

    const footnote = root.createDiv({ cls: 'homepage-dashboard__footnote' });
    footnote.setText('공지, 출석, 상점, 리포트는 연결된 노트를 읽어 바로 반영하고, 학생 관계 그래프는 교사용 노트에서만 확인합니다.');
  }

  async ensureInitialStructureSafe() {
    try {
      const summary = await this.core.createInitialStructure({ overwrite: false, backup: false });
      new Notice(`초기 구조 생성 완료: 폴더 ${summary.folderCreated}개, 파일 ${summary.fileCreated}개 생성`);
    } catch (error) {
      console.error('[homepage] ensureInitialStructureSafe error', error);
      new Notice('초기 구조 생성에 실패했습니다.');
    }
  }

  async loadSettings() {
    const loaded = (await this.loadData()) || {};
    const merged = Object.assign({}, DEFAULT_SETTINGS, loaded);
    merged.homepageUi = normalizeHomepageUiSettings(loaded.homepageUi || DEFAULT_SETTINGS.homepageUi);
    merged.googleForm = normalizeGoogleFormSettings(loaded.googleForm || DEFAULT_SETTINGS.googleForm);
    if (!merged.googleForm.newsSubmissionUrl && merged.formLink) {
      merged.googleForm.newsSubmissionUrl = String(merged.formLink).trim();
    }
    this.settings = merged;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  requestHomepageRefresh() {
    const leaves = this.app.workspace && typeof this.app.workspace.getLeavesOfType === 'function'
      ? this.app.workspace.getLeavesOfType('markdown')
      : [];
    for (const leaf of leaves) {
      const preview = leaf && leaf.view ? leaf.view.previewMode : null;
      if (preview && typeof preview.rerender === 'function') {
        preview.rerender(true);
      }
    }
    if (this.app.workspace && typeof this.app.workspace.trigger === 'function') {
      this.app.workspace.trigger('layout-change');
    }
  }

  isHomepageBridgeSourcePath(pathValue) {
    const normalized = this.core.normalizePath(normalizeVaultPath(pathValue, ''));
    if (!normalized) return false;
    return normalized.startsWith('6. 학생성장/일일체크인-요약/')
      || normalized.startsWith('6. 학생성장/칭찬후보/')
      || normalized.startsWith('6. 학생성장/관계그래프/');
  }

  isHomepageSummarySourcePath(pathValue) {
    const normalized = this.core.normalizePath(normalizeVaultPath(pathValue, ''));
    return normalized.startsWith('6. 학생성장/일일체크인-요약/')
      || normalized.startsWith('6. 학생성장/칭찬후보/');
  }

  isStudentGraphSourcePath(pathValue) {
    const normalized = this.core.normalizePath(normalizeVaultPath(pathValue, ''));
    return normalized.startsWith('6. 학생성장/관계그래프/') && normalized.toLowerCase().endsWith('.json');
  }

  registerHomepageBridgeSyncEvents() {
    if (!this.app || !this.app.vault || typeof this.app.vault.on !== 'function') return;

    const schedule = (target) => {
      const pathValue = typeof target === 'string' ? target : (target && target.path ? target.path : '');
      if (!this.isHomepageBridgeSourcePath(pathValue)) return;
      if (this.homepageBridgeSyncTimer) {
        window.clearTimeout(this.homepageBridgeSyncTimer);
      }
      this.homepageBridgeSyncTimer = window.setTimeout(() => {
        this.homepageBridgeSyncTimer = 0;
        void this.syncHomepageBridgeState(pathValue);
      }, 180);
    };

    this.registerEvent(this.app.vault.on('create', schedule));
    this.registerEvent(this.app.vault.on('modify', schedule));
    this.registerEvent(this.app.vault.on('delete', schedule));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      schedule(file);
      schedule(oldPath);
    }));
  }

  async syncHomepageBridgeState(changedPath = '') {
    try {
      const homepageFile = this.app.vault.getAbstractFileByPath(this.core.getHomepagePath());
      if (!homepageFile) return;

      if (!changedPath || this.isHomepageSummarySourcePath(changedPath)) {
        await this.core.syncHomepageBridgeSections({ ensureStructure: false, createSample: false, refreshDerivedNote: true });
      }

      if (!changedPath || this.isStudentGraphSourcePath(changedPath)) {
        await this.ensureStudentRelationshipGraphView({
          date: this.core.getToday(),
          studentGraph: normalizeVaultPath(changedPath, `6. 학생성장/관계그래프/${this.core.getToday()}-학생 관계 그래프.json`),
        });
      }

      this.requestHomepageRefresh();
    } catch (error) {
      console.warn('[homepage] homepage bridge sync failed', changedPath, error);
    }
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
    containerEl.createEl('h2', { text: 'homepage 설정' });

    new Setting(containerEl)
      .setName('홈페이지 노트 경로')
      .setDesc('예: 홈/홈페이지.md (슬래시/백슬래시 모두 허용)')
      .addText((text) => text.setPlaceholder('홈/홈페이지.md').setValue(this.plugin.settings.homepagePath).onChange(async (value) => {
        this.plugin.settings.homepagePath = value.trim();
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('뉴스읽기 폴더')
      .setDesc('예: 3. 뉴스읽기')
      .addText((text) => text.setPlaceholder('3. 뉴스읽기').setValue(this.plugin.settings.newsFolder).onChange(async (value) => {
        this.plugin.settings.newsFolder = value.trim();
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    containerEl.createEl('h3', { text: '홈페이지 커스터마이징' });
    containerEl.createEl('p', {
      text: '상단 운영 카드의 제목, 부제, 색상, 프리셋을 바꿉니다. 열린 홈페이지 미리보기는 저장 후 다시 그려집니다.',
    });

    new Setting(containerEl)
      .setName('히어로 이모지')
      .setDesc('예: 🏫, ✨, 🌿')
      .addText((text) => text.setPlaceholder('🏫').setValue(this.plugin.settings.homepageUi.heroEmoji).onChange(async (value) => {
        this.plugin.settings.homepageUi.heroEmoji = value.trim() || DEFAULT_HOMEPAGE_UI.heroEmoji;
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('히어로 제목')
      .setDesc('상단 큰 제목에 표시됩니다.')
      .addText((text) => text.setPlaceholder(DEFAULT_HOMEPAGE_UI.heroTitle).setValue(this.plugin.settings.homepageUi.heroTitle).onChange(async (value) => {
        this.plugin.settings.homepageUi.heroTitle = value.trim() || DEFAULT_HOMEPAGE_UI.heroTitle;
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('히어로 부제')
      .setDesc('상단 카드의 설명 문구입니다.')
      .addTextArea((text) => text.setPlaceholder(DEFAULT_HOMEPAGE_UI.heroSubtitle).setValue(this.plugin.settings.homepageUi.heroSubtitle).onChange(async (value) => {
        this.plugin.settings.homepageUi.heroSubtitle = value.trim() || DEFAULT_HOMEPAGE_UI.heroSubtitle;
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('테마 프리셋')
      .setDesc('카드의 기본 분위기를 선택합니다.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('sunrise', 'Sunrise')
          .addOption('ocean', 'Ocean')
          .addOption('forest', 'Forest')
          .setValue(this.plugin.settings.homepageUi.themePreset)
          .onChange(async (value) => {
            this.plugin.settings.homepageUi.themePreset = value;
            await this.plugin.saveSettings();
            this.plugin.rebuildCore();
            this.plugin.requestHomepageRefresh();
          });
      });

    new Setting(containerEl)
      .setName('강조 색상')
      .setDesc('예: #2f6fdd')
      .addText((text) => text.setPlaceholder(DEFAULT_HOMEPAGE_UI.accentColor).setValue(this.plugin.settings.homepageUi.accentColor).onChange(async (value) => {
        this.plugin.settings.homepageUi.accentColor = normalizeAccentColor(value, DEFAULT_HOMEPAGE_UI.accentColor);
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('히어로 높이')
      .setDesc('상단 배경 히어로 영역의 높이를 조절합니다.')
      .addSlider((slider) => {
        slider
          .setLimits(240, 640, 20)
          .setValue(normalizeHeroHeight(this.plugin.settings.homepageUi.heroHeight, DEFAULT_HOMEPAGE_UI.heroHeight))
          .setDynamicTooltip()
          .onChange(async (value) => {
            await this.plugin.updateHomepageUi({ heroHeight: normalizeHeroHeight(value, DEFAULT_HOMEPAGE_UI.heroHeight) });
          });
      });

    new Setting(containerEl)
      .setName('오버레이 진하기')
      .setDesc('배경 이미지 위 글자가 더 잘 보이도록 어둡게 덮는 정도를 조절합니다.')
      .addSlider((slider) => {
        slider
          .setLimits(10, 100, 5)
          .setValue(normalizeHeroOverlayStrength(this.plugin.settings.homepageUi.heroOverlayStrength, DEFAULT_HOMEPAGE_UI.heroOverlayStrength))
          .setDynamicTooltip()
          .onChange(async (value) => {
            await this.plugin.updateHomepageUi({ heroOverlayStrength: normalizeHeroOverlayStrength(value, DEFAULT_HOMEPAGE_UI.heroOverlayStrength) });
          });
      });

    new Setting(containerEl)
      .setName('상단 요약 패널 표시')
      .setDesc('우측 요약 패널을 숨기고, 히어로 문구만 넓게 쓸 수 있습니다. 관계 그래프는 별도 교사용 노트에서 확인합니다.')
      .addToggle((toggle) => toggle
        .setValue(normalizeBooleanSetting(this.plugin.settings.homepageUi.showRelationshipGraph, DEFAULT_HOMEPAGE_UI.showRelationshipGraph))
        .onChange(async (value) => {
          await this.plugin.updateHomepageUi({ showRelationshipGraph: value });
        }));

    let backgroundImageText = null;
    const refreshBackgroundControls = () => {
      const ui = normalizeHomepageUiSettings(this.plugin.settings.homepageUi);
      if (backgroundImageText) backgroundImageText.setValue(ui.backgroundImageLabel || '');
    };

    new Setting(containerEl)
      .setName('홈페이지 배경 이미지')
      .setDesc('내부/외부 구분 없이 파일을 고르면 상단 히어로에 바로 적용합니다. 이미지는 경로 대신 플러그인 설정에 저장됩니다.')
      .addText((text) => {
        backgroundImageText = text;
        text
          .setPlaceholder('선택된 파일 없음')
          .setValue(this.plugin.settings.homepageUi.backgroundImageLabel || '');
        if (text.inputEl) {
          text.inputEl.readOnly = true;
        }
      })
      .addButton((button) => button.setButtonText('파일 선택').setCta().onClick(async () => {
        const selected = await this.plugin.pickHomepageImageFile();
        if (!selected || !selected.dataUrl) return;
        await this.plugin.setHomepageBackgroundImageData(selected.dataUrl, selected.label);
        refreshBackgroundControls();
        new Notice(`홈페이지 배경 이미지를 설정했습니다: ${selected.label}`);
      }))
      .addButton((button) => button.setButtonText('현재 파일 사용').onClick(async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!isSupportedImageFile(activeFile)) {
          new Notice('현재 열린 파일이 이미지가 아닙니다.');
          return;
        }
        const payload = await this.plugin.readVaultImageAsDataUrl(activeFile);
        if (!payload || !payload.dataUrl) {
          new Notice('현재 이미지를 읽지 못했습니다.');
          return;
        }
        await this.plugin.setHomepageBackgroundImageData(payload.dataUrl, payload.label);
        refreshBackgroundControls();
        new Notice(`현재 이미지를 배경으로 설정했습니다: ${payload.label}`);
      }))
      .addButton((button) => button.setButtonText('지우기').onClick(async () => {
        await this.plugin.clearHomepageBackgroundImage();
        refreshBackgroundControls();
        new Notice('홈페이지 배경 이미지를 제거했습니다.');
      }));

    containerEl.createEl('h3', { text: 'Google Form 링크(분리 설정)' });

    const addGoogleFormSetting = (name, desc, key, placeholder) => {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addText((text) => text.setPlaceholder(placeholder).setValue(this.plugin.settings.googleForm[key] || '').onChange(async (value) => {
          this.plugin.settings.googleForm[key] = value.trim();
          await this.plugin.saveSettings();
          this.plugin.rebuildCore();
          this.plugin.requestHomepageRefresh();
        }));
    };

    addGoogleFormSetting('뉴스 제출 폼 URL', '뉴스읽기 템플릿/오늘자 과제 제출 섹션에 사용됩니다.', 'newsSubmissionUrl', 'https://forms.gle/...');
    addGoogleFormSetting('학부모 설문 URL', '학부모 대상 설문 링크를 저장합니다.', 'parentSurveyUrl', 'https://forms.gle/...');
    addGoogleFormSetting('주간 체크인 URL', '주간 체크인 설문 링크를 저장합니다.', 'weeklyCheckinUrl', 'https://forms.gle/...');
    addGoogleFormSetting('사전입력 템플릿 URL', '예: ...?entry.123={studentId}&entry.456={date}', 'prefillTemplate', 'https://docs.google.com/forms/...');
    addGoogleFormSetting('응답 시트 URL(선택)', '응답 스프레드시트 링크를 저장합니다.', 'responseSheetUrl', 'https://docs.google.com/spreadsheets/...');

    new Setting(containerEl)
      .setName('레거시 구글폼 링크(formLink)')
      .setDesc('이전 버전 호환용입니다. 비워두면 newsSubmissionUrl을 우선 사용합니다.')
      .addText((text) => text.setPlaceholder('https://forms.gle/...').setValue(this.plugin.settings.formLink).onChange(async (value) => {
        this.plugin.settings.formLink = value.trim();
        await this.plugin.saveSettings();
        this.plugin.rebuildCore();
        this.plugin.requestHomepageRefresh();
      }));

    new Setting(containerEl)
      .setName('초기 구조 생성')
      .setDesc('기존 파일은 유지하고 누락된 기본 폴더/파일만 생성합니다.')
      .addButton((button) => button.setButtonText('초기 구조 생성').setCta().onClick(async () => {
        await this.plugin.ensureInitialStructureSafe();
      }));
  }
}
