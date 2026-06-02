// Thin wrappers over localStorage with JSON encoding and safe defaults.
export const Storage = (function () {
  const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_FC4DIk8tedSeP8XczQ2gOoFBbh42P6X8h4YdYA8XeI/edit?gid=0#gid=0';
  const KEYS = {
    settings: 'settings',
    cachedList: 'cachedList',
    prefill: 'prefill',
    sessions: 'sessions',
    activeSession: 'activeSession',
    onboarded: 'onboarded',
    customItems: 'customItems',
    deletedItems: 'deletedItems'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn('Storage.read failed for', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage.write failed for', key, e);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  return {
    KEYS,

    getSettings() {
      return read(KEYS.settings, { userName: '', sheetUrl: DEFAULT_SHEET_URL, theme: 'purple', lastFetched: null });
    },
    saveSettings(settings) {
      const merged = Object.assign(this.getSettings(), settings);
      write(KEYS.settings, merged);
      return merged;
    },

    getCachedList() { return read(KEYS.cachedList, null); },
    saveCachedList(list) { write(KEYS.cachedList, list); },

    getPrefill() { return read(KEYS.prefill, {}); },
    savePrefill(map) { write(KEYS.prefill, map); },
    updatePrefill(item, values) {
      const map = this.getPrefill();
      map[item] = {
        brand: values.brand || '',
        quantity: values.quantity || '',
        unit: values.unit || ''
      };
      write(KEYS.prefill, map);
    },

    getSessions() { return read(KEYS.sessions, []); },
    saveSession(session) {
      const all = this.getSessions();
      all.unshift(session);
      write(KEYS.sessions, all);
    },

    getActiveSession() { return read(KEYS.activeSession, null); },
    saveActiveSession(s) { write(KEYS.activeSession, s); },
    clearActiveSession() { remove(KEYS.activeSession); },

    isOnboarded() { return read(KEYS.onboarded, false) === true; },
    setOnboarded() { write(KEYS.onboarded, true); },

    // ----- Custom items (added by the user in Settings) -----
    getCustomItems() { return read(KEYS.customItems, []); },
    addCustomItem(item) {
      const all = this.getCustomItems();
      all.push(item);
      write(KEYS.customItems, all);
      return all;
    },
    removeCustomItem(key) {
      const all = this.getCustomItems().filter(i => (i.key || ('name:' + (i.item || '').toLowerCase().trim())) !== key);
      write(KEYS.customItems, all);
      return all;
    },

    // ----- Deleted items (keys hidden from the master list) -----
    getDeletedItems() { return read(KEYS.deletedItems, []); },
    addDeletedItem(key) {
      const all = this.getDeletedItems();
      if (!all.includes(key)) { all.push(key); write(KEYS.deletedItems, all); }
      return all;
    },
    removeDeletedItem(key) {
      const all = this.getDeletedItems().filter(k => k !== key);
      write(KEYS.deletedItems, all);
      return all;
    },
    resetCustomisations() {
      remove(KEYS.customItems);
      remove(KEYS.deletedItems);
    },

    clearCache() {
      remove(KEYS.cachedList);
      const s = this.getSettings();
      s.lastFetched = null;
      write(KEYS.settings, s);
    }
  };
})();
