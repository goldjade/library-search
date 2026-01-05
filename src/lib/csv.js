export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++; // CRLF
      row.push(field);
      field = "";

      // 완전 빈 줄 무시
      if (row.some((v) => (v ?? "").toString().trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  // last row
  row.push(field);
  if (row.some((v) => (v ?? "").toString().trim() !== "")) rows.push(row);

  return rows;
}

export function stripBom(s) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function normalizeHeader(h) {
  return stripBom((h ?? "").toString())
    .trim()
    .replace(/\s+/g, "");
}

export function rowsToObjects(rows) {
  if (!rows.length) return [];

  const headersRaw = rows[0];
  const headers = headersRaw.map((h) => normalizeHeader(h));

  const dataRows = rows.slice(1);

  return dataRows.map((r, idx) => {
    const obj = { __id: `${idx}` };
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] || `__col_${i}`;
      obj[key] = (r[i] ?? "").toString().trim();
    }
    return obj;
  });
}

export function normalizeText(s) {
  return (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

export function countGraphemes(s) {
  return Array.from((s ?? "").toString()).length;
}
