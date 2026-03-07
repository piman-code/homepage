# RELEASE.md

## 목적

BRAT가 인식하는 Obsidian 플러그인 릴리스를 태그 기반으로 안정적으로 배포합니다.

## 사전 조건

- `manifest.json`의 `version`이 최신 값인지 확인
- `versions.json`에 같은 버전 키가 있고 값이 `minAppVersion`과 일치하는지 확인
- 루트 필수 파일 존재:
  - `manifest.json`
  - `main.js`
  - `versions.json`
  - `styles.css` (현재 저장소는 사용)

## 로컬 검증 (현재 워크플로 기준)

```bash
npm ci
npm run check:plugin
```

`check:plugin`은 GitHub Actions `plugin-ci.yml` 및 `release-plugin.yml`과 동일하게 `validate:plugin-release` + `test:plugin`을 실행합니다.

권장 추가 점검:

```bash
npm run test
npm run check
```

- `npm run test`: guardrails/rag/omniforge 포함 전체 테스트
- `npm run check`: GitHub Pages 배포 전 검증(`validate:frontmatter` + `preflight:sharenote` + `build`)까지 포함

## 릴리스 절차 (태그 기반)

1. `manifest.json` 버전 갱신
2. `versions.json`에 동일 버전 키 추가
3. `main` 브랜치에 푸시
4. 태그 생성/푸시

```bash
git tag v<next-version>
git push origin v<next-version>
```

5. GitHub Actions `Release Obsidian Plugin` 워크플로가 실행됨
   - 실행 검증: `npm run validate:plugin-release`, `npm run test:plugin`
6. GitHub Release 자산에 아래 파일 포함 여부 확인
   - `manifest.json`
   - `main.js`
   - `versions.json`
   - `styles.css`

## 사이트 배포 절차 (main 브랜치)

- 1회 선행 조건:
  - GitHub 저장소 `Settings > Pages > Build and deployment`에서 `Source`를 `GitHub Actions`로 설정
  - 또는 `PAGES_TOKEN` secret을 추가해 workflow가 Pages enablement를 자동 시도하도록 구성
- `main` 브랜치 push 시 `Deploy Class Homepage` 워크플로가 실행됨
- 실행 검증:
  - `npm run validate:frontmatter`
  - `npm run build`
- 결과물: `public/`가 GitHub Pages로 배포됨

## BRAT 검증 체크리스트

- [ ] 릴리스 자산에 `manifest.json` 존재
- [ ] 릴리스 자산에 `main.js` 존재
- [ ] 릴리스 자산에 `versions.json` 존재
- [ ] 릴리스 자산에 `styles.css` 존재
- [ ] `manifest.json`의 `id`가 `class-homepage-brat-lite`
- [ ] `versions.json[manifest.version] === manifest.minAppVersion`
- [ ] 파일 인코딩이 UTF-8 (BOM 없음)
- [ ] Obsidian + BRAT에서 설치 후 필수 6개 명령이 표시됨
- [ ] 확장 명령 3개(`폼 링크 자동 적용`, `주간 자동 보고서 생성`, `미리캔버스 스타일 홈페이지 적용`)이 필요 시 표시됨

## CI 실패 시 확인

- `plugin-ci.yml`: `validate:plugin-release`, `test:plugin` 실패 원인 확인
- `release-plugin.yml`: 태그 릴리스/Assets 업로드 단계 실패 로그 확인
- `deploy.yml`: `validate:frontmatter`, `build` 실패 로그 확인
- `deploy.yml`에서 `Setup Pages` 단계가 실패하면 저장소 Pages 설정 또는 `PAGES_TOKEN` 구성을 먼저 확인
- 전체 검증 실패 확인이 필요하면 로컬에서 `npm run test`, `npm run check`를 추가 실행

## v2 반영 체크 (2026-03-01)

- 스펙 기준 문서: [docs/SPEC-homepage-plugin-v2.md](docs/SPEC-homepage-plugin-v2.md)
- 홈페이지 템플릿에 아래 섹션 포함 여부 확인
  - `오늘 운영 루틴 (수업 전/중/후)`
  - `학부모 소통 보드`
  - `학부모 전달용 문구(복사)`
- 하위 호환 확인: 기존 6개 명령 ID/라벨/실행 경로 변경 없음
- 확장 확인:
  - `폼 링크 자동 적용`
  - `주간 자동 보고서 생성`
  - `미리캔버스 스타일 홈페이지 적용`
