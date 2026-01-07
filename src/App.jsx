import { useMemo, useState } from "react";
import { parseCSV, rowsToObjects } from "./lib/csv";
import "./App.css";


const PAGE_SIZE = 10;

const FIELD_OPTIONS = [
  { value: "서명", label: "도서명" },
  { value: "저자", label: "작가명(저자)" },
  { value: "출판사", label: "출판사" },
];

const SITE_OPTIONS = [
  { value: "3", label: "3단지" },
  { value: "4", label: "4단지" },
];

// ✅ public 폴더에 넣은 CSV 파일명만 여기서 관리
const CSV_BY_SITE = {
  "3": "books_3.csv",
  "4": "books_4.csv",
};

const LOAN_DAYS_BY_SITE = {
  "3": 7, // 3단지 1주
  "4": 14, // 4단지 2주
};

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatKoreanDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}


function normalizeBase(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNoSpace(s) {
  return normalizeBase(s).replace(/\s+/g, "");
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // 단지 선택(필수)
  const [site, setSite] = useState(""); // "3" | "4" | ""
  const [selectedField, setSelectedField] = useState("서명");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState(""); // 검색 실행된 검색어
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // 단지별 데이터 캐시(한 번 로드하면 재사용)
  const [cache, setCache] = useState({
    "3": null,
    "4": null,
  });

  const books = site ? cache[site] ?? [] : [];
  const totalCount = books.length;

  const loadSiteBooksIfNeeded = async (siteValue) => {
    if (!siteValue) return;
    if (cache[siteValue]) return;

    const filename = CSV_BY_SITE[siteValue];
    if (!filename) {
      throw new Error("CSV 파일 설정이 없습니다. CSV_BY_SITE를 확인해 주세요.");
    }

    const url = `${import.meta.env.BASE_URL}${filename}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${filename}를 불러오지 못했습니다. (HTTP ${res.status})`);

    const text = await res.text();
    const rows = parseCSV(text);
    const objs = rowsToObjects(rows);

    // CSV 전체 컬럼 중, 검색/표시에 필요한 3개만 사용
    const mapped = objs.map((o) => ({
      id: o.__id,
      서명: (o["서명"] ?? "").toString().trim(),
      저자: (o["저자"] ?? "").toString().trim(),
      출판사: (o["출판사"] ?? "").toString().trim(),
    }));

    setCache((prev) => ({ ...prev, [siteValue]: mapped }));
  };

  const runSearch = async () => {
    const trimmed = query.trim();

    // ✅ 단지 선택 필수
    if (!site) {
      setError("3단지/4단지를 먼저 선택해 주세요.");
      setSubmittedQuery("");
      setCurrentPage(1);
      return;
    }

    // ✅ 공백 검색 불가 + 한 글자 검색 가능
    if (trimmed === "") {
      setError("검색어를 입력해주세요.");
      setSubmittedQuery("");
      setCurrentPage(1);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");
      setError("");

      // ✅ 선택한 단지 CSV가 아직 로드되지 않았으면 1회 로드
      await loadSiteBooksIfNeeded(site);

      setSubmittedQuery(trimmed);
      setCurrentPage(1);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "알 수 없는 로딩 오류");
      setSubmittedQuery("");
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    // 검색어 없으면 빈 결과 유지
    const q = normalizeBase(submittedQuery);
    if (!q) return [];

    const qNoSpace = normalizeNoSpace(submittedQuery);

    return books.filter((b) => {
      const target = b[selectedField] ?? "";
      const t = normalizeBase(target);
      const tNoSpace = normalizeNoSpace(target);

      // ✅ 띄어쓰기 무시 검색: 공백 제거 버전으로도 비교
      return t.includes(q) || tNoSpace.includes(qNoSpace);
    });
  }, [books, selectedField, submittedQuery]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const hasSearched = submittedQuery.trim() !== "";

  const today = new Date();
  const loanDays = site ? (LOAN_DAYS_BY_SITE[site] ?? 14) : null;
  const dueDate = loanDays ? addDays(today, loanDays) : null;


  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">
            {site ? `${site}단지작은도서관 장서 검색` : "작은도서관 장서 검색"}
          </h1>
          {site && dueDate && (
            <p className="subtitle">
              오늘({formatKoreanDate(today)}) 대출 시 반납일:{" "}
              <b>{formatKoreanDate(dueDate)}</b>

              <span className="tooltipWrapper">
                <span className="tooltipIcon">ⓘ</span>
                <span className="tooltip">
                  반납일이 도서관 휴관일인 경우 <br />
                  그 익일을 반납일로 합니다.
                </span>
              </span>
            </p>
          )}


          <p className="subtitle">
            {site
              ? loading
                ? "목록을 불러오는 중…"
                : `총 장서량: ${totalCount.toLocaleString()}권`
              : "3단지/4단지를 선택한 뒤 검색해 주세요."}
          </p>
        </div>
      </header>

      <section className="card">
        {loadError && <div className="error">로딩 오류: {loadError}</div>}

        <div className="searchRow">
          <label className="label">
            도서관 선택(필수)
            <select
              className="select"
              value={site}
              onChange={async (e) => {
                const next = e.target.value;

                setSite(next);
                setSubmittedQuery("");
                setError("");
                setLoadError("");
                setCurrentPage(1);

                // ✅ 단지 선택 즉시 프리로드
                if (next) {
                  try {
                    setLoading(true);
                    await loadSiteBooksIfNeeded(next);
                  } catch (err) {
                    setLoadError(err instanceof Error ? err.message : "알 수 없는 로딩 오류");
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
            >
              <option value="">선택해주세요</option>
              {SITE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

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
              placeholder="한 글자 이상 입력 (띄어쓰기 무시)"
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
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
            {hasSearched && site ? (
              <>
                {" "}
                · 도서관: <b>{site}단지</b> · 검색어: <b>{submittedQuery}</b> · 대상:{" "}
                <b>{selectedField}</b>
              </>
            ) : (
              <> · 도서관 선택 후 검색어를 입력해 주세요.</>
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
                    {hasSearched ? "검색 결과가 없습니다." : "도서관을 선택하고 검색해 주세요."}
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
        <small>
          정적 사이트(React + Vite) · 데이터: public/books_3.csv / public/books_4.csv
        </small>
      </footer>
    </div>
  );
}
