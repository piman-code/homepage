# TROUBLESHOOTING.md

## BRAT에서 `manifest.json not found` 오류

### 증상

- BRAT 설치 시 `manifest.json not found`
- 설치는 됐지만 플러그인 목록에 표시되지 않음

### 주요 원인과 해결

1. 릴리스 자산에 `manifest.json`이 없음  
해결:
- GitHub Release의 Assets 목록에서 `manifest.json` 존재 확인
- 없다면 태그 릴리스를 다시 수행

2. `manifest.json`이 루트가 아닌 하위 폴더에 있음  
해결:
- 저장소 루트(`/<repo>/manifest.json`)로 위치 이동
- `main.js`, `versions.json`도 루트에 둠

3. `manifest.json`/`versions.json` 버전 불일치  
해결:
- `manifest.version` 키가 `versions.json`에 존재해야 함
- 값은 `manifest.minAppVersion`과 같아야 함
- `npm run validate:plugin-release`로 검증

4. 인코딩 문제(BOM 포함)  
해결:
- `manifest.json`, `main.js`, `versions.json`을 UTF-8 without BOM으로 저장
- 검증 스크립트 실행: `npm run validate:plugin-release`

5. 태그 릴리스가 아닌 브랜치 산출물을 BRAT에 입력  
해결:
- `Release Obsidian Plugin` 워크플로로 생성된 GitHub Release를 사용
- 설치 URL은 `https://github.com/piman-code/homepage`

## 명령이 보이지 않을 때

- Obsidian에서 플러그인 비활성/재활성
- 커맨드 팔레트에서 아래 필수 6개 명령 검색:
  - `학급 홈페이지 열기`
  - `오늘 공지 섹션 추가`
  - `뉴스읽기 템플릿 생성`
  - `학급 기본 구조 재생성(백업 후 덮어쓰기)`
  - `오늘자 공지 노트 생성`
  - `오늘자 뉴스읽기 과제 생성`
- 확장 명령도 함께 확인:
  - `폼 링크 자동 적용`
  - `주간 자동 보고서 생성`
  - `미리캔버스 스타일 홈페이지 적용`

## 구조 생성이 안 될 때

- 플러그인 설정의 `초기 구조 생성` 버튼 실행
- 경로 설정이 비어 있거나 오탈자인지 확인
- 뉴스 폴더가 커스텀 경로라면 `뉴스읽기 폴더` 값을 재확인

## 홈페이지 템플릿이 v2로 보이지 않을 때

증상:
- `학급 홈페이지 열기` 실행 후 기존 템플릿이 그대로 보임

원인:
- 기본 동작은 기존 파일을 덮어쓰지 않음

해결:
1. 커맨드 `학급 기본 구조 재생성(백업 후 덮어쓰기)` 실행
2. `999-Attachments/backups/<timestamp>/홈/홈페이지.md` 백업 생성 확인
3. 재생성 후 아래 섹션 존재 확인
   - `오늘 운영 루틴 (수업 전/중/후)`
   - `학부모 소통 보드`
   - `학부모 전달용 문구(복사)`

## 로컬 sanity check가 실패할 때

증상:
- 릴리스 전 검증 또는 테스트 스크립트가 실패함

확인 순서:
1. Node 버전 확인 (`node -v`, `>=20` 필요)
2. 의존성 재설치 (`npm ci`)
3. 빠른 검증 재실행 (`npm run check:plugin`)
4. 전체 테스트/체크 실행 (`npm run test`, `npm run check`)

추가 확인:
- frontmatter 오류는 `npm run validate:frontmatter` 로그의 파일 경로를 먼저 수정
- sharenote 관련 실패는 `npm run preflight:sharenote` 결과의 누락 필드/경로를 수정

## `validate:frontmatter`가 CRLF 문서에서 오작동할 때

증상:
- frontmatter가 분명히 있는데 `missing frontmatter start delimiter`가 반복됨

확인:
- 문서가 Windows/Google Drive 경유로 복사되며 `CRLF` 줄바꿈을 사용할 수 있음

해결:
1. 최신 `scripts/lib/frontmatter.mjs`가 적용되어 있는지 확인
2. `npm run validate:frontmatter`를 다시 실행
3. 여전히 실패하면 실제 frontmatter 블록 시작/종료 구분선(`---`)이 깨졌는지 확인
