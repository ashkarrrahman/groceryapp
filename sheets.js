// Google Sheets CSV fetching and parsing.
const Sheets = (function () {

  // Robust CSV line splitter that respects quoted fields containing commas.
  function splitCSVLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function parseCSV(text) {
    const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!clean) return [];
    const lines = clean.split('\n');
    // Skip header row.
    const rows = lines.slice(1);
    return rows
      .map(line => {
        const cols = splitCSVLine(line);
        const [category, item, brand, quantity, unit] = cols;
        return {
          category: (category || 'Uncategorised').trim(),
          item: (item || '').trim(),
          brand: (brand || '').trim(),
          quantity: (quantity || '').trim(),
          unit: (unit || '').trim()
        };
      })
      .filter(r => r.item);
  }

  // Normalise a pasted Google Sheets URL into a CSV export URL when possible.
  function normaliseUrl(url) {
    if (!url) return url;
    url = url.trim();
    // Already a CSV/published URL — use as-is.
    if (/output=csv|format=csv|\.csv/i.test(url)) return url;
    // Standard edit URL → build gviz CSV export.
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) {
      const id = m[1];
      const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    }
    return url;
  }

  async function fetchSheetData(csvUrl) {
    const url = normaliseUrl(csvUrl);
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    if (/<html|<!doctype/i.test(text.slice(0, 200))) {
      throw new Error('Got a web page instead of CSV. Make sure the sheet is published or shared as "anyone with the link".');
    }
    const data = parseCSV(text);
    if (!data.length) throw new Error('No items found. Check your sheet has data below the header row.');
    return data;
  }

  return { fetchSheetData, parseCSV, normaliseUrl };
})();
