# 콘텐츠 작성 가이드

## 1. 파일명 규칙

- 형식: `YYYY-MM-DD-슬러그.md`
- 예시: `2026-03-01-midterm-guide.md`
- 섹션 소개 문서는 `index.md` 사용 가능

## 2. frontmatter 규칙

기본 필수 필드:

- `title`
- `date`
- `category`
- `tags`
- `published`
- `pin`

과제(`assignment`) 문서는 `due`를 추가로 필수 입력합니다.

권장 필드(상황별):

- `visibility` (`public|internal`)
- `grade`
- `subject`
- `unit`
- `rag_enabled`
- `safety_level`

예시:

```yaml
title: "문서 제목"
date: 2026-02-26
category: notice # home|notice|lesson|assignment|schedule|newsletter|faq|resource|ai-assistant
tags: [공지, 수행평가]
published: true
pin: false
visibility: public # 권장
subject: "과학" # 선택
due: 2026-03-05 # assignment에서 필수
```

## 3. 폴더별 category 매핑

- `content/notices/*` -> `notice`
- `content/lessons/*` -> `lesson`
- `content/assignments/*` -> `assignment`
- `content/schedule/*` -> `schedule`
- `content/newsletters/*` -> `newsletter`
- `content/faq/*` -> `faq`
- `content/resources/*` -> `resource`
- `content/ai-assistant/*` -> `ai-assistant`

## 4. 공개/내부 문서 분리 규칙

- 공개 문서: `content/` 하위에 저장하고 `visibility: public`을 사용합니다.
- 내부 문서: 별도 비공개 저장소 또는 `internal/` 폴더에 두고 홈페이지 배포 대상에서 제외합니다.
- 기본 원칙: 내부 문서는 RAG 인덱싱 기본 대상에서 제외합니다.

## 5. 개인정보/보안 운영 원칙

- 공개 금지: 학생 실명+평가 상세, 연락처, 주소, 민감 정보
- 내부 문서 원본(성적표/상담기록 등) 업로드 금지
- 외부 제출 폼은 링크만 공개하고 결과 데이터는 게시하지 않음

## 6. 검증 명령

```bash
npm run validate:frontmatter
npm run preflight:sharenote
npm run build
```

검증 실패 시 frontmatter 누락/오타와 공개 금지 키워드 포함 여부를 먼저 점검하세요.
