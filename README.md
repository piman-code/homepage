# Class Knowledge Hub (Sharenote-first)

학급 홈페이지 운영은 **Sharenote 우선**으로 진행하고, RAG/Guardrails 코드는 동일 저장소에서 함께 유지한다.
Quartz는 선택적 보조 경로로만 둔다.

## 1) 운영 우선순위

1. 콘텐츠 작성/공개: Obsidian -> Sharenote
2. 사전 점검: frontmatter + preflight + 오프라인 빌드
3. 수업 AI: `services/rag`, `services/guardrails` 정책 유지
4. Quartz: 필요 시 수동 연동(옵션)

## 2) 프로젝트 구조

```text
class-homepage/
  api/                      # intake API 스텁
  content/                  # Sharenote 공개 대상 문서
  docs/                     # 운영/정책 문서
  services/
    rag/                    # RAG 스캐폴드(유지)
    guardrails/             # 요청/토큰/동시성 제한(유지)
    omniforge/              # 설문/리플렉션/AI질문 수집 스텁
  templates/                # Sharenote 작성 템플릿
  scripts/
    validate-frontmatter.mjs
    sharenote-preflight.mjs
    offline-build.mjs
  tests/
```

## 3) Sharenote 운영 절차

1. `templates/`로 문서를 작성한다.
2. 공개 가능 여부를 확인한다.
3. 아래 명령으로 점검한다.

```bash
npm run check
npm run test
```

4. 점검 통과 후 Sharenote에 게시한다.
5. 홈/섹션 index 링크가 최신 상태인지 확인한다.

세부 규칙은 [docs/sharenote-migration.md](docs/sharenote-migration.md)를 따른다.

## 4) 권장 스타일 가이드 (헤더/콜아웃/리스트/링크 규칙)

### 헤더 규칙

- `##`는 정보 묶음 단위로 사용한다.
- `###`는 카드형 정보 단위로 사용한다.
- 한 문서의 헤더 깊이는 `###`까지를 권장한다.

### 콜아웃 규칙

- 문서 상단에 아래 3요소를 포함한 안내 블록을 둔다.
  - 대상
  - 업데이트 주기
  - 문의
- 불확실한 정보는 `미확인`으로 명시한다.

### 리스트 규칙

- 한 줄에 한 메시지 원칙으로 작성한다.
- 항목이 5개를 넘으면 소제목 또는 카드로 분리한다.
- 실행/점검 항목은 체크리스트(`[ ]`)를 사용한다.

### 링크 규칙

- 링크 텍스트는 목적이 드러나게 작성한다.
- 핵심 링크는 `빠른 이동`과 본문 카드에 중복 배치한다.
- 게시 전 링크 클릭 테스트를 수행한다.

## 5) 명령어

```bash
npm ci
npm run validate:frontmatter
npm run preflight:sharenote
npm run build
npm run check
npm run test
```

- `npm run check`:
  - frontmatter 검증
  - Sharenote 공개 금지 필드/키워드 preflight
  - 오프라인 빌드
- `npm run test`: guardrails + rag + omniforge 테스트

## 6) Quartz (보조/옵션)

Quartz 실행 파일은 이 저장소에 번들되지 않는다.
Quartz 사용이 필요한 경우에만 수동으로 소스를 동기화해 사용한다.

```bash
npm run build:quartz
```

## 7) 정책 문서

- Sharenote 전환/게시 기준: `docs/sharenote-migration.md`
- 콘텐츠 작성 가이드: `docs/content-guideline.md`
- RAG 정책: `docs/rag-policy.md`
- Guardrail/Quota 정책: `docs/quota-policy.md`

## 8) 운영 메모

- 외부 배포 자동화는 코드 강제가 아니라 문서 기반 수동 절차로 운영한다.
- RAG/Guardrails 구현 코드는 본 전환 작업에서 변경하지 않는다.

## 9) OmniForge MVP 실행 (T1~T3)

```bash
# 전체 검증
npm run check
npm run test

# OmniForge 테스트만 실행
npm run test:omniforge
```

- 정책 라우터 테스트: `tests/omniforge/sensitivity-router.test.mjs`
- 익명화 파이프라인 테스트: `tests/omniforge/anonymize.test.mjs`
