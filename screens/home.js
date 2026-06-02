// Welcome screen, onboarding, and session start.
import { $, el, toast, fmtDate } from '../dom.js';
import { App, ensureList, getMasterList, refreshFromSheet } from '../state.js';
import { navigate, setScreen } from '../router.js';
import { Storage } from '../storage.js';
import { Session } from '../session.js';
import { Share } from '../share.js';

export function showWelcome() {
  const screen = setScreen('screen-welcome');
  screen.innerHTML = '';
  const settings = Storage.getSettings();
  ensureList();
  const list = getMasterList();
  const cats = Session.categoriesOf(list);

  const h = new Date().getHours();
  const period = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const name = settings.userName || 'there';

  screen.appendChild(el('div', { class: 'topbar' }, [
    el('div', {}),
    el('div', { class: 'topbar-actions', style: 'display:flex;gap:4px' }, [
      el('button', { class: 'icon-btn', 'aria-label': 'History', onClick: () => navigate('/history'), html: '\u{1F551}' }),
      el('button', { class: 'icon-btn', 'aria-label': 'Settings', onClick: () => navigate('/settings'), html: '⚙️' })
    ])
  ]));

  screen.appendChild(el('div', { class: 'greeting' }, [
    el('div', { class: 'eyebrow', text: period }),
    el('h1', { text: 'Good ' + period.toLowerCase() + ', ' + name }),
    el('div', { class: 'date', text: fmtDate(new Date()) })
  ]));

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
        onClick: function () { this.innerHTML = '<span class="spinner"></span>'; refreshFromSheet({ toast: true }); } })
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

  const canStart = list.length > 0;
  screen.appendChild(el('div', { class: 'start-wrap' }, [
    el('button', { class: 'start-circle', 'aria-label': 'Start shopping', disabled: canStart ? null : 'disabled', onClick: startSession }, [
      el('span', { class: 'play', html: '▶' }),
      el('span', { text: 'Start' }),
      el('span', { text: 'here' })
    ]),
    el('div', { class: 'start-hint', text: canStart ? (list.length + ' items · ' + cats.length + ' categories') : 'Your list is empty' })
  ]));

  maybeOnboard();
}

export async function startSession() {
  const settings = Storage.getSettings();
  // Online + sheet connected → pull the latest before starting.
  if (settings.sheetUrl && navigator.onLine) {
    toast('Fetching latest list…');
    await refreshFromSheet({ toast: false });
  }
  const list = getMasterList();
  if (!list.length) { toast('Your list is empty'); return; }
  App.session = Session.create(list, App.pendingTemplate);
  App.pendingTemplate = null;
  Session.persist(App.session);
  navigate('/shop');
}

// ---------- Onboarding ----------
const ONBOARD_STEPS = [
  { icon: '\u{1F4CA}', title: 'Connect your sheet', text: 'Add a Google Sheet of your items in Settings — or use the built-in sample list to start right away.' },
  { icon: '▶️', title: 'Shop by category', text: 'Walk through one category at a time, tick what you need and set brand & quantity. We remember your choices for next time.' },
  { icon: '\u{1F4F2}', title: 'Share your list', text: 'When you’re done, review and edit the list, then share to WhatsApp or print a clean copy.' }
];
let onboardIdx = 0;

function maybeOnboard() {
  if (Storage.isOnboarded()) return;
  $('#overlay').classList.add('active');
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
