# Release Notes v0.2.5

Date: 2026-03-08

## Summary

`v0.2.5`는 홈페이지 플러그인 `v2` 범위를 실제 릴리즈 가능한 상태로 정리한 버전입니다.

## Added / Completed

- 분리형 Google Form 설정 UI
  - `newsSubmissionUrl`
  - `parentSurveyUrl`
  - `weeklyCheckinUrl`
  - `prefillTemplate`
  - `responseSheetUrl`
- `폼 링크 자동 적용` 명령
  - 홈페이지
  - 오늘 공지
  - 설문 링크 노트
- `주간 자동 보고서 생성` 명령
- `미리캔버스 스타일 홈페이지 적용` 명령 유지
- 기존 6개 명령 하위 호환 유지

## Fixed

- Windows/Google Drive 경유 문서의 `CRLF` 줄바꿈 때문에 `validate:frontmatter`가 실패하던 문제 수정
- 전체 검증 경로(`npm run check`)가 다시 통과하도록 frontmatter/sharenote/build 경로 정리
- 릴리즈/설치/트러블슈팅 문서를 실제 구현 상태에 맞게 갱신

## Verified

- `npm run check:plugin`
- `npm run test`
- `npm run check`
- GitHub Release `v0.2.5`
- GitHub Pages deploy

## Links

- Release: `https://github.com/piman-code/homepage/releases/tag/v0.2.5`
- Pages: `https://piman-code.github.io/homepage/`
