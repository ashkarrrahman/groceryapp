// Google Sheets CSV fetching and parsing.
export const Sheets = (function () {

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

  // Map a header row to column indices. Supports common aliases and an optional
  // stable id column. Falls back to positional order when headers are unknown.
  function columnMap(headerCols) {
    const norm = headerCols.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    const find = (...aliases) => {
      for (const a of aliases) { const i = norm.indexOf(a); if (i !== -1) return i; }
      return -1;
    };
    const map = {
      id: find('id', 'itemid', 'uid', 'key'),
      category: find('category', 'cat', 'group'),
      item: find('item', 'name', 'product'),
      brand: find('brand', 'defaultbrand'),
      quantity: find('quantity', 'qty', 'defaultquantity'),
      unit: find('unit', 'units')
    };
    // If the header didn't look like ours at all, use positional defaults.
    if (map.category === -1 && map.item === -1) {
      return { id: -1, category: 0, item: 1, brand: 2, quantity: 3, unit: 4 };
    }
    return map;
  }

  function parseCSV(text) {
    const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!clean) return [];
    const lines = clean.split('\n');
    const map = columnMap(splitCSVLine(lines[0]));
    const at = (cols, i) => (i >= 0 && cols[i] != null ? String(cols[i]).trim() : '');
    const rows = lines.slice(1);
    // Blank category cells inherit the category of the row above (sheets often
    // label only the first row of each group), falling back to 'Uncategorised'.
    let lastCategory = 'Uncategorised';
    return rows
      .map(line => {
        const cols = splitCSVLine(line);
        const cat = at(cols, map.category);
        if (cat) lastCategory = cat;
        const out = {
          category: cat || lastCategory,
          item: at(cols, map.item),
          brand: at(cols, map.brand),
          quantity: at(cols, map.quantity),
          unit: at(cols, map.unit)
        };
        const id = at(cols, map.id);
        if (id) out.id = id;
        return out;
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
