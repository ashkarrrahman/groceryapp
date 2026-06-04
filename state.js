// Shared application state, list loading, and the runtime "master list" merge.
import { Storage } from './storage.js';
import { Sheets } from './sheets.js';
import { DEFAULT_LIST } from './data.js';
import { toast } from './dom.js';
import { currentPath, render } from './router.js';
import { itemKey } from './keys.js';

// Re-exported so existing importers (`import { itemKey } from './state.js'`)
// keep working; the canonical definition now lives in keys.js.
export { itemKey };

export const App = {
  list: null,            // raw item list (from sheet cache or seed defaults)
  offline: false,        // whether we're showing a cached/seed list
  session: null,         // active shopping session
  pendingTemplate: null  // template values when starting from history
};

// Load the raw list (sheet cache → seed) into App.list once.
export function ensureList() {
  if (App.list) return App.list;
  const cached = Storage.getCachedList();
  if (cached && cached.length) { App.list = cached; App.offline = true; }
  else { App.list = DEFAULT_LIST.slice(); App.offline = false; }
  return App.list;
}

// Runtime master list = sheet/seed items + customItems − deletedItems.
// Each returned item is annotated with `key` and (for user items) `custom: true`.
export function getMasterList() {
  ensureList();
  const deleted = Storage.getDeletedItems();
  const custom = Storage.getCustomItems();
  const out = [];
  const byKey = new Map();
  const add = (item, isCustom) => {
    const key = item.key || itemKey(item);
    const entry = Object.assign({}, item, { key, custom: !!isCustom });
    if (byKey.has(key)) { Object.assign(byKey.get(key), entry); return; } // custom overrides
    byKey.set(key, entry);
    out.push(entry);
  };
  (App.list || []).forEach(i => add(i, false));
  custom.forEach(i => add(i, true));
  return out.filter(i => !deleted.includes(i.key));
}

export async function refreshFromSheet(opts) {
  opts = opts || {};
  const settings = Storage.getSettings();
  if (!settings.sheetUrl) { if (opts.toast) toast('No Google Sheet connected'); return false; }
  try {
    const data = await Sheets.fetchSheetData(settings.sheetUrl);
    Storage.saveCachedList(data);
    Storage.saveSettings({ lastFetched: new Date().toISOString() });
    App.list = data;
    App.offline = false;
    if (opts.toast) toast('List updated · ' + data.length + ' items');
    if (currentPath() === '/') render();
    return true;
  } catch (e) {
    if (opts.toast) toast('Couldn’t fetch: ' + e.message);
    // A bad/HTML/empty response never overwrites the valid cached list.
    const cached = Storage.getCachedList();
    if (cached) { App.list = cached; App.offline = true; }
    if (currentPath() === '/') render();
    return false;
  }
}

export function applyTheme(name) {
  if (name && name !== 'purple') document.documentElement.setAttribute('data-theme', name);
  else document.documentElement.removeAttribute('data-theme');
}
