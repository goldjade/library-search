# 작은도서관 장서 검색

3단지와 4단지 작은도서관의 장서를 검색할 수 있는 반응형 웹사이트입니다.

별도의 서버나 데이터베이스 없이 공개 Google Sheets에서 최신 장서 정보를 CSV 형식으로 불러옵니다.

## 서비스

- 웹사이트: https://goldjade.github.io/library-search/
- 기본 도서관: 4단지
- 지원 화면: 데스크톱, 태블릿, 모바일

## 주요 기능

- 4단지·3단지 장서 선택
- 도서명·저자·출판사별 검색
- 검색어의 띄어쓰기를 무시한 부분 일치 검색
- 분류기호와 저자기호를 조합한 청구기호 표시
- 검색 결과 페이지 처리
- 단지별 대출 기간을 반영한 예상 반납일 표시
- 공개 Google Sheets의 최신 장서 목록 불러오기
- UTF-8 및 CP949(EUC-KR) CSV 읽기
- 모바일 검색 결과 카드 레이아웃

> 반납 예정일이 도서관 휴관일인 경우 익일이 실제 반납일이 될 수 있습니다. 화면에 표시된 날짜는 참고용이며 실제 반납일과 다를 수 있습니다.

## 장서 데이터

장서 정보는 공개 Google Sheets 문서의 두 시트를 사용합니다.

- `books_3.csv`: 3단지 장서
- `books_4.csv`: 4단지 장서

각 시트의 첫 행에는 다음 열 이름이 필요합니다.

| 열 | 용도 |
| --- | --- |
| `서명` | 도서명 검색 및 표시 |
| `저자` | 저자 검색 및 표시 |
| `출판사` | 출판사 검색 및 표시 |
| `분류기호` | 청구기호 구성 |
| `저자기호` | 청구기호 구성 |

Google Sheets는 링크가 있는 사용자가 읽을 수 있도록 공개되어 있어야 합니다. 시트 내용을 수정하면 사이트를 다시 배포하지 않아도 다음 데이터 요청부터 변경 내용이 반영됩니다.

Google Sheets 문서와 시트별 `gid` 설정은 [`src/App.jsx`](./src/App.jsx)의 `GOOGLE_SHEET_ID`와 `CSV_URL_BY_SITE`에서 관리합니다.

## 로컬 실행

Node.js가 설치된 환경에서 아래 명령어를 실행합니다.

```bash
npm install
npm run dev
```

Vite가 안내하는 로컬 주소를 브라우저에서 열면 됩니다.

## 검사 및 빌드

```bash
npm run lint
npm run build
```

빌드 결과는 `dist` 디렉터리에 생성됩니다. 프로덕션 빌드를 로컬에서 확인하려면 다음 명령어를 사용합니다.

```bash
npm run preview
```

## 배포

이 프로젝트는 GitHub Pages의 `gh-pages` 브랜치로 배포됩니다. `main` 브랜치에 푸시하는 것만으로는 공개 홈페이지가 갱신되지 않습니다.

```bash
npm run build
npm run deploy
```

배포 기본 경로는 [`vite.config.js`](./vite.config.js)에 `/library-search/`로 설정되어 있습니다.

## 기술 구성

- React 19
- Vite 7
- JavaScript
- CSS
- Google Sheets CSV
- GitHub Pages

## 참고 사항

- 장서 데이터는 Google Sheets를 참조하므로 실시간 대출·소장 상태를 제공하지 않습니다.
- 시트가 비공개이거나 열 이름이 변경되면 장서 목록을 정상적으로 불러올 수 없습니다.
- 브라우저 또는 GitHub Pages의 캐시로 인해 배포 직후 화면 반영에 잠시 시간이 걸릴 수 있습니다.
