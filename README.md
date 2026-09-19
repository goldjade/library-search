# 작은도서관 장서 검색

3단지와 4단지 작은도서관의 장서를 도서명, 저자, 출판사로 검색하는 React 웹사이트입니다. 장서 목록은 `public` 폴더의 CSV 파일에서 읽으며 별도 서버나 데이터베이스가 필요하지 않습니다.

## 주요 기능

- 3단지·4단지 장서 선택 검색
- 도서명·저자·출판사 검색 및 띄어쓰기 무시
- 분류기호와 저자기호를 조합한 청구기호 표시
- 검색 결과 페이지 처리(페이지당 10권)
- 단지별 대출 기간을 적용한 예상 반납일 표시
- UTF-8 및 CP949(EUC-KR) CSV 읽기

## 실행 방법

Node.js가 설치된 환경에서 다음 명령을 실행합니다.

```bash
npm install
npm run dev
```

프로덕션 빌드와 로컬 확인은 다음과 같습니다.

```bash
npm run build
npm run preview
```

## 장서 데이터 갱신

- `public/books_3.csv`: 3단지 장서
- `public/books_4.csv`: 4단지 장서

CSV에는 `서명`, `저자`, `출판사`, `분류기호`, `저자기호` 헤더가 필요합니다. UTF-8과 CP949 인코딩을 모두 지원합니다.

## 배포

GitHub Pages 배포 경로는 `/library-search/`로 설정되어 있습니다.

```bash
npm run build
npm run deploy
```
