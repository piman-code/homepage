# Homepage Plugin Spec (Class Homepage BRAT Lite)

## 목적
교실 운영용 Obsidian 플러그인으로 다음을 빠르게 수행한다.
- 학급 홈페이지 허브 오픈
- 공지/뉴스읽기 과제 노트 생성
- 기본 폴더 구조 자동 보완

## 핵심 명령
- 학급 홈페이지 열기
- 오늘 공지 섹션 추가
- 뉴스읽기 템플릿 생성
- 학급 기본 구조 재생성(백업 후 덮어쓰기)
- 오늘자 공지 노트 생성
- 오늘자 뉴스읽기 과제 생성

## 기본 구조
- 홈/홈페이지.md
- 1. 공지사항/
- 2. 주간학습안내/
- 3. 뉴스읽기/
- 4. 수업활동/
- 5. 설문/
- 999-Attachments/
- docs/

## 설정
- 홈페이지 노트 경로
- 뉴스읽기 폴더
- 구글폼 링크

## 릴리즈 조건
- root에 manifest.json / main.js / versions.json 존재
- 파일 인코딩 UTF-8 (BOM 없음)
- versions.json에 현재 버전 포함
- 태그 릴리즈 시 BRAT 필수 파일 확인
