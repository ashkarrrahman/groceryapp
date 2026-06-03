// Tiny DOM helpers shared across screens.

export const $ = sel => document.querySelector(sel);

export function el(tag, props, children) {
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
}

let toastTimer;
export function toast(msg) {
  const t = ensureToast();
  t.classList.remove('has-action');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Toast with an "Undo" button. `onUndo` runs if tapped before it dismisses.
export function toastUndo(msg, onUndo, ms) {
  const t = ensureToast();
  t.classList.add('has-action');
  t.innerHTML = '';
  t.appendChild(el('span', { class: 'toast-msg', text: msg }));
  const btn = el('button', { class: 'toast-undo', text: 'Undo' });
  let done = false;
  const dismiss = () => { clearTimeout(toastTimer); t.classList.remove('show', 'has-action'); };
  btn.addEventListener('click', () => { if (done) return; done = true; dismiss(); onUndo(); });
  t.appendChild(btn);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(dismiss, ms || 5000);
}

function ensureToast() {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast' }); document.body.appendChild(t); }
  return t;
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function plural(n, singular, pluralForm) {
  return n + ' ' + (n === 1 ? singular : (pluralForm || singular + 's'));
}
