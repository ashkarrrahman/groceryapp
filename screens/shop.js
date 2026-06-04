// Shopping flow: category-at-a-time with a tappable category stepper.
import { $, el, toast, toastUndo } from '../dom.js';
import { App } from '../state.js';
import { navigate, setScreen } from '../router.js';
import { Storage } from '../storage.js';
import { Session } from '../session.js';
import { STATUS } from '../keys.js';
import { fieldInputs } from '../ui.js';

export function showShop() {
  if (!App.session) {
    const active = Storage.getActiveSession();
    if (active) App.session = active;
    else { navigate('/'); return; }
  }
  const session = App.session;
  if (typeof session.currentCategory !== 'number') session.currentCategory = 0;
  if (!Array.isArray(session.visited)) session.visited = [session.currentCategory];

  const screen = setScreen('screen-shop');
  screen.innerHTML = '';

  screen.appendChild(el('div', { class: 'topbar' }, [
    el('button', { class: 'btn-ghost', style: 'border:none;padding:0 8px', 'aria-label': 'Back', onClick: prevCategory, html: '← Back' }),
    el('button', { class: 'icon-btn', 'aria-label': 'Pause and save', onClick: () => pauseSession(), html: '⏸' })
  ]));

  const cats = Session.categoriesOf(session.items);

  screen.appendChild(el('div', { class: 'progress-wrap' }, [
    el('div', { class: 'progress-track', role: 'progressbar', 'aria-valuenow': String(session.currentCategory), 'aria-valuemin': '0', 'aria-valuemax': String(cats.length) }, [
      el('div', { class: 'progress-fill', id: 'progress-fill' })
    ]),
    el('div', { class: 'progress-labels' }, [
      el('span', { id: 'progress-count' }),
      el('span', { id: 'progress-cat' })
    ])
  ]));

  // Persistent category stepper (one tappable dot per category).
  screen.appendChild(el('div', { class: 'cat-stepper', id: 'cat-stepper', 'aria-label': 'Categories' }));

  screen.appendChild(el('div', { id: 'item-mount' }));
  renderStepper();
  renderCategory('in-right');
}

function renderStepper() {
  const session = App.session;
  const cats = Session.categoriesOf(session.items);
  const wrap = $('#cat-stepper');
  if (!wrap) return;
  wrap.innerHTML = '';
  cats.forEach((cat, i) => {
    const state = i === session.currentCategory ? 'current'
      : (session.visited.includes(i) ? 'visited' : 'future');
    const dot = el('button', {
      class: 'step-dot ' + state,
      'aria-label': cat + (state === 'current' ? ' (current)' : ''),
      'aria-current': state === 'current' ? 'true' : null,
      title: cat,
      onClick: () => goToCategory(i)
    });
    wrap.appendChild(dot);
  });
}

function goToCategory(i) {
  const session = App.session;
  if (i === session.currentCategory) return;
  const dir = i > session.currentCategory ? 'in-right' : 'in-left';
  saveCurrentCategory();
  session.currentCategory = i;
  if (!session.visited.includes(i)) session.visited.push(i);
  Session.persist(session);
  renderCategory(dir);
}

function categoryItemIndices(items, cat) {
  const out = [];
  items.forEach((it, i) => { if (it.category === cat) out.push(i); });
  return out;
}

function renderCategory(animClass) {
  const session = App.session;
  const cats = Session.categoriesOf(session.items);
  if (session.currentCategory >= cats.length) { finishSession(); return; }
  if (!session.visited.includes(session.currentCategory)) session.visited.push(session.currentCategory);
  const cat = cats[session.currentCategory];

  const pct = (session.currentCategory / cats.length) * 100;
  requestAnimationFrame(() => { const f = $('#progress-fill'); if (f) f.style.width = pct + '%'; });
  const countLabel = $('#progress-count'); if (countLabel) countLabel.textContent = 'Category ' + (session.currentCategory + 1) + ' of ' + cats.length;
  const catLabel = $('#progress-cat'); if (catLabel) catLabel.textContent = cat;
  const track = document.querySelector('[role="progressbar"]'); if (track) track.setAttribute('aria-valuenow', String(session.currentCategory));
  renderStepper();

  const mount = $('#item-mount');
  mount.innerHTML = '';
  const card = el('div', { class: 'item-card ' + animClass });

  const pill = el('div', { class: 'category-pill flash', html: '\u{1F9FA} ' + cat });
  card.appendChild(pill);
  setTimeout(() => pill.classList.remove('flash'), 350);

  card.appendChild(el('div', { class: 'cat-hint muted', text: 'Tick the items you need, then set brand & quantity.' }));

  categoryItemIndices(session.items, cat).forEach(i => card.appendChild(renderItemRow(session.items[i], i)));

  const last = session.currentCategory === cats.length - 1;
  card.appendChild(el('div', { class: 'cat-actions' }, [
    el('button', { class: 'btn-primary', html: last ? 'Finish →' : 'Next category →', onClick: nextCategory }),
    el('button', { class: 'btn-ghost skip-cat', text: 'Skip entire category', onClick: skipCategory })
  ]));

  mount.appendChild(card);
  window.scrollTo(0, 0);
}

