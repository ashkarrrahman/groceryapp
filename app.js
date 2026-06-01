// Main app: router, screen rendering, and the shopping flow controller.
(function () {
  'use strict';

  const App = {
    list: null,          // current item list (from sheet cache or defaults)
    offline: false,      // whether we're showing a cached/seed list
    session: null,       // active shopping session
    pendingTemplate: null // template values when starting from history
  };

  // ---------- Utilities ----------
  const $ = sel => document.querySelector(sel);
  const el = (tag, props, children) => {
    const node = document.createElement(tag);
    if (props) Object.keys(props).forEach(k => {
      const v = props[k];
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'aria') Object.keys(v).forEach(a => node.setAttribute('aria-' + a, v[a]));
      else if (v === null || v === undefined || v === false) { /* skip — avoids disabled="null" */ }
      else node.setAttribute(k, v);
    });
    (children || []).forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  };

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = el('div', { id: 'toast' }); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function plural(n, singular, pluralForm) { return n + ' ' + (n === 1 ? singular : (pluralForm || singular + 's')); }

  // ---------- Router ----------
  const routes = {
    '/': showWelcome,
    '/shop': showShop,
    '/summary': showSummary,
    '/settings': showSettings,
    '/history': showHistory
  };

  function currentPath() {
    const h = location.hash.replace(/^#/, '');
    return routes[h] ? h : '/';
  }

  function navigate(path) {
    if (location.hash !== '#' + path) location.hash = path;
    else render();
  }
  App.navigate = navigate;

  function render() {
    const path = currentPath();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    (routes[path] || showWelcome)();
  }

  window.addEventListener('hashchange', render);

  function setScreen(id) {
    const node = $('#' + id);
    node.classList.add('active');
    return node;
  }

  // ---------- Data loading ----------
  function ensureList() {
    if (App.list) return App.list;
    const cached = Storage.getCachedList();
    if (cached && cached.length) { App.list = cached; App.offline = true; }
    else { App.list = DEFAULT_LIST.slice(); App.offline = false; }
    return App.list;
  }

  async function refreshFromSheet(opts) {
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
      if (currentPath() === '/') showWelcome();
      return true;
    } catch (e) {
      if (opts.toast) toast('Couldn’t fetch: ' + e.message);
      // Keep whatever cached/seed list we have.
      const cached = Storage.getCachedList();
      if (cached) { App.list = cached; App.offline = true; }
      if (currentPath() === '/') showWelcome();
      return false;
    }
  }

  // ========================================================
  // SCREEN 1 — Welcome
  // ========================================================
  function showWelcome() {
    const screen = setScreen('screen-welcome');
    screen.innerHTML = '';
    const settings = Storage.getSettings();
    const list = ensureList();
    const cats = Session.categoriesOf(list);

    const h = new Date().getHours();
    const period = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
    const name = settings.userName || 'there';

    // Top bar with settings + history.
    screen.appendChild(el('div', { class: 'topbar' }, [
      el('div', {}),
      el('div', { class: 'topbar-actions', style: 'display:flex;gap:4px' }, [
        el('button', { class: 'icon-btn', 'aria-label': 'History', onClick: () => navigate('/history'), html: '\u{1F551}' }),
        el('button', { class: 'icon-btn', 'aria-label': 'Settings', onClick: () => navigate('/settings'), html: '⚙️' })
      ])
    ]));

    // Greeting.
    screen.appendChild(el('div', { class: 'greeting' }, [
      el('div', { class: 'eyebrow', text: period }),
      el('h1', { text: 'Good ' + period.toLowerCase() + ', ' + name }),
      el('div', { class: 'date', text: fmtDate(new Date()) })
    ]));

    // Sheet chip.
    if (settings.sheetUrl) {
      const lf = settings.lastFetched ? new Date(settings.lastFetched).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;
      const sub = (App.offline ? 'Cached' : 'Connected') + ' · ' + list.length + ' items' + (lf ? ' · ' + lf : '');
      screen.appendChild(el('div', { class: 'chip-card' }, [
        el('div', { class: 'chip-icon', html: '\u{1F4CA}' }),
        el('div', { class: 'chip-body' }, [
          el('div', { class: 'chip-title', text: 'Google Sheet' }),
          el('div', { class: 'chip-sub', html: (App.offline ? '' : '✓ ') + sub })
        ]),
        el('button', { class: 'icon-btn', id: 'refresh-btn', 'aria-label': 'Refresh list', html: '↺',
          onClick: function () {
            this.innerHTML = '<span class="spinner"></span>';
            refreshFromSheet({ toast: true });
          } })
      ]));
    } else {
      screen.appendChild(el('div', { class: 'chip-card tappable', onClick: () => navigate('/settings') }, [
        el('div', { class: 'chip-icon', html: '\u{1F4CA}' }),
        el('div', { class: 'chip-body' }, [
          el('div', { class: 'chip-title', text: 'Connect your Google Sheet' }),
          el('div', { class: 'chip-sub', text: 'Tap to add · using sample list for now' })
        ]),
        el('div', { html: '›', style: 'font-size:22px;color:var(--text-muted)' })
      ]));
    }

    // Active session resume card.
    const active = Storage.getActiveSession();
    if (active) {
      const done = active.items.filter(i => i.status !== 'pending').length;
      screen.appendChild(el('div', { class: 'session-card' }, [
        el('div', { class: 'row' }, [
          el('div', {}, [
            el('div', { style: 'font-weight:500', text: 'Session in progress' }),
            el('div', { class: 'muted', text: done + ' of ' + active.items.length + ' done' })
          ]),
          el('button', { class: 'resume-btn', text: 'Resume', onClick: () => { App.session = active; navigate('/shop'); } })
        ])
      ]));
    } else {
      const sessions = Storage.getSessions();
      if (sessions.length) {
        const last = sessions[0];
        screen.appendChild(el('div', { class: 'session-card' }, [
          el('div', { class: 'row' }, [
            el('div', {}, [
              el('div', { style: 'font-weight:500', text: 'Last session' }),
              el('div', { class: 'muted', text: Share.formatDate(last.completedAt) + ' · ' + last.totalItems + ' items' })
            ]),
            el('button', { class: 'resume-btn', text: 'View', onClick: () => navigate('/history') })
          ])
        ]));
      }
    }

    // Start button.
    const canStart = list.length > 0;
    const startWrap = el('div', { class: 'start-wrap' }, [
      el('button', { class: 'start-circle', 'aria-label': 'Start shopping', disabled: canStart ? null : 'disabled',
        onClick: startSession }, [
        el('span', { class: 'play', html: '▶' }),
        el('span', { text: 'Start' }),
        el('span', { text: 'here' })
      ]),
      el('div', { class: 'start-hint', text: canStart ? (list.length + ' items · ' + cats.length + ' categories') : 'Your list is empty' })
    ]);
    screen.appendChild(startWrap);

    maybeOnboard();
  }

  function startSession() {
    const list = ensureList();
    if (!list.length) { toast('Your list is empty'); return; }
    App.session = Session.create(list, App.pendingTemplate);
    App.pendingTemplate = null;
    Session.persist(App.session);
    navigate('/shop');
  }

  // ========================================================
  // SCREEN 2 — Shopping flow
  // ========================================================
  function showShop() {
    if (!App.session) {
      const active = Storage.getActiveSession();
      if (active) App.session = active;
      else { navigate('/'); return; }
    }
    const screen = setScreen('screen-shop');
    screen.innerHTML = '';

    // Top bar: back + pause.
    screen.appendChild(el('div', { class: 'topbar' }, [
      el('button', { class: 'btn-ghost', style: 'border:none;padding:0 8px', 'aria-label': 'Back', onClick: prevCategory, html: '← Back' }),
      el('button', { class: 'icon-btn', 'aria-label': 'Pause and save', onClick: () => pauseSession(), html: '⏸' })
    ]));

    if (typeof App.session.currentCategory !== 'number') App.session.currentCategory = 0;
    const cats = Session.categoriesOf(App.session.items);

    // Progress (category-based).
    screen.appendChild(el('div', { class: 'progress-wrap' }, [
      el('div', { class: 'progress-track', role: 'progressbar', 'aria-valuenow': String(App.session.currentCategory), 'aria-valuemin': '0', 'aria-valuemax': String(cats.length) }, [
        el('div', { class: 'progress-fill', id: 'progress-fill' })
      ]),
      el('div', { class: 'progress-labels' }, [
        el('span', { id: 'progress-count' }),
        el('span', { id: 'progress-cat' })
      ])
    ]));

    screen.appendChild(el('div', { id: 'item-mount' }));
    renderCategory('in-right');
  }

  // Indices into session.items for every item in the named category.
  function categoryItemIndices(items, cat) {
    const out = [];
    items.forEach((it, i) => { if (it.category === cat) out.push(i); });
    return out;
  }

  function renderCategory(animClass) {
    const session = App.session;
    const cats = Session.categoriesOf(session.items);
    if (session.currentCategory >= cats.length) { finishSession(); return; }
    const cat = cats[session.currentCategory];

    // Progress.
    const pct = (session.currentCategory / cats.length) * 100;
    requestAnimationFrame(() => { const f = $('#progress-fill'); if (f) f.style.width = pct + '%'; });
    const countLabel = $('#progress-count'); if (countLabel) countLabel.textContent = 'Category ' + (session.currentCategory + 1) + ' of ' + cats.length;
    const catLabel = $('#progress-cat'); if (catLabel) catLabel.textContent = cat;
    const track = document.querySelector('[role="progressbar"]'); if (track) track.setAttribute('aria-valuenow', String(session.currentCategory));

    const mount = $('#item-mount');
    mount.innerHTML = '';
    const card = el('div', { class: 'item-card ' + animClass });

    // Category header pill (flashes briefly on change).
    const pill = el('div', { class: 'category-pill flash', html: '\u{1F9FA} ' + cat });
    card.appendChild(pill);
    setTimeout(() => pill.classList.remove('flash'), 350);

    const indices = categoryItemIndices(session.items, cat);
    card.appendChild(el('div', { class: 'cat-hint muted', text: 'Tick the items you need, then set brand & quantity.' }));

    indices.forEach(i => card.appendChild(renderItemRow(session.items[i], i)));

    const last = session.currentCategory === cats.length - 1;
    card.appendChild(el('div', { class: 'cat-actions' }, [
      el('button', { class: 'btn-primary', html: last ? 'Finish →' : 'Next category →', onClick: nextCategory }),
      el('button', { class: 'btn-ghost skip-cat', text: 'Skip entire category', onClick: skipCategory })
    ]));

    mount.appendChild(card);
    window.scrollTo(0, 0);
  }

  function renderItemRow(item, idx) {
    // Include if previously chosen, or a fresh pre-filled item.
    const include = item.status === 'done' || (item.status === 'pending' && item.prefilled);

    const checkbox = el('input', { type: 'checkbox', class: 'ci-include', 'aria-label': 'Include ' + item.item });
    if (include) checkbox.checked = true;

    const brand = el('input', { type: 'text', class: 'ci-brand', value: item.brand || '', placeholder: 'Brand', 'aria-label': item.item + ' brand' });
    const qty = el('input', { type: 'text', class: 'ci-qty', value: item.quantity || '', placeholder: 'Qty', inputmode: 'decimal', 'aria-label': item.item + ' quantity' });
    const unit = el('input', { type: 'text', class: 'ci-unit', value: item.unit || '', placeholder: 'Unit', 'aria-label': item.item + ' unit' });

    const row = el('div', { class: 'cat-item' }, [
      el('div', { class: 'ci-top' }, [
        checkbox,
        el('div', { class: 'ci-name' + (item.prefilled ? ' prefilled' : ''), text: item.item })
      ]),
      el('div', { class: 'ci-fields' }, [ brand, qty, unit ])
    ]);
    row.dataset.idx = String(idx);

    // Typing into any field auto-includes the item.
    [brand, qty, unit].forEach(inp => inp.addEventListener('input', () => { checkbox.checked = true; }));

    return row;
  }

  // Read the current category's rows back into the session items.
  function saveCurrentCategory() {
    const session = App.session;
    document.querySelectorAll('.cat-item').forEach(row => {
      const i = +row.dataset.idx;
      const item = session.items[i];
      item.brand = row.querySelector('.ci-brand').value.trim();
      item.quantity = row.querySelector('.ci-qty').value.trim();
      item.unit = row.querySelector('.ci-unit').value.trim();
      if (row.querySelector('.ci-include').checked) {
        item.status = 'done';
        Storage.updatePrefill(item.item, item);
      } else {
        item.status = 'skipped';
      }
    });
  }

  function nextCategory() {
    const session = App.session;
    saveCurrentCategory();
    session.currentCategory++;
    Session.persist(session);
    const cats = Session.categoriesOf(session.items);
    if (session.currentCategory >= cats.length) { finishSession(); return; }
    renderCategory('in-right');
  }

  function prevCategory() {
    const session = App.session;
    saveCurrentCategory();
    if (session.currentCategory === 0) { pauseSession(true); return; }
    session.currentCategory--;
    Session.persist(session);
    renderCategory('in-left');
  }

  function skipCategory() {
    const session = App.session;
    const cats = Session.categoriesOf(session.items);
    const cat = cats[session.currentCategory];
    session.items.forEach(it => { if (it.category === cat) it.status = 'skipped'; });
    session.currentCategory++;
    Session.persist(session);
    if (session.currentCategory >= cats.length) { finishSession(); return; }
    renderCategory('in-right');
  }

  function pauseSession(skipSave) {
    const session = App.session;
    if (!skipSave) saveCurrentCategory();
    Session.persist(session);
    toast('Session saved');
    navigate('/');
  }

  function finishSession() {
    navigate('/summary');
  }

  // ========================================================
  // SCREEN 3 — Summary
  // ========================================================
  function showSummary() {
    // Allow finishing either the live session or a just-completed one.
    let session = App.session || Storage.getActiveSession();
    if (!session) { navigate('/'); return; }
    App.session = session;

    const screen = setScreen('screen-summary');
    screen.innerHTML = '';

    const visible = Session.visibleItems(session.items);

    // The summary is a review step — it does NOT finalise. Editing returns to
    // the shopping flow with selections intact; finalising happens on "Done".
    const dateStr = session._date || Session.todayISO();

    // Re-enter the shopping flow at the last category so Back reaches earlier ones.
    function editList() {
      const cats = Session.categoriesOf(session.items);
      session.currentCategory = Math.max(0, cats.length - 1);
      Session.persist(session);
      navigate('/shop');
    }

    // Finalise: write to history, clear active session, then go home.
    function finishAndExit() {
      Session.complete(session);
      App.session = null;
      navigate('/');
    }

    screen.appendChild(el('div', { class: 'summary-head' }, [
      el('div', { class: 'check', html: '✓' }),
      el('div', {}, [
        el('h1', { text: 'List ready', style: 'font-size:24px' }),
        el('div', { class: 'muted', text: visible.length + ' items · ' + Share.formatDate(dateStr) })
      ])
    ]));

    if (!visible.length) {
      screen.appendChild(el('div', { class: 'empty-state', text: 'Nothing to display. You skipped all items.' }));
      screen.appendChild(el('button', { class: 'btn-primary', style: 'width:100%;margin-top:12px', text: '← Edit list', onClick: editList }));
      screen.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:8px', text: 'Discard & home', onClick: () => { App.session = null; navigate('/'); } }));
      return;
    }

    // Group by category in order.
    const cats = Session.categoriesOf(visible);
    cats.forEach(cat => {
      const block = el('div', { class: 'cat-block' }, [ el('div', { class: 'cat-title', text: cat }) ]);
      visible.filter(i => i.category === cat).forEach(item => {
        const row = el('div', { class: 'summary-item' }, [ el('div', { class: 'name', text: item.item }) ]);
        const qty = item.quantity ? (item.quantity + (item.unit ? ' ' + item.unit : '')) : '';
        const detail = [item.brand, qty].filter(Boolean).join(' · ');
        row.appendChild(el('div', { class: 'detail', text: detail || '—' }));
        block.appendChild(row);
      });
      screen.appendChild(block);
    });

    screen.appendChild(el('div', { class: 'summary-actions' }, [
      el('button', { class: 'btn-ghost', style: 'width:100%', text: '← Edit list', onClick: editList }),
      el('button', { class: 'btn-green', html: '\u{1F7E2} Share via WhatsApp', onClick: () => Share.shareList(visible, dateStr) }),
      el('button', { class: 'btn-ghost', style: 'width:100%', html: '\u{1F5A8} Print', onClick: () => Share.printList() }),
      el('button', { class: 'btn-primary', style: 'width:100%', text: 'Done', onClick: finishAndExit })
    ]));
  }

  // ========================================================
  // SCREEN 4 — Settings
  // ========================================================
  function showSettings() {
    const screen = setScreen('screen-settings');
    screen.innerHTML = '';
    const settings = Storage.getSettings();

    screen.appendChild(el('div', { class: 'topbar' }, [
      el('button', { class: 'btn-ghost', style: 'border:none;padding:0 8px', html: '← Back', onClick: () => navigate('/') }),
      el('h2', { text: 'Settings' }),
      el('div', { style: 'width:44px' })
    ]));

    // Name.
    screen.appendChild(el('div', { class: 'settings-section field' }, [
      el('label', { text: 'Your name', for: 'set-name' }),
      el('input', { type: 'text', id: 'set-name', value: settings.userName || '', placeholder: 'Your name' })
    ]));

    // Sheet URL.
    const urlInput = el('input', { type: 'url', id: 'set-url', value: settings.sheetUrl || '', placeholder: 'https://docs.google.com/spreadsheets/...' });
    screen.appendChild(el('div', { class: 'settings-section' }, [
      el('label', { class: 'field-label', text: 'Google Sheet URL', for: 'set-url', style: 'display:block;text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600;letter-spacing:.06em;margin-bottom:6px' }),
      el('div', { class: 'paste-row' }, [
        urlInput,
        el('button', { class: 'btn-ghost', text: 'Paste', onClick: async () => {
          try { const t = await navigator.clipboard.readText(); urlInput.value = t.trim(); }
          catch (e) { toast('Clipboard not available — paste manually'); }
        } })
      ]),
      el('button', { class: 'btn-ghost', id: 'test-btn', style: 'width:100%;margin-top:10px', text: 'Test connection', onClick: testConnection }),
      el('div', { class: 'test-result', id: 'test-result' })
    ]));

    // Theme.
    const themes = [['purple', '#534AB7'], ['green', '#1D9E75'], ['blue', '#2F6FED'], ['amber', '#BA7517']];
    const themeRow = el('div', { class: 'theme-row' });
    themes.forEach(([name, color]) => {
      themeRow.appendChild(el('button', {
        class: 'theme-dot' + (settings.theme === name ? ' selected' : ''),
        style: 'background:' + color, 'aria-label': 'Theme ' + name,
        onClick: function () {
          Storage.saveSettings({ theme: name });
          applyTheme(name);
          themeRow.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('selected'));
          this.classList.add('selected');
        }
      }));
    });
    screen.appendChild(el('div', { class: 'settings-section' }, [
      el('label', { text: 'Theme', style: 'display:block;text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600;letter-spacing:.06em;margin-bottom:8px' }),
      themeRow
    ]));

    // Save button.
    screen.appendChild(el('button', { class: 'btn-primary', style: 'margin-bottom:22px', text: 'Save', onClick: () => {
      Storage.saveSettings({ userName: $('#set-name').value.trim(), sheetUrl: $('#set-url').value.trim() });
      toast('Settings saved');
      refreshFromSheet({ toast: false }).then(() => navigate('/'));
    } }));

    // Clear cache.
    screen.appendChild(el('div', { class: 'settings-section' }, [
      el('button', { class: 'btn-ghost', style: 'width:100%', html: '<span class="danger-text">Clear cached data</span>', onClick: () => {
        Storage.clearCache();
        App.list = null;
        toast('Cached list cleared');
        showSettings();
      } })
    ]));

    screen.appendChild(el('div', { class: 'muted', style: 'text-align:center', text: 'My Grocery List · v1.0' }));
  }

  async function testConnection() {
    const res = $('#test-result');
    const url = $('#set-url').value.trim();
    if (!url) { res.className = 'test-result err'; res.textContent = 'Enter a sheet URL first.'; return; }
    res.className = 'test-result'; res.innerHTML = '<span class="spinner"></span> Testing...';
    try {
      const data = await Sheets.fetchSheetData(url);
      res.className = 'test-result ok';
      res.textContent = '✓ Connected · ' + data.length + ' items found';
    } catch (e) {
      res.className = 'test-result err';
      res.textContent = '✗ ' + e.message;
    }
  }

  // ========================================================
  // SCREEN 5 — History
  // ========================================================
  function showHistory() {
    const screen = setScreen('screen-history');
    screen.innerHTML = '';

    screen.appendChild(el('div', { class: 'topbar' }, [
      el('button', { class: 'btn-ghost', style: 'border:none;padding:0 8px', html: '← Back', onClick: () => navigate('/') }),
      el('h2', { text: 'History' }),
      el('div', { style: 'width:44px' })
    ]));

    const sessions = Storage.getSessions();
    if (!sessions.length) {
      screen.appendChild(el('div', { class: 'empty-state', text: 'No past sessions yet. Complete a shop to see it here.' }));
      return;
    }

    sessions.forEach(s => {
      const visible = Session.visibleItems(s.items);
      const card = el('div', { class: 'history-card' });
      const head = el('div', { class: 'hc-head', onClick: () => card.classList.toggle('open') }, [
        el('div', {}, [
          el('div', { class: 'hc-date', text: Share.formatDate(s.completedAt) }),
          el('div', { class: 'hc-meta', text: plural(s.totalItems, 'item') + ' · ' + plural(s.categories || Session.categoriesOf(visible).length, 'category').replace('categorys', 'categories') })
        ]),
        el('div', { html: '›', style: 'font-size:22px;color:var(--text-muted)' })
      ]);
      card.appendChild(head);

      const body = el('div', { class: 'hc-body' });
      const cats = Session.categoriesOf(visible);
      cats.forEach(cat => {
        body.appendChild(el('div', { class: 'cat-title', style: 'text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600;margin:10px 0 6px', text: cat }));
        visible.filter(i => i.category === cat).forEach(item => {
          const detail = [item.brand, item.quantity ? item.quantity + (item.unit ? ' ' + item.unit : '') : ''].filter(Boolean).join(' · ') || '—';
          body.appendChild(el('div', { class: 'summary-item' }, [
            el('div', { class: 'name', text: item.item }),
            el('div', { class: 'detail', text: detail })
          ]));
        });
      });

      body.appendChild(el('div', { class: 'hc-actions' }, [
        el('button', { class: 'template-btn', text: 'Use as template', onClick: () => {
          const tpl = {};
          s.items.forEach(i => { if (i.status === 'done') tpl[i.item] = { brand: i.brand, quantity: i.quantity, unit: i.unit }; });
          App.pendingTemplate = tpl;
          toast('Template loaded — starting new session');
          startSession();
        } })
      ]));
      card.appendChild(body);
      screen.appendChild(card);
    });
  }

  // ========================================================
  // Onboarding (3-step walkthrough on first use)
  // ========================================================
  const ONBOARD_STEPS = [
    { icon: '\u{1F4CA}', title: 'Connect your sheet', text: 'Add a Google Sheet of your items in Settings — or use the built-in sample list to start right away.' },
    { icon: '▶️', title: 'Shop item by item', text: 'Walk through each item, set brand and quantity. We remember your choices for next time.' },
    { icon: '\u{1F4F2}', title: 'Share your list', text: 'When you’re done, share the list to WhatsApp or print a clean copy.' }
  ];
  let onboardIdx = 0;

  function maybeOnboard() {
    if (Storage.isOnboarded()) return;
    const ov = $('#overlay');
    ov.classList.add('active');
    onboardIdx = 0;
    renderOnboard();
  }

  function renderOnboard() {
    const step = ONBOARD_STEPS[onboardIdx];
    const card = $('#onboard-card');
    card.innerHTML = '';
    card.appendChild(el('div', { class: 'step-icon', html: step.icon }));
    card.appendChild(el('h2', { text: step.title }));
    card.appendChild(el('p', { text: step.text }));
    const dots = el('div', { class: 'onboard-dots' });
    ONBOARD_STEPS.forEach((_, i) => dots.appendChild(el('div', { class: 'dot' + (i === onboardIdx ? ' active' : '') })));
    card.appendChild(dots);
    const last = onboardIdx === ONBOARD_STEPS.length - 1;
    card.appendChild(el('button', { class: 'btn-primary', text: last ? 'Get started' : 'Next', onClick: () => {
      if (last) { Storage.setOnboarded(); $('#overlay').classList.remove('active'); }
      else { onboardIdx++; renderOnboard(); }
    } }));
    if (!last) card.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:10px;border:none', text: 'Skip', onClick: () => { Storage.setOnboarded(); $('#overlay').classList.remove('active'); } }));
  }

  // ---------- Theme ----------
  function applyTheme(name) {
    if (name && name !== 'purple') document.documentElement.setAttribute('data-theme', name);
    else document.documentElement.removeAttribute('data-theme');
  }

  // ---------- Init ----------
  function init() {
    const settings = Storage.getSettings();
    applyTheme(settings.theme);
    ensureList();

    // Save active session if the user closes mid-shop.
    window.addEventListener('beforeunload', () => {
      if (App.session) {
        Session.persist(App.session);
      }
    });

    render();

    // Background refresh from the sheet (non-blocking).
    if (settings.sheetUrl) refreshFromSheet({ toast: false });

    // Register service worker.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
