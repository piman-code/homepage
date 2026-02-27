# Quota & Guardrail Policy (Spec v2)

## 1) 기본 제한값

| 정책 항목 | 값 |
| --- | --- |
| 사용자당 요청 제한 | `20 req/hour` |
| 학급 전체 요청 제한 | `120 req/hour` |
| 시간당 토큰 예산 | `80,000 tokens` |
| 일일 토큰 예산 | `500,000 tokens` |
| 동시 처리 제한 | `3 concurrent requests` |
| 최대 출력 토큰 | `700 tokens` |
| 최대 컨텍스트 청크 | `6 chunks` |

## 2) 캡 정책

- 소프트캡(`80%`) 도달 시: 경고 로그 + 요약 모드(`summary`) 전환
- 하드캡(`100%`) 도달 시: 요청 차단(`blocked`) + 리셋 시간 안내
- 소프트캡 응답 문구: `현재 이용량이 많아 요약 모드로 답변합니다. 자세한 설명은 잠시 후 다시 시도해 주세요.`
- 하드캡 응답 문구: `현재 시간대 사용 한도를 초과했습니다. 다음 이용 가능 시각(KST): {reset_time}`
- `daily_token_budget_exceeded` 리셋 시각은 KST 자정(`00:00`) 기준으로 계산

## 3) 폴백 정책

예산/요청 제한 도달 시 아래 순서로 대응한다.

1. 캐시 응답 우선 반환
2. 경량 모델 경로로 전환
3. `교사용 확인 후 답변` 메시지 반환

## 4) 구현 매핑

- 요청 제한: `services/guardrails/rate-limit.mjs`
- 토큰 예산: `services/guardrails/token-budget.mjs`
- 동시성 큐: `services/guardrails/concurrency-queue.mjs`
- 공통 export: `services/guardrails/index.mjs`

## 5) 검증

```bash
npm run test:guardrails
```
