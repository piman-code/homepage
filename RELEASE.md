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

## 로컬 검증

```bash
npm ci
npm run validate:plugin-release
npm run test:plugin
```

## 릴리스 절차 (태그 기반)

1. `manifest.json` 버전 갱신
2. `versions.json`에 동일 버전 키 추가
3. `main` 브랜치에 푸시
4. 태그 생성/푸시

```bash
git tag v0.2.0
git push origin v0.2.0
```

5. GitHub Actions `Release Obsidian Plugin` 워크플로가 실행됨
6. GitHub Release 자산에 아래 파일 포함 여부 확인
   - `manifest.json`
   - `main.js`
   - `versions.json`
   - `styles.css`

## BRAT 검증 체크리스트

- [ ] 릴리스 자산에 `manifest.json` 존재
- [ ] 릴리스 자산에 `main.js` 존재
- [ ] 릴리스 자산에 `versions.json` 존재
- [ ] 릴리스 자산에 `styles.css` 존재
- [ ] `manifest.json`의 `id`가 `class-homepage-brat-lite`
- [ ] `versions.json[manifest.version] === manifest.minAppVersion`
- [ ] 파일 인코딩이 UTF-8 (BOM 없음)
- [ ] Obsidian + BRAT에서 설치 후 명령 6개가 표시됨

## CI 실패 시 확인

- `plugin-ci.yml`: `validate:plugin-release`, `test:plugin` 실패 원인 확인
- `release-plugin.yml`: 릴리스 파일 업로드 단계 실패 로그 확인

## v2 반영 체크 (2026-03-01)

- 스펙 기준 문서: [docs/SPEC-homepage-plugin-v2.md](docs/SPEC-homepage-plugin-v2.md)
- 홈페이지 템플릿에 아래 섹션 포함 여부 확인
  - `오늘 운영 루틴 (수업 전/중/후)`
  - `학부모 소통 보드`
  - `학부모 전달용 문구(복사)`
- 하위 호환 확인: 기존 6개 명령 ID/라벨/실행 경로 변경 없음
