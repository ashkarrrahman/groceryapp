// Review screen: inline-editable items + freeform quick-add, before sharing.
import { $, el, toast, toastUndo } from '../dom.js';
import { App } from '../state.js';
import { navigate, setScreen } from '../router.js';
import { Storage } from '../storage.js';
import { Session } from '../session.js';
import { Share } from '../share.js';

export function showSummary() {
  // Allow finishing either the live session or a just-completed one.
  let session = App.session || Storage.getActiveSession();
  if (!session) { navigate('/'); return; }
  App.session = session;

  const screen = setScreen('screen-summary');
  screen.innerHTML = '';

  const dateStr = session._date || Session.todayISO();

  screen.appendChild(el('div', { class: 'summary-head' }, [
    el('div', { class: 'check', html: '✓' }),
    el('div', {}, [
      el('h1', { text: 'List ready', style: 'font-size:24px' }),
      el('div', { class: 'muted', id: 'summary-count' })
    ])
  ]));

  screen.appendChild(el('div', { class: 'summary-hint muted', text: 'Tap any item to edit it · add extras below' }));
  screen.appendChild(el('div', { id: 'summary-body' }));
  renderBody();

  function renderBody() {
    const body = $('#summary-body');
    body.innerHTML = '';
    const visible = Session.visibleItems(session.items);
    const countEl = $('#summary-count');
    if (countEl) countEl.textContent = visible.length + ' items · ' + Share.formatDate(dateStr);

    if (!visible.length) {
      body.appendChild(el('div', { class: 'empty-state', text: 'Nothing on the list yet. Add an item below or edit the full list.' }));
    } else {
      const cats = Session.categoriesOf(visible);
      cats.forEach(cat => {
        const block = el('div', { class: 'cat-block' }, [ el('div', { class: 'cat-title', text: cat }) ]);
        visible.filter(i => i.category === cat).forEach(item => {
          block.appendChild(summaryRow(item));
        });
        body.appendChild(block);
      });
    }

    // Quick-add freeform item (stored under "Other").
    body.appendChild(quickAdd());

    body.appendChild(el('div', { class: 'summary-actions' }, [
      el('button', { class: 'btn-ghost', style: 'width:100%', text: '← Edit list', onClick: editList }),
      el('button', { class: 'btn-green', html: '\u{1F7E2} Share via WhatsApp', onClick: () => Share.shareList(Session.visibleItems(session.items), dateStr) }),
      el('button', { class: 'btn-ghost', style: 'width:100%', html: '\u{1F5A8} Print', onClick: () => Share.printList() }),
      el('button', { class: 'btn-primary', style: 'width:100%', text: 'Done · save to history', onClick: finishAndExit }),
      el('div', { class: 'muted', style: 'font-size:12px;text-align:center', text: 'Sharing or printing won’t end the shop — tap Done to save it to History.' })
    ]));
  }

  // A summary row that flips to inline-editable fields when tapped.
  function summaryRow(item) {
    const row = el('div', { class: 'summary-item tappable' });
    const idx = session.items.indexOf(item);

    function showView() {
      row.classList.remove('editing');
      row.innerHTML = '';
      const qty = item.quantity ? (item.quantity + (item.unit ? ' ' + item.unit : '')) : '';
      const detail = [item.brand, qty].filter(Boolean).join(' · ');
      row.appendChild(el('div', { class: 'name', text: item.item }));
      row.appendChild(el('div', { class: 'si-right' }, [
        el('div', { class: 'detail', text: detail || 'Tap to add detail' }),
        el('span', { class: 'edit-hint', html: '✎', 'aria-hidden': 'true' })
      ]));
      row.onclick = showEdit;
    }

    function showEdit() {
      row.classList.add('editing');
      row.onclick = null;
      row.innerHTML = '';
      const brand = el('input', { type: 'text', class: 'ci-brand', value: item.brand || '', placeholder: 'Brand', 'aria-label': item.item + ' brand' });
      const qty = el('input', { type: 'text', class: 'ci-qty', value: item.quantity || '', placeholder: 'Qty', inputmode: 'decimal', 'aria-label': item.item + ' quantity' });
      const unit = el('input', { type: 'text', class: 'ci-unit', value: item.unit || '', placeholder: 'Unit', 'aria-label': item.item + ' unit' });

      function save(e) {
        if (e) e.stopPropagation();
        item.brand = brand.value.trim();
        item.quantity = qty.value.trim();
        item.unit = unit.value.trim();
        Session.persist(session);
        Storage.updatePrefill(item.item, item._noPrefillQty ? { brand: item.brand, quantity: item._baseQty || '', unit: item.unit } : item);
        showView();
      }

      row.appendChild(el('div', { class: 'se-name', text: item.item }));
      row.appendChild(el('div', { class: 'ci-fields' }, [ brand, qty, unit ]));
      row.appendChild(el('div', { class: 'se-actions' }, [
        el('button', { class: 'btn-ghost se-remove', text: 'Remove', onClick: (e) => {
          if (e) e.stopPropagation();
          const prevStatus = item.status;
          item.status = 'skipped';
          Session.persist(session);
          renderBody();
          toastUndo('Removed ' + item.item, () => {
            item.status = prevStatus;
            Session.persist(session);
            renderBody();
          });
        } }),
        el('button', { class: 'btn-primary se-save', text: 'Save', onClick: save })
      ]));
      brand.focus();
    }

    showView();
    return row;
  }

  // Freeform "add one more thing" field → appends a done item under "Other".
  function quickAdd() {
    const nameInput = el('input', { type: 'text', class: 'qa-name', placeholder: 'Add an item…', 'aria-label': 'Add an item' });
    const qtyInput = el('input', { type: 'text', class: 'qa-qty', placeholder: 'Qty', inputmode: 'decimal', 'aria-label': 'Quantity' });

    function add() {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      session.items.push({
        category: 'Other',
        item: name,
        brand: '',
        quantity: qtyInput.value.trim(),
        unit: '',
        note: '',
        status: 'done'
      });
      Session.persist(session);
      nameInput.value = '';
      qtyInput.value = '';
      renderBody();
      const fresh = $('#summary-body .qa-name');
      if (fresh) fresh.focus();
    }

    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    qtyInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });

    return el('div', { class: 'quick-add' }, [
      el('div', { class: 'qa-label muted', text: 'Quick add' }),
      el('div', { class: 'qa-row' }, [
        nameInput,
        qtyInput,
        el('button', { class: 'btn-primary qa-add', html: '+', 'aria-label': 'Add item', onClick: add })
      ])
    ]);
  }

  // Re-enter the shopping flow from the first category.
  function editList() {
    session.currentCategory = 0;
    Session.persist(session);
    navigate('/shop');
  }

  // Finalise: write to history, clear active session, then go home.
  function finishAndExit() {
    Session.complete(session);
    App.session = null;
    navigate('/');
  }
}
