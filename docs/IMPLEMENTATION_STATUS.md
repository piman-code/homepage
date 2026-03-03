# Homepage Plugin Implementation Status

Last updated: 2026-03-02
Source spec: `docs/SPEC-homepage-plugin-v2.md`
Current release baseline: `v0.2.4`

## 1) Implemented

### Core structure / workflow
- [x] Class-management vault scaffold creation
- [x] Homepage note auto-create/open
- [x] Notice note auto-create
- [x] News-reading assignment auto-create
- [x] News template generation
- [x] Regenerate structure with backup

### Commands (user-facing)
- [x] 학급 홈페이지 열기
- [x] 오늘 공지 섹션 추가
- [x] 뉴스읽기 템플릿 생성
- [x] 학급 기본 구조 재생성(백업 후 덮어쓰기)
- [x] 오늘자 공지 노트 생성
- [x] 오늘자 뉴스읽기 과제 생성
- [x] 미리캔버스 스타일 홈페이지 적용

### Settings
- [x] homepagePath
- [x] newsFolder
- [x] formLink
- [x] 초기 구조 생성 버튼

### Release / compatibility
- [x] `manifest.json`, `main.js`, `versions.json`, `styles.css` present
- [x] BRAT release validation script passing
- [x] Plugin acceptance tests passing

## 2) Partially implemented

- [~] Miricanvas-like homepage layout
  - implemented as markdown+styles approximation
  - still needs tighter PPT section mapping and visual polish

- [~] Google Form integration
  - current: single `formLink` for template insertion
  - missing: multi-link settings + one-click homepage token replacement

## 3) Deferred (Spec v2)

- [ ] Google Form placeholder segmented settings UI
  - `newsSubmissionUrl`
  - `parentSurveyUrl`
  - `weeklyCheckinUrl`
  - `prefillTemplate`
  - `responseSheetUrl`
- [ ] Auto link sync across homepage/notice/survey notes
- [ ] Homepage-based weekly auto report generation

## 4) Risks / cleanup needed

- Untracked files in repo root (images, temporary docs) may pollute release commits.
- Frontmatter validation failures reported for non-plugin content docs; scope filtering is needed so plugin CI is not blocked by unrelated vault docs.

## 5) Immediate next sprint (recommended)

1. Add segmented Google Form settings fields (UI + data schema).
2. Add command: "폼 링크 자동 적용" for homepage + today notes.
3. Add tests for settings persistence + token replacement.
4. Add release note entry for the above and bump patch version.