function renderItemRow(item, idx) {
  const include = item.status === STATUS.DONE || (item.status === STATUS.PENDING && item.prefilled);

  const checkbox = el('input', { type: 'checkbox', class: 'ci-include', 'aria-label': 'Include ' + item.item });
  if (include) checkbox.checked = true;

  // Prefilled fields get an amber left border + a "from last shop" hint on focus.
  const { brand, qty, unit, row: fields } = fieldInputs(item, { prefilled: true });

  const row = el('div', { class: 'cat-item' }, [
    el('div', { class: 'ci-top' }, [
      checkbox,
      el('div', { class: 'ci-name', text: item.item })
    ]),
    fields,
    el('div', { class: 'ci-fromlast', text: 'from last shop' })
  ]);
  row.dataset.idx = String(idx);

  // Bind inputs to the model on input, so the session object — not the DOM — is
  // the source of truth for entered values. Typing also auto-includes the item.
  brand.addEventListener('input', () => { item.brand = brand.value.trim(); checkbox.checked = true; });
  qty.addEventListener('input', () => { item.quantity = qty.value.trim(); checkbox.checked = true; });
  unit.addEventListener('input', () => { item.unit = unit.value.trim(); checkbox.checked = true; });

  [brand, qty, unit].forEach(inp => {
    if (inp.classList.contains('prefilled')) {
      inp.addEventListener('focus', () => row.classList.add('show-fromlast'));
      inp.addEventListener('blur', () => row.classList.remove('show-fromlast'));
    }
  });

  return row;
}

function saveCurrentCategory() {
  const session = App.session;
  // Brand/qty/unit are already bound to the model on input; the only thing the
  // DOM still owns here is the include toggle, which maps to item status.
  document.querySelectorAll('.cat-item').forEach(row => {
    const i = +row.dataset.idx;
    const item = session.items[i];
    if (!item) return;
    if (row.querySelector('.ci-include').checked) {
      item.status = STATUS.DONE;
      Storage.updatePrefill(item, item._noPrefillQty ? { brand: item.brand, quantity: item._baseQty || '', unit: item.unit } : item);
    } else {
      item.status = STATUS.SKIPPED;
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
  // Always save the current category's edits first (Back on the first
  // category used to discard them silently before exiting).
  saveCurrentCategory();
  if (session.currentCategory === 0) { pauseSession(); return; }
  session.currentCategory--;
  Session.persist(session);
  renderCategory('in-left');
}

function skipCategory() {
  const session = App.session;
  const cats = Session.categoriesOf(session.items);
  const cat = cats[session.currentCategory];
  const fromCat = session.currentCategory;
  // Remember prior statuses so the skip can be undone.
  const prev = session.items.map(it => it.category === cat ? it.status : null);
  session.items.forEach(it => { if (it.category === cat) it.status = STATUS.SKIPPED; });
  session.currentCategory++;
  Session.persist(session);
  toastUndo('Skipped ' + cat, () => {
    session.items.forEach((it, i) => { if (prev[i] !== null) it.status = prev[i]; });
    session.currentCategory = fromCat;
    Session.persist(session);
    renderCategory('in-left');
  });
  if (session.currentCategory >= cats.length) { finishSession(); return; }
  renderCategory('in-right');
}

function pauseSession() {
  const session = App.session;
  saveCurrentCategory();
  Session.persist(session);
  toast('Session saved');
  navigate('/');
}

function finishSession() {
  navigate('/summary');
}
