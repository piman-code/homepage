# E. Google Apps Script 복붙 가이드

이 문서는 Google Apps Script를 처음 쓰는 교사를 기준으로 작성했습니다.

목표:

- 새 스크립트를 어디서 만드는지 알기
- 어떤 코드를 어디에 붙여 넣는지 알기
- 어떤 값을 바꾸면 되는지 알기
- 실행/권한 허용 방법 알기
- 흔한 오류를 스스로 해결하기

## 1단계. 어디를 클릭해서 새 스크립트를 만드나요?

1. Google Drive에서 새 `Google 스프레드시트`를 만듭니다.
2. 스프레드시트를 엽니다.
3. 위쪽 메뉴에서 `확장 프로그램`을 누릅니다.
4. `Apps Script`를 누릅니다.
5. 새 탭이 열리면 기본으로 들어 있는 코드를 모두 지웁니다.

## 2단계. 가장 쉬운 첫 예시 코드

아래 코드를 그대로 붙여 넣으세요.

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("학급도우미")
    .addItem("오늘 출석 시트 만들기", "createTodayAttendanceSheet")
    .addToUi();
}

function createTodayAttendanceSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone() || "Asia/Seoul";
  const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  let sheet = ss.getSheetByName(today);

  if (!sheet) {
    sheet = ss.insertSheet(today);
    sheet.getRange(1, 1, 1, 4).setValues([["번호", "이름", "출결", "메모"]]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
  }

  SpreadsheetApp.getUi().alert(today + " 시트를 준비했습니다.");
}
```

## 3단계. 저장하는 방법

1. 왼쪽 위 프로젝트 이름 부분을 클릭합니다.
2. 예를 들어 `학급도우미-출석시트`라고 이름을 붙입니다.
3. `Ctrl+S` 또는 저장 아이콘을 누릅니다.

## 4단계. 처음 실행하는 방법

1. 코드 창 위쪽 함수 선택 칸에서 `onOpen`을 선택합니다.
2. `실행` 버튼을 누릅니다.
3. 권한 요청 창이 뜨면 본인 계정을 선택합니다.
4. `고급`을 누른 뒤 계속 진행합니다.
5. 허용을 누릅니다.

처음 한 번만 허용하면 됩니다.

## 5단계. 실행 후 어디가 달라지나요?

1. 원래 스프레드시트 탭으로 돌아갑니다.
2. 메뉴 막대에 `학급도우미`가 생깁니다.
3. `학급도우미 -> 오늘 출석 시트 만들기`를 누릅니다.
4. 오늘 날짜 이름의 시트가 만들어집니다.

## 6단계. 어떤 값을 바꾸면 되나요?

이 예시는 그대로 써도 됩니다.

바꿔도 되는 부분:

- `"학급도우미"`: 메뉴 이름
- `"오늘 출석 시트 만들기"`: 메뉴에 보일 글자
- `[["번호", "이름", "출결", "메모"]]`: 시트 첫 줄 제목

예를 들어 `메모` 대신 `비고`를 쓰고 싶으면 아래만 바꾸면 됩니다.

```javascript
sheet.getRange(1, 1, 1, 4).setValues([["번호", "이름", "출결", "비고"]]);
```

## 7단계. homepage와 같이 쓰는 방법

추천 흐름:

1. Google Sheet에서 오늘 출석 시트를 준비합니다.
2. Obsidian에서는 `홈/홈페이지.md`를 엽니다.
3. 교사는 Obsidian 쪽에 핵심 메모만 남깁니다.
4. 자세한 표는 Sheet에 두고, 판단/메모는 Obsidian에 둡니다.

## 8단계. 자주 생기는 오류와 해결법

### 오류 1. 메뉴가 안 생겨요

해결:

1. Apps Script에서 `onOpen`을 한 번 실행했는지 확인합니다.
2. 스프레드시트를 새로고침합니다.

### 오류 2. 권한 오류가 나요

해결:

1. 실행 버튼을 다시 누릅니다.
2. 계정을 선택합니다.
3. `고급`을 눌러 계속 진행합니다.
4. 허용합니다.

### 오류 3. 이미 같은 날짜 시트가 있어요

설명:

- 이 코드는 이미 있으면 새로 만들지 않습니다.
- 즉, 중복 생성은 막고 기존 시트를 그대로 둡니다.

### 오류 4. 날짜가 이상하게 보여요

해결:

1. 스크립트 시간대가 한국으로 맞는지 확인합니다.
2. Apps Script 왼쪽 톱니바퀴 `프로젝트 설정`에서 시간대를 `Asia/Seoul`로 바꿉니다.

## 9단계. 초보자에게 추천하는 확장 순서

1. 오늘 출석 시트 만들기
2. 학생 명단 열 추가하기
3. 상담 메모 열 추가하기
4. 필요하면 Google Form과 연결하기

처음부터 복잡하게 만들지 말고, 한 기능씩 추가하세요.
