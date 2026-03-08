# Homepage Plugin SPEC v2

Version: v2.1  
Last updated: 2026-03-08  
Repository: `https://github.com/piman-code/homepage`

## 1. Product Goal

Obsidian 기반 학급 운영 플러그인으로, 담임 교사가 하루 운영 흐름을 `오늘의 공지 / 오늘의 출석 / 우리반 상점 / 우리반 리포트` 4개 축으로 빠르게 실행하고 점검한다.

핵심 목표:
- 학급 운영 핵심 문서(홈페이지, 공지, 출석 요약, 상점 요약, 주간 리포트) 생성/갱신 시간을 5분 이내로 단축
- 홈페이지에서 4개 운영 카드와 자동 요약을 바로 확인
- 학생 관계 그래프는 교사용 노트로 분리해 공개 화면과 운영 화면을 구분
- BRAT 배포 기준을 만족하는 단일 플러그인 산출물 유지

Reference visuals (repo root):
- `6D06E198-2A0D-45E4-A792-A378C5AE623A.jpeg`: 뉴스읽기 과제 + Google Form 연계 화면
- `10671DC5-8B7D-43CF-9352-C83FCA20019E.jpeg`: 학부모 공지 노트 속성/레이아웃 예시
- `C9CFEE00-0139-404E-94FF-0E99DF88B6E4.jpeg`: Obsidian + Digital Garden/Plugin 운영 맥락

## 2. Information Architecture

기본 Vault 구조:

```text
홈/
  홈페이지.md
1. 공지사항/
2. 주간학습안내/
3. 뉴스읽기/
4. 수업활동/
5. 설문/
6. 학생성장/
  일일체크인-요약/
  목표추적-요약/
  질문활동-요약/
  관계그래프/
  칭찬후보/
999-Attachments/
  backups/
docs/
  뉴스읽기-템플릿.md
  contracts/
```

설계 원칙:
- `홈/홈페이지.md`는 교사용 운영 대시보드 역할을 하며, 상단 4개 카드와 자동 요약을 제공함
- `1~5` 폴더는 운영 도메인별로 분리하여 검색/자동화 단순화
- `6. 학생성장`은 출석/상점/그래프 요약의 원본 데이터 저장소 역할을 함
- `999-Attachments/backups`는 덮어쓰기 재생성 시 안전 백업 저장소
- `docs/`는 템플릿/운영 문서(교사용) 보관

## 3. UX Flows

### A) 학부모님께 드리는 말씀 작성/공유/확인
1. 교사가 `오늘자 공지 노트 생성` 명령 실행
2. `1. 공지사항/YYYY-MM-DD-공지.md` 생성 후 핵심 안내/준비물/문의방법 입력
3. 필요한 경우 `share_link`, `share_updated` 갱신 후 학부모 전달
4. 홈페이지의 학부모 소통 섹션에서 링크/전달 문구 확인

성공 기준:
- 공지 문서가 날짜 기반으로 생성되고 중복 생성 시 재사용됨
- 학부모 확인 포인트가 템플릿에 기본 포함됨

### B) 뉴스읽기 과제 생성/배포
1. 교사가 `오늘자 뉴스읽기 과제 생성` 또는 `뉴스읽기 템플릿 생성` 실행
2. 기사 정보/요약/근거/토론 질문 작성
3. 설정된 Google Form 링크가 제출 섹션에 자동 삽입됨
4. 학생 배포 후 제출 현황은 설문/외부 폼에서 추적

성공 기준:
- `3. 뉴스읽기` 폴더에 날짜 기반 과제 노트 생성
- Google Form 링크가 비어있으면 placeholder 유지

### C) 1일 1회 운영 점검/홈페이지 확인
1. 교사가 `학급 홈페이지 열기` 실행하여 구조 자동 보정
2. 홈페이지 상단에서 `오늘의 공지 / 오늘의 출석 / 우리반 상점 / 우리반 리포트` 4개 카드 확인
3. 카드 아래 `오늘 한 줄 요약` 문단에서 연결 노트의 핵심 내용을 자동 확인
4. 학생 관계 그래프는 교사용 전용 노트에서만 열어 확인

성공 기준:
- 최소 한 번의 명령 실행으로 당일 운영 시작 가능
- 카드 클릭 시 연결 노트 생성/열기가 정상 동작
- 홈페이지 노트와 연결된 원본 노트를 수정하면 자동 요약에 즉시 반영 가능

## 4. Plugin Commands (Korean Labels)

아래 기존 명령 ID/라벨은 하위 호환 유지 대상:

1. `학급 홈페이지 열기` (`open-class-homepage`)
2. `오늘 공지 섹션 추가` (`append-today-notice-section`)
3. `뉴스읽기 템플릿 생성` (`create-news-reading-template`)
4. `학급 기본 구조 재생성(백업 후 덮어쓰기)` (`regenerate-class-structure`)
5. `오늘자 공지 노트 생성` (`create-today-notice-note`)
6. `오늘자 뉴스읽기 과제 생성` (`create-today-news-assignment`)
7. `폼 링크 자동 적용` (`apply-google-form-links`)
8. `주간 자동 보고서 생성` (`generate-weekly-auto-report`)
9. `미리캔버스 스타일 홈페이지 적용` (`apply-miricanvas-homepage-template`)

## 5. Settings

### Current (implemented)
- `홈페이지 노트 경로` (`homepagePath`)
- `뉴스읽기 폴더` (`newsFolder`)
- `구글폼 링크` (`formLink`)
- `homepageUi.*` 미리캔버스 스타일/배경/히어로 설정
- `초기 구조 생성` 버튼

