# Sharenote Migration Guide

## 목적

Obsidian에서 작성한 학급 콘텐츠를 Sharenote 공개 흐름으로 운영하기 위한 기준 문서다.
이 프로젝트에서는 외부 배포 자동화를 코드로 강제하지 않고, 운영 절차 문서 기준으로 관리한다.

## 1) Obsidian -> Sharenote 운영 절차

1. Obsidian에서 `templates/` 기반으로 초안을 작성한다.
2. 초안의 frontmatter와 본문을 검토해 공개/비공개를 먼저 판정한다.
3. 공개 대상 문서는 `content/`에 반영하고 아래 명령으로 사전 검사를 수행한다.

```bash
npm run validate:frontmatter
npm run preflight:sharenote
npm run build
```

4. 점검 통과 후 Sharenote에서 페이지를 게시한다.
5. 게시 직후 홈/해당 섹션 index 링크와 노출 상태를 확인한다.

## 2) 공개/비공개 폴더 규칙

- 공개 기본 경로: `content/`
- 공개 섹션: `index.md`, `notices/`, `lessons/`, `assignments/`, `schedule/`, `newsletters/`, `faq/`, `resources/`, `ai-assistant/`
- 비공개 운영 문서: `content` 밖 별도 보관소 또는 `internal/`(배포 제외)
- `visibility: internal` 문서는 `published: true`로 두지 않는다.
- 공개 문서에서 학생 식별정보/연락처/상담·건강 기록 관련 텍스트는 금지한다.

## 3) 게시 체크리스트

- [ ] 템플릿의 필수 frontmatter(`title`, `date`, `category`, `tags`, `published`, `pin`)가 모두 채워짐
- [ ] 과제 문서의 `due` 날짜가 존재함(`assignment` 카테고리 필수)
- [ ] 공개 문서에 개인 식별/민감 정보가 없음
- [ ] 섹션 index 링크가 최신 문서를 가리킴
- [ ] `npm run check` 통과
- [ ] `npm run test` 통과
- [ ] Sharenote 게시 후 실제 페이지 렌더링 확인

## 4) 보기 좋게 유지하는 편집 규칙

- 모든 `index.md` 상단에는 `대상/업데이트 주기/문의` 3요소 안내 블록을 넣는다.
- 모든 섹션 `index.md`에는 `처음 방문자용 3단계 안내`를 넣는다.
- 본문 앞부분에 `빠른 이동` 링크를 두고, 같은 문서의 핵심 섹션(anchor)로 연결한다.
- 카드형 정보는 `### 아이콘 + 제목` + 2~3개 불릿으로 구성해 한 화면에서 읽히게 작성한다.
- 리스트는 한 줄 한 메시지 원칙을 지키고, 5개를 넘기면 주제별로 분리한다.
- 링크는 내부 문서를 먼저 표기한다(예: `[중간고사 안내(내부)](/notices/...)`).
- 외부 링크는 목적을 함께 쓴다(예: `[교육청 공지(외부: 공식 일정 확인)](https://...)`).
- 학생/학부모 대상 문장은 짧고 직접적으로 작성하고, 불확실한 내용은 `미확인`으로 표기한다.

## 5) 운영 메모

- Quartz는 보조 옵션이며, Sharenote 운영이 우선이다.
- RAG/Guardrails 코드(`services/`)는 기존 정책대로 유지한다.

## 6) 운영 체크리스트 (매주/매월)

### 매주 체크리스트

- [ ] 홈/공지/과제/AI 도우미 `index.md`의 최신 링크를 확인한다.
- [ ] 공지/과제 신규 문서에 `핵심요약 3줄`이 포함되었는지 확인한다.
- [ ] 링크 표기를 점검한다(내부 우선, 외부는 `(외부: 목적)` 포함).
- [ ] `npm run check`를 실행해 게시 전 오류를 확인한다.
- [ ] `npm run test`를 실행해 Guardrails/RAG 회귀를 점검한다.

### 매월 체크리스트

- [ ] 상단 고정(`pin: true`) 공지의 유효기간을 점검하고 정리한다.
- [ ] 지난달 과제/공지 문서를 아카이브 관점에서 재분류한다.
- [ ] 템플릿(`templates/notice-template.md`, `templates/assignment-template.md`) 최신성을 점검한다.
- [ ] 민감 정보/개인정보 노출 여부를 샘플링 점검한다.
- [ ] 운영 문서(`docs/sharenote-migration.md`)를 실제 운영 흐름 기준으로 갱신한다.
