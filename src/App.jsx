import { useEffect, useMemo, useState } from "react";
import { decodeCSV, parseCSV, rowsToObjects } from "./lib/csv";
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

const GOOGLE_SHEET_ID = "1bLgsEAx6s_V7bJJY8cJMTvS2bHQbZue1jAO-e9fJgyU";

// 공개 Google Sheets의 각 탭을 CSV 형식으로 불러온다.
const CSV_URL_BY_SITE = {
  3: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=1180448183`,
  4: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=1285026582`,
};

const LOAN_DAYS_BY_SITE = {
  3: 7, // 3단지 1주
  4: 14, // 4단지 2주
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
  return (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeNoSpace(s) {
  return normalizeBase(s).replace(/\s+/g, "");
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // 단지 선택(필수)
  const [site, setSite] = useState("4"); // "3" | "4"
  const [selectedField, setSelectedField] = useState("서명");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState(""); // 검색 실행된 검색어
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // 단지별 데이터 캐시(한 번 로드하면 재사용)
  const [cache, setCache] = useState({
    3: null,
    4: null,
  });

  const books = useMemo(() => (site ? cache[site] ?? [] : []), [cache, site]);
  const totalCount = books.length;

  const loadSiteBooksIfNeeded = async (siteValue) => {
    if (!siteValue) return;
    if (cache[siteValue]) return;

    const csvUrl = CSV_URL_BY_SITE[siteValue];
    if (!csvUrl) {
      throw new Error(
        "Google Sheets CSV 설정이 없습니다. CSV_URL_BY_SITE를 확인해 주세요."
      );
    }

    const url = `${csvUrl}&cacheBust=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok)
      throw new Error(
        `Google Sheets 장서 목록을 불러오지 못했습니다. (HTTP ${res.status})`
      );

    const text = decodeCSV(await res.arrayBuffer());
    const rows = parseCSV(text);
    const objs = rowsToObjects(rows);

    // CSV 전체 컬럼 중, 검색/표시에 필요한 내용만 사용
    const mapped = objs.map((o) => {
      const 분류기호 = (o["분류기호"] ?? "").toString().trim();
      const 저자기호 = (o["저자기호"] ?? "").toString().trim();

      const 청구기호 = [분류기호, 저자기호].filter(Boolean).join(" ");

      return {
        id: o.__id,
        서명: (o["서명"] ?? "").toString().trim(),
        저자: (o["저자"] ?? "").toString().trim(),
        출판사: (o["출판사"] ?? "").toString().trim(),
        청구기호,
      };
    });

    setCache((prev) => ({ ...prev, [siteValue]: mapped }));
  };

  useEffect(() => {
    let active = true;

    const preloadDefaultSite = async () => {
      try {
        setLoading(true);
        await loadSiteBooksIfNeeded("4");
      } catch (e) {
        if (active) {
          setLoadError(e instanceof Error ? e.message : "알 수 없는 로딩 오류");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    preloadDefaultSite();
    return () => {
      active = false;
    };
    // 첫 화면에서 기본값인 4단지 장서만 한 번 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const loanDays = site ? LOAN_DAYS_BY_SITE[site] ?? 14 : null;
  const dueDate = loanDays ? addDays(today, loanDays) : null;

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">작은도서관 장서 검색</h1>
        <p className="subtitle">우리 동네 작은도서관의 책을 검색해 보세요.</p>
      </header>

      <section className="searchSection">
        {loadError && <div className="error">로딩 오류: {loadError}</div>}

        <div className="optionRow">
          <div className="segment" aria-label="도서관 선택">
            {SITE_OPTIONS.slice().reverse().map((option) => (
              <button
                key={option.value}
                className={`segmentButton ${site === option.value ? "active" : ""}`}
                onClick={async () => {
                  const next = option.value;
                  setSite(next);
                  setSubmittedQuery("");
                  setError("");
                  setLoadError("");
                  setCurrentPage(1);
                  try {
                    setLoading(true);
                    await loadSiteBooksIfNeeded(next);
                  } catch (err) {
                    setLoadError(
                      err instanceof Error
                        ? err.message
                        : "알 수 없는 로딩 오류"
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="segment fieldSegment" aria-label="검색 대상">
            {FIELD_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`segmentButton ${selectedField === option.value ? "active" : ""}`}
                onClick={() => {
                  setSelectedField(option.value);
                  setCurrentPage(1);
                }}
                disabled={loading}
              >
                {option.label === "작가명(저자)" ? "저자" : option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="searchRow">
          <label className="searchInputWrap">
            <span className="searchIcon" aria-hidden="true">⌕</span>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="책 제목이나 작가를 입력하세요"
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </label>

          <button className="button" onClick={runSearch} disabled={loading}>
            검색
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="statsPanel">
          <div className="statItem">
            <span className="statLabel"><span className="accentIcon">▰</span> 총 장서</span>
            <strong className="statValue">
              {loading ? "불러오는 중" : `${totalCount.toLocaleString()}권`}
            </strong>
          </div>
          <div className="statItem dueStat">
            <span className="statLabel"><span className="sageIcon">▣</span> 반납 예정일</span>
            <strong className="statValue">{dueDate ? formatKoreanDate(dueDate) : "-"}</strong>
            <span className="dueNote">ⓘ 휴관일인 경우 익일 반납 · 표시된 날짜는 실제 반납일과 다를 수 있습니다.</span>
          </div>
        </div>
      </section>

      <section className="resultsSection">
        <div className="resultsHeading">
          <h2>검색 결과 {totalResults.toLocaleString()}권</h2>
          <span>
            {site}단지 · 검색어: {hasSearched ? submittedQuery : "전체"} · 검색 대상: {FIELD_OPTIONS.find((item) => item.value === selectedField)?.label}
          </span>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>서명</th>
                <th className="col-author">저자</th>
                <th className="col-pub">출판사</th>
                <th>청구기호</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="empty">
                    불러오는 중…
                  </td>
                </tr>
              ) : pageItems.length ? (
                pageItems.map((b) => (
                  <tr key={b.id}>
                    <td>{b.서명}</td>
                    <td className="col-author">{b.저자}</td>
                    <td className="col-pub">{b.출판사}</td>
                    <td>{b.청구기호}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty">
                    {hasSearched
                      ? "검색 결과가 없습니다."
                      : "도서관을 선택하고 검색해 주세요."}
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
        <div className="footerLinks">
          <a
            href="https://www.instagram.com/hy_lha4_lib/"
            target="_blank"
            rel="noopener noreferrer"
            className="footerLink"
          >
            📷 4단지 작은도서관 인스타그램
          </a>

          <a
            href="https://band.us/@hytree4lib"
            target="_blank"
            rel="noopener noreferrer"
            className="footerLink"
          >
            👥 4단지 작은도서관 밴드
          </a>
        </div>
      </footer>
    </div>
  );
}
