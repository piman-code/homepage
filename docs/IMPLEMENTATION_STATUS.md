# Homepage Plugin Implementation Status

Last updated: 2026-03-08
Source spec: `docs/SPEC-homepage-plugin-v2.md`
Current release baseline: `v0.2.5`

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
- [x] 폼 링크 자동 적용
- [x] 주간 자동 보고서 생성
- [x] 미리캔버스 스타일 홈페이지 적용

### Settings
- [x] homepagePath
- [x] newsFolder
- [x] formLink
- [x] segmented Google Form settings UI
- [x] 초기 구조 생성 버튼

### Release / compatibility
- [x] `manifest.json`, `main.js`, `versions.json`, `styles.css` present
- [x] BRAT release validation script passing
- [x] Plugin acceptance tests passing
- [x] Full repo test suite passing (`npm run test`)
- [x] Frontmatter validation / sharenote preflight / offline build passing (`npm run check`)

## 2) Partially implemented

- [~] Miricanvas-like homepage layout
  - implemented as markdown+styles approximation
  - still needs tighter PPT section mapping and visual polish

## 3) Deferred (Spec v2)

- [x] Google Form placeholder segmented settings UI
  - `newsSubmissionUrl`
  - `parentSurveyUrl`
  - `weeklyCheckinUrl`
  - `prefillTemplate`
  - `responseSheetUrl`
  - 비고: 뉴스 템플릿/오늘자 과제는 `newsSubmissionUrl` 우선, 비어 있으면 레거시 `formLink` 폴백
- [x] Auto link sync across homepage/notice/survey notes
- [x] Homepage-based weekly auto report generation
- [ ] Miricanvas 시안과 1:1에 가까운 레이아웃 정밀화

## 4) Risks / cleanup needed

- Untracked files in repo root (images, temporary docs) may pollute release commits.
- Current repo mixes plugin scope and content/site scope, so release notes and docs must keep both workflows explicit.

## 5) Immediate next sprint (recommended)

1. Miricanvas 레이아웃을 실제 시안 기준으로 더 정밀하게 맞추기.
2. Obsidian 수동 QA로 9개 명령 전체 동작을 재확인하기.
3. GitHub Release 노트와 Pages 운영 문서를 최신 상태로 동기화하기.
4. 루트의 임시 이미지/문서를 정리할지 여부 결정하기.

## 6) 미구현 항목 우선순위 정렬 (우선순위/난이도/의존성)

기준:
- 우선순위: 사용자 가치 + 스펙 적합성 + 즉시 릴리즈 영향
- 난이도: S(반나절~1일), M(1~2일), L(3일+)
- 의존성: 선행되어야 하는 항목

1. **Miricanvas-like homepage layout 정밀화 (PPT 섹션 매핑/디자인 폴리시)**
   - 우선순위: **P1**
   - 난이도: **M**
   - 의존성: 없음 (병렬 가능)
   - 이유: 기능 완성도 대비 시각 품질 개선 항목으로 릴리즈 임팩트는 중간.

2. **Settings persistence 회귀 테스트 확장**
   - 우선순위: **P1**
   - 난이도: **S**
   - 의존성: 없음
   - 이유: 링크 필드가 늘어난 만큼 저장/마이그레이션 회귀를 더 촘촘히 막을 필요가 있음.

3. **Obsidian 수동 QA 체크리스트 확장**
   - 우선순위: **P2**
   - 난이도: **S**
   - 의존성: 없음
   - 이유: 자동 테스트는 통과했지만 실제 Obsidian/BRAT 동작 확인 범위를 늘릴 필요가 있음.

## 7) 1주 실행계획 (일자별)

- **Day 1 (월)**: Miricanvas 섹션 맵 정리 + 기준 시안 재정리
- **Day 2 (화)**: 레이아웃/카피 정밀화
- **Day 3 (수)**: 설정 persistence/회귀 테스트 추가
- **Day 4 (목)**: Obsidian 수동 QA 1차
- **Day 5 (금)**: 문서/릴리즈 노트 정리
- **Day 6 (토)**: 루트 정리 여부 결정 및 불필요 파일 분리
- **Day 7 (일)**: 최종 태그/배포 점검
