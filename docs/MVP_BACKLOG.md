# Class Knowledge Hub — MVP Backlog (v2 기준)

## Sprint 1 (Week 1): 기반 구축

### A. Homepage / Content Ops
- [x] A1. frontmatter 스키마 고정 및 예제 업데이트
- [x] A2. 템플릿 4종 정리 (공지/과제/가정통신문/수업자료)
- [x] A3. AI 수업도우미 안내 페이지 추가 (홈/메뉴 연결)
- [x] A4. 공개/내부 문서 분리 규칙 문서화

### B. RAG Core
- [x] B1. 문서 로더 모듈 (`services/rag/loader`)
- [x] B2. 청킹 모듈 (`services/rag/chunker`)
- [x] B3. 메타데이터 정규화 (`subject/grade/unit/visibility`)
- [x] B4. 검색 인터페이스 추상화 (`retriever`)

### C. Guardrails
- [x] C1. 사용자 시간당 요청 제한기
- [x] C2. 학급 시간당 요청 제한기
- [x] C3. 토큰 예산 미터 (hour/day)
- [x] C4. 동시성 큐(기본 3)

### D. Quality
- [x] D1. 정책 문서 (`docs/rag-policy.md`, `docs/quota-policy.md`)
- [x] D2. 단위 테스트(핵심 정책)

## Sprint 2 (Week 2): API/통합

### E. RAG API
- [x] E1. 질의 입력 DTO + 검증
- [x] E2. 검색→생성 파이프라인 스텁
- [x] E3. 출처 카드 포맷터
- [x] E4. 불확실성 표기(`미확인`) 규칙 반영

### F. Guardrails Integration
- [x] F1. 요청 전 가드레일 검사
- [x] F2. 소프트캡(요약모드) 동작
- [x] F3. 하드캡(차단+리셋안내) 동작

### G. E2E / 운영
- [ ] G1. 샘플 질의 시나리오 10개
- [ ] G2. 실패/폴백 시나리오 점검
- [x] G3. README 운영 절차 최신화

---

## MVP 완료 조건
- 홈페이지 메뉴 + AI 수업도우미 안내 페이지 동작
- RAG 파이프라인 골격 + 출처 표시
- rate limit / token budget / concurrency 제한 동작
- 정책 문서 및 테스트 통과

## 현재 해석 (2026-03-08)

- 코드/문서 기준 MVP 핵심 골격은 충족
- 잔여 작업은 샘플 질의 시나리오와 실패/폴백 운영 시나리오를 더 넓게 문서화하는 운영 보강 성격
