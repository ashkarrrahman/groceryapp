// App entry point: wires routes, theme, init, background refresh, service worker.
import { App, ensureList, applyTheme, refreshFromSheet } from './state.js';
import { setRoutes, render } from './router.js';
import { Storage } from './storage.js';
import { Session } from './session.js';
import { showWelcome } from './screens/home.js';
import { showShop } from './screens/shop.js';
import { showSummary } from './screens/summary.js';
import { showSettings } from './screens/settings.js';
import { showHistory } from './screens/history.js';

setRoutes({
  '/': showWelcome,
  '/shop': showShop,
  '/summary': showSummary,
  '/settings': showSettings,
  '/history': showHistory
});

function init() {
  const settings = Storage.getSettings();
  applyTheme(settings.theme);
  ensureList();

  // Save an active session if the user closes mid-shop.
  window.addEventListener('beforeunload', () => {
    if (App.session) Session.persist(App.session);
  });

  render();

  // Background refresh from the sheet (non-blocking).
  if (settings.sheetUrl) refreshFromSheet({ toast: false });

  // Register the service worker.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
