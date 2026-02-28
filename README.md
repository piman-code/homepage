# Class Homepage BRAT Lite

학급 운영 실무(공지, 주간안내, 뉴스읽기 과제, 학부모 소통)를 Obsidian에서 바로 실행하기 위한 플러그인입니다.  
포트폴리오/디지털가든 스타일이 아니라, 담임의 일일 운영 흐름에 맞춘 구조를 기본값으로 제공합니다.

## 교실 운영 중심 핵심 기능

- 학급 구조 자동 생성: `홈/홈페이지.md`, `1~5번 운영 폴더`, `999-Attachments`, `docs`
- 한국어 명령 6개 제공(오늘자 공지/뉴스읽기 생성 포함)
- 뉴스읽기 템플릿에 구글폼 제출 링크 자동 삽입
- 기본 구조 재생성 시 백업 후 덮어쓰기 지원

## BRAT 설치

1. Obsidian에서 **BRAT** 플러그인을 설치/활성화합니다.
2. BRAT에서 `Add Beta plugin`을 선택합니다.
3. 저장소 주소 `https://github.com/piman-code/homepage` 입력 후 설치합니다.
4. 설치 후 `class-homepage-brat-lite` 플러그인을 활성화합니다.

릴리스 자산에는 아래 파일이 포함됩니다.

- `manifest.json`
- `main.js`
- `versions.json`
- `styles.css`

## 명령 목록 (Korean Labels)

- `학급 홈페이지 열기`
- `오늘 공지 섹션 추가`
- `뉴스읽기 템플릿 생성`
- `학급 기본 구조 재생성(백업 후 덮어쓰기)`
- `오늘자 공지 노트 생성`
- `오늘자 뉴스읽기 과제 생성`

## 생성되는 기본 구조

```text
홈/
  홈페이지.md
1. 공지사항/
2. 주간학습안내/
3. 뉴스읽기/
4. 수업활동/
5. 설문/
999-Attachments/
docs/
  뉴스읽기-템플릿.md
```

## 설정 UI

- `홈페이지 노트 경로`
- `뉴스읽기 폴더`
- `구글폼 링크`
- `초기 구조 생성` 버튼 (기존 파일 유지, 누락분만 생성)

## 개발/검증

```bash
npm ci
npm run validate:plugin-release
npm run test:plugin
```

릴리스 절차는 [RELEASE.md](RELEASE.md), 오류 대응은 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참고하세요.
