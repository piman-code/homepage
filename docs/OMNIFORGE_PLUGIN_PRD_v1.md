# OmniForge Plugin PRD v1 (학급 데이터 로컬 AI 분석)

## 1. 목표
- 학급 설문/수업 리플렉션/AI 질문 로그를 수집하고, 민감정보는 로컬에서만 분석한다.
- 담임이 개입 우선순위를 파악할 수 있는 대시보드와 주간 리포트를 제공한다.

## 2. 핵심 원칙
1) PII 원본과 분석용 익명 데이터 분리
2) 민감 데이터는 외부 API 전송 금지(로컬 모델 강제)
3) AI 결과는 보조지표, 최종 판단은 담임

## 3. 범위(MVP)
- 설문 응답 저장(동의 메타 포함)
- 리플렉션 수집(수업 후 3문항)
- AI 질문 로그 수집(질문 유형/난이도)
- 익명화 파이프라인
- 가드레일 정책 엔진(민감도 라우팅)
- 주간 요약 리포트(난점 TOP5, 지원 신호)

## 4. 데이터 모델(초안)
- students(id, display_name, class_id, created_at)
- pii_profiles(student_id, family_notes, counseling_notes, encrypted_blob)
- consent_records(student_id, consent_version, purpose, retention_until, signed_at)
- reflections(id, student_id, lesson_id, understanding_score, difficulty_text, support_request, created_at)
- ai_queries(id, student_id, subject, unit, query_text, bloom_level, hint_count, created_at)
- graph_edges(id, src_student_id, dst_student_id, edge_type, weight, period)

## 5. 정책 엔진
- sensitivity tags: family, counseling, conflict, health
- rule:
  - 민감 태그 포함 => local model only
  - external route requested => hard block + audit log

## 6. 보안/감사
- field-level encryption for pii_profiles
- access log immutable append
- RBAC: homeroom_teacher/admin/teacher_viewer
- data retention worker: 만료 데이터 파기 + 통계만 보존

## 7. API (MVP)
- POST /intake/survey
- POST /intake/reflection
- POST /intake/ai-query
- POST /pipeline/anonymize
- POST /pipeline/weekly-report
- GET /dashboard/signals

## 8. 수용 기준
- 민감 데이터 외부 라우팅 차단 테스트 통과
- 익명화 후 분석 파이프라인 정상 동작
- 주간 리포트 생성 가능
- 접근 로그 누락 0건

## 9. 구현 우선순위
- T1: 저장소 분리 + 암호화
- T2: intake API 3종
- T3: 익명화 + 정책 라우터
- T4: 리포트 생성기
- T5: 대시보드 시그널 API
