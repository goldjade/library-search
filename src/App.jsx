import { useEffect, useMemo, useState } from "react";
import {
  parseCSV,
  rowsToObjects,
  normalizeHeader,
  normalizeText,
} from "./lib/csv";

const PAGE_SIZE = 10;

const FIELD_OPTIONS = [
  { value: "서명", label: "서명" },
  { value: "저자", label: "작가명(저자)" },
  { value: "출판사", label: "출판사" },
];

function pickField(obj, wantedHeader) {
  // CSV 헤더는 공백/붙임 차이가 있을 수 있으니 normalize해서 찾습니다.
  const target = normalizeHeader(wantedHeader);
  // 정확 일치 우선
  if (obj[target] !== undefined) return obj[target];

  // 혹시 원본 헤더가 "서명 "처럼 들어왔다면 normalizeHeader 적용 과정에서 붙었으므로
  // 일반적으로 여기서 해결됩니다. 그래도 못 찾으면 undefined.
  return undefined;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // books: 화면/검색용으로 필요한 필드만 갖는 배열
  const [books, setBooks] = useState([]);

  const [selectedField, setSelectedField] = useState("서명");
  const [query, setQuery] = useState("");

  // 검색이 “실행”되었을 때만 적용되는 쿼리
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // CSV 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        const url = `${import.meta.env.BASE_URL}books.csv`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`CSV를 불러오지 못했습니다. (HTTP ${res.status})`);

        const text = await res.text();
        const rows = parseCSV(text);
        const objs = rowsToObjects(rows);

        // 전체 컬럼 obj를 받아서, 필요한 3개만 추출해서 books 구성
        const mapped = objs.map((o) => {
          const title = pickField(o, "서명") ?? "";
          const author = pickField(o, "저자") ?? "";
          const publisher = pickField(o, "출판사") ?? "";

          return {
            id: o.__id,
            서명: title.toString().trim(),
            저자: author.toString().trim(),
            출판사: publisher.toString().trim(),
            // raw: o, // 나중에 상세정보를 보여주고 싶으면 주석 해제
          };
        });

        setBooks(mapped);
      } catch (e) {
        setLoadError(
          e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runSearch = () => {
    const trimmed = query.trim();

    if (trimmed === "") {
      setError("검색어를 입력해주세요.");
      setSubmittedQuery("");
      setCurrentPage(1);
      return;
    }

    const len = Array.from(trimmed).length;
    if (len < 2) {
      setError("검색어는 공백을 제외하고 2글자 이상 입력해 주세요.");
      setSubmittedQuery("");
      setCurrentPage(1);
      return;
    }

    setError("");
    setSubmittedQuery(trimmed);
    setCurrentPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };

  // 검색 결과: submittedQuery가 없으면 빈 배열
  const filtered = useMemo(() => {
    const q = normalizeText(submittedQuery);
    if (!q) return [];

    return books.filter((b) => normalizeText(b[selectedField]).includes(q));
  }, [books, selectedField, submittedQuery]);

  const totalCount = books.length;
  const totalResults = filtered.length;

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filtered.slice(start, end);
  }, [filtered, safePage]);

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const hasSearched = submittedQuery.trim() !== "";

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">도서관 장서 검색</h1>
          <p className="subtitle">
            {loading
              ? "목록을 불러오는 중…"
              : `총 장서량: ${totalCount.toLocaleString()}권`}
          </p>
        </div>
      </header>

      <section className="card">
        {loadError && <div className="error">{loadError}</div>}

        <div className="searchRow">
          <label className="label">
            검색 대상
            <select
              className="select"
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
            >
              {FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="label grow">
            검색어
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="2글자 이상 입력"
              disabled={loading}
            />
          </label>

          <button className="button" onClick={runSearch} disabled={loading}>
            검색
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="metaRow">
          <div className="meta">
            검색 결과: <b>{totalResults.toLocaleString()}</b>권
            {hasSearched ? (
              <>
                {" "}
                · 현재 검색어: <b>{submittedQuery}</b> · 대상:{" "}
                <b>{selectedField}</b>
              </>
            ) : (
              <> · 검색어를 입력해주세요.</>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>서명</th>
                <th>저자</th>
                <th>출판사</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="empty">
                    불러오는 중…
                  </td>
                </tr>
              ) : pageItems.length ? (
                pageItems.map((b) => (
                  <tr key={b.id}>
                    <td>{b.서명}</td>
                    <td>{b.저자}</td>
                    <td>{b.출판사}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="empty">
                    {hasSearched
                      ? "검색 결과가 없습니다."
                      : "검색어를 입력해주세요."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalResults > PAGE_SIZE && (
          <div className="pager">
            <button
              className="pagerBtn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              이전
            </button>

            <div className="pagerInfo">
              {safePage} / {totalPages}
            </div>

            <button
              className="pagerBtn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </section>

      <footer className="footer">
        <small>정적 사이트(React + Vite) · 데이터: public/books.csv</small>
      </footer>
    </div>
  );
}
