# homepage

학급 운영 실무(공지, 출석, 우리반 상점, 주간 리포트, 뉴스읽기 과제)를 Obsidian에서 바로 실행하기 위한 플러그인입니다.  
홈페이지는 `4개 운영 카드 + 자동 요약 + 교사용 관계 그래프 분리` 구조를 기본값으로 제공합니다.

## 교실 운영 중심 핵심 기능

- 학급 구조 자동 생성: `홈/홈페이지.md`, `1~5번 운영 폴더`, `999-Attachments`, `docs`
- 하위 호환 6개 명령 + 확장 3개 명령 제공
- 뉴스읽기 템플릿/오늘자 과제에 Google Form 링크 자동 삽입
- 홈페이지/공지/설문 노트 대상 폼 링크 자동 반영
- 홈페이지 기반 주간 자동 보고서 생성
- 기본 구조 재생성 시 백업 후 덮어쓰기 지원

## 환경 요구사항

- Node.js `>=20`
- npm `>=10` (권장)

## BRAT 설치

1. Obsidian에서 **BRAT** 플러그인을 설치/활성화합니다.
2. BRAT에서 `Add Beta plugin`을 선택합니다.
3. 저장소 주소 `https://github.com/piman-code/homepage` 입력 후 설치합니다.
4. 설치 후 `homepage` 플러그인을 활성화합니다.

릴리스 자산에는 아래 파일이 포함됩니다.

- `manifest.json`
- `main.js`
- `versions.json`
- `styles.css`

중요:
- BRAT는 `homepage` 플러그인만 설치합니다.
- Google Form 자동 수집, clean live vault, 학생 포털 웹 배포본은 별도 운영 번들이 필요합니다.

## 명령 목록 (Korean Labels)

기존 v2 스펙의 필수 6개 명령은 그대로 유지되며, 아래 3개 확장 명령이 추가되었습니다.

- `학급 홈페이지 열기`
- `오늘 공지 섹션 추가`
- `뉴스읽기 템플릿 생성`
- `학급 기본 구조 재생성(백업 후 덮어쓰기)`
- `오늘자 공지 노트 생성`
- `오늘자 뉴스읽기 과제 생성`
- `폼 링크 자동 적용`
- `주간 자동 보고서 생성`
- `미리캔버스 스타일 홈페이지 적용`

## 생성되는 기본 구조

```text
홈/
  홈페이지.md
1. 공지사항/
2. 주간학습안내/
3. 뉴스읽기/
4. 수업활동/
5. 설문/
999-Attachments/
  backups/
docs/
  뉴스읽기-템플릿.md
```

## 설정 UI

- `홈페이지 노트 경로`
- `뉴스읽기 폴더`
- `Google Form 링크(분리 설정)`
  - `newsSubmissionUrl`
  - `parentSurveyUrl`
  - `weeklyCheckinUrl`
  - `prefillTemplate`
  - `responseSheetUrl`
- `레거시 구글폼 링크(formLink)` 폴백
- `초기 구조 생성` 버튼 (기존 파일 유지, 누락분만 생성)

## 개발/검증

```bash
npm ci
npm run check:plugin
npm run test
npm run check
```

- `npm run check:plugin`: CI/릴리스 워크플로와 동일한 빠른 검증(`validate:plugin-release` + `test:plugin`)
- `npm run test`: 전체 테스트(guardrails/rag/omniforge 포함)
- `npm run check`: frontmatter/sharenote 검증 + 오프라인 빌드까지 포함한 전체 점검

릴리스 절차는 [RELEASE.md](RELEASE.md), 오류 대응은 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참고하세요.

## v2.1 SPEC / 템플릿 업데이트 (2026-03-08)

- 공식 v2 스펙: [docs/SPEC-homepage-plugin-v2.md](docs/SPEC-homepage-plugin-v2.md)
- 홈페이지 대시보드 구조:
  - 상단 `오늘의 공지 / 오늘의 출석 / 우리반 상점 / 우리반 리포트` 4개 카드
  - 카드 아래 `오늘 한 줄 요약` 자동 문단
  - 학생 관계 그래프는 교사용 노트에서만 확인
- 홈페이지 기본 노트 섹션:
  - `## ✍️ 오늘 한 줄 요약`
  - `## 📣 오늘의 공지`
  - `## ✅ 오늘의 출석`
  - `## 🪙 우리반 상점`
  - `## 📘 우리반 리포트`
  - `## 🔒 교사용 학생 관계 그래프`
- 기존 커맨드 6종의 ID/라벨은 하위 호환 유지
- 추가 구현:
  - `폼 링크 자동 적용`
  - `주간 자동 보고서 생성`
  - 분리형 Google Form 설정 UI