### Google Form integration placeholders (v2+)
- `googleForm.newsSubmissionUrl`: 뉴스읽기 제출 링크
- `googleForm.parentSurveyUrl`: 학부모 설문 링크
- `googleForm.weeklyCheckinUrl`: 주간 체크인 링크
- `googleForm.prefillTemplate`: 사전입력 URL 템플릿(예: `{studentId}`, `{date}`)
- `googleForm.responseSheetUrl`: 응답 스프레드시트 링크(교사용)

정책:
- placeholder 필드는 비어 있어도 동작해야 하며, 템플릿에는 안내 문구를 유지
- 민감 정보/학생 식별 정보는 기본 템플릿에 저장하지 않음

## 6. Data Model / Frontmatter Schema

### 6.1 Homepage (`홈/홈페이지.md`)
- `category: 홈`
- `priority: HIGH`
- `tags: [홈페이지, 학급운영, 공지]`
- `share_link: <string|empty>`
- `share_updated: <ISO date>`
- `target: 학부모/학생`
- 렌더 블록:
  - 상단 4개 카드: `오늘의 공지`, `오늘의 출석`, `우리반 상점`, `우리반 리포트`
  - 자동 요약: `오늘 한 줄 요약`
  - 교사용 링크: `교사용 학생 관계 그래프`

### 6.2 Notice (`1. 공지사항/YYYY-MM-DD-공지.md`)
- `category: 1. 공지사항`
- `priority: HIGH`
- `tags: [공지, 학부모, 안내]`
- `share_link: <string|empty>`
- `share_updated: <ISO date|empty>`

### 6.3 News Reading (`docs/뉴스읽기-템플릿.md`, `3. 뉴스읽기/*.md`)
- `category: 3. 뉴스읽기`
- `priority: HIGH`
- `tags: [뉴스읽기, 시사, 토론]`
- `source_url: <string|empty>`
- `difficulty: medium|low|high`

유효성 원칙:
- 날짜 기반 문서명은 `YYYY-MM-DD-*` 패턴을 따른다.
- 필수 frontmatter 키는 템플릿 생성 시 항상 포함한다.

## 7. Release / BRAT Compatibility Checklist

- [ ] 루트 파일 존재: `manifest.json`, `main.js`, `versions.json`
- [ ] 권장 파일 존재: `styles.css`
- [ ] `manifest.id === homepage`
- [ ] `versions.json[manifest.version] === manifest.minAppVersion`
- [ ] `main.js`는 로컬 상대 require(`../`, `./`)를 사용하지 않음
- [ ] UTF-8 (BOM 없음) 인코딩 유지
- [ ] Obsidian + BRAT에서 필수 6개 명령 및 확장 3개 명령 노출/실행 확인
- [ ] `학급 기본 구조 재생성(백업 후 덮어쓰기)` 실행 시 백업 생성 확인

## 8. Acceptance Criteria

기능:
- 초기 실행 시 필수 폴더/파일 자동 생성
- 기존 파일이 있으면 기본 동작은 덮어쓰기 없이 유지
- 재생성 명령 실행 시 백업 후 덮어쓰기 수행
- 홈페이지 대시보드에 다음이 포함되어야 함:
  - 상단 4개 카드(`오늘의 공지`, `오늘의 출석`, `우리반 상점`, `우리반 리포트`)
  - `오늘 한 줄 요약` 자동 문단
  - 교사용 학생 관계 그래프 분리 동선
- 홈페이지 기본 노트에 다음 섹션이 포함되어야 함:
  - `## ✍️ 오늘 한 줄 요약`
  - `## 📣 오늘의 공지`
  - `## ✅ 오늘의 출석`
  - `## 🪙 우리반 상점`
  - `## 📘 우리반 리포트`
  - `## 🔒 교사용 학생 관계 그래프`

호환성:
- 기존 명령 ID/라벨/동작 흐름이 깨지지 않아야 함
- 기존 설정(`homepagePath`, `newsFolder`, `formLink`) 저장 포맷 유지

품질:
- 플러그인 릴리즈 검증 스크립트 통과
- 플러그인 수용 테스트 통과

## 9. Test Plan

자동 테스트:
1. `npm run validate:plugin-release`
2. `npm run test:plugin`
3. (권장) `npm run test`

수동 점검:
1. 빈 Vault에서 `학급 홈페이지 열기` 실행 후 구조 생성 확인
2. `오늘자 공지 노트 생성` 2회 실행하여 중복 생성 방지 확인
3. `오늘자 뉴스읽기 과제 생성` 실행 후 구글폼 링크 자동 삽입 확인
4. `오늘 공지 섹션 추가` 2회 실행하여 동일 날짜 중복 섹션 방지 확인
5. `학급 기본 구조 재생성(백업 후 덮어쓰기)` 실행 후 `999-Attachments/backups/*` 확인
6. 홈페이지 대시보드에 카드가 4개만 노출되는지 확인
7. 카드 아래 `오늘 한 줄 요약`이 연결 노트를 수정하면 즉시 달라지는지 확인
8. 학생 관계 그래프는 교사용 노트에서만 여는지 확인

비기능:
- 경로 입력에 슬래시/백슬래시 혼합 시 정상 정규화
- 에러 발생 시 사용자 Notice로 실패 안내

---

## 10. Implementation Status

### Implemented in this phase
- v2.1 SPEC 문서 반영
- 홈페이지 기본 템플릿을 `4개 카드 + 자동 요약 + 교사용 그래프 분리` 구조로 정리
- 기존 명령 하위 호환 유지

### Deferred
- Google Form placeholder 세분화 설정 UI 구현
- 공지/설문 간 자동 링크 동기화
- homepage 기반 주간 리포트 자동 생성
