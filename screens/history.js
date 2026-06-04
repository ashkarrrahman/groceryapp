// Past sessions, expandable, reusable as a template with per-category multipliers.
import { $, el, toast, plural } from '../dom.js';
import { App } from '../state.js';
import { navigate, setScreen } from '../router.js';
import { Storage } from '../storage.js';
import { Session } from '../session.js';
import { Share } from '../share.js';
import { startSession } from './home.js';
import { itemKey, STATUS } from '../keys.js';

const MULTIPLIERS = [0.5, 1, 2];

export function showHistory() {
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
    const cats = Session.categoriesOf(visible);
    // Per-category multiplier choices for "use as template" (default ×1).
    const mults = {};
    cats.forEach(c => { mults[c] = 1; });

    const card = el('div', { class: 'history-card' });
    const head = el('div', { class: 'hc-head', onClick: () => card.classList.toggle('open') }, [
      el('div', {}, [
        el('div', { class: 'hc-date', text: Share.formatDate(s.completedAt) }),
        el('div', { class: 'hc-meta', text: plural(s.totalItems, 'item') + ' · ' + plural(s.categories || cats.length, 'category').replace('categorys', 'categories') })
      ]),
      el('div', { html: '›', style: 'font-size:22px;color:var(--text-muted)' })
    ]);
    card.appendChild(head);

    const body = el('div', { class: 'hc-body' });
    body.appendChild(el('div', { class: 'mult-hint muted', text: 'Tap ×0.5 / ×1 / ×2 on a category to scale its quantities when reusing.' }));
    cats.forEach(cat => {
      // Category header with multiplier chips.
      const chips = el('div', { class: 'mult-chips' });
      MULTIPLIERS.forEach(m => {
        const chip = el('button', {
          class: 'mult-chip' + (m === 1 ? ' selected' : ''),
          text: '×' + m,
          'aria-label': cat + ' multiplier ×' + m,
          onClick: () => {
            mults[cat] = m;
            chips.querySelectorAll('.mult-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
          }
        });
        chips.appendChild(chip);
      });
      body.appendChild(el('div', { class: 'hc-cat-head' }, [
        el('div', { class: 'cat-title', style: 'text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600', text: cat }),
        chips
      ]));

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
        s.items.forEach(i => {
          if (i.status === STATUS.DONE) {
            // Keyed by stable identity so it lines up with Session.create's lookup.
            tpl[itemKey(i)] = { brand: i.brand, quantity: i.quantity, unit: i.unit, _mult: mults[i.category] || 1 };
          }
        });
        App.pendingTemplate = tpl;
        toast('Template loaded — starting new session');
        startSession();
      } })
    ]));
    card.appendChild(body);
    screen.appendChild(card);
  });
}
