// Settings: name, sheet URL, theme, custom items (add/delete/reset), clear cache.
import { $, el, toast } from '../dom.js';
import { App, getMasterList, itemKey, applyTheme, refreshFromSheet } from '../state.js';
import { navigate, setScreen } from '../router.js';
import { Storage } from '../storage.js';
import { Sheets } from '../sheets.js';
import { Session } from '../session.js';

export function showSettings() {
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

  // Custom items management.
  screen.appendChild(el('div', { class: 'settings-section', id: 'items-section' }));
  renderItemsSection();

  // Clear cache.
  screen.appendChild(el('div', { class: 'settings-section' }, [
    el('button', { class: 'btn-ghost', style: 'width:100%', html: '<span class="danger-text">Clear cached data</span>', onClick: () => {
      Storage.clearCache();
      App.list = null;
      toast('Cached list cleared');
      showSettings();
    } })
  ]));

  screen.appendChild(el('div', { class: 'muted', style: 'text-align:center', text: 'My Grocery List · v1.2' }));
}

function renderItemsSection() {
  const wrap = $('#items-section');
  if (!wrap) return;
  wrap.innerHTML = '';

  const list = getMasterList();
  const cats = Session.categoriesOf(list);

  wrap.appendChild(el('label', { text: 'Your items · ' + list.length, style: 'display:block;text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600;letter-spacing:.06em;margin-bottom:8px' }));

  const catOptions = cats.slice();
  if (!catOptions.includes('Other')) catOptions.push('Other');

  // Add-item form.
  const catSelect = el('select', { class: 'ai-cat', 'aria-label': 'Category' },
    catOptions.map(c => el('option', { value: c, text: c })));
  const nameInput = el('input', { type: 'text', class: 'ai-name', placeholder: 'Item name', 'aria-label': 'Item name' });
  const brandInput = el('input', { type: 'text', class: 'ai-brand', placeholder: 'Brand (optional)', 'aria-label': 'Brand' });
  const qtyInput = el('input', { type: 'text', class: 'ai-qty', placeholder: 'Qty', inputmode: 'decimal', 'aria-label': 'Quantity' });
  const unitInput = el('input', { type: 'text', class: 'ai-unit', placeholder: 'Unit', 'aria-label': 'Unit' });

  function addItem() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const item = {
      category: catSelect.value || 'Other',
      item: name,
      brand: brandInput.value.trim(),
      quantity: qtyInput.value.trim(),
      unit: unitInput.value.trim()
    };
    item.key = itemKey(item);
    // If this key was previously deleted, un-delete it.
    Storage.removeDeletedItem(item.key);
    Storage.addCustomItem(item);
    toast('Added ' + name);
    nameInput.value = ''; brandInput.value = ''; qtyInput.value = ''; unitInput.value = '';
    App.list = App.list; // unchanged; master list recomputes
    renderItemsSection();
  }

  wrap.appendChild(el('div', { class: 'add-item-form' }, [
    el('div', { class: 'ai-row' }, [ catSelect, nameInput ]),
    el('div', { class: 'ai-row' }, [ brandInput, qtyInput, unitInput ]),
    el('button', { class: 'btn-ghost ai-add', style: 'width:100%;margin-top:6px', html: '+ Add item', onClick: addItem })
  ]));

  // Browseable list grouped by category, each row editable / deletable.
  const listWrap = el('div', { class: 'items-list' });
  cats.forEach(cat => {
    const inCat = list.filter(i => i.category === cat);
    if (!inCat.length) return;
    listWrap.appendChild(el('div', { class: 'cat-title', style: 'text-transform:uppercase;color:var(--primary);font-size:11px;font-weight:600;margin:12px 0 4px', text: cat }));
    inCat.forEach(item => listWrap.appendChild(itemLine(item, catOptions)));
  });
  wrap.appendChild(listWrap);

  // Reset customisations.
  wrap.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:12px', text: 'Reset to sheet defaults', onClick: () => {
    if (!confirm('Remove all your added items and restore deleted ones?')) return;
    Storage.resetCustomisations();
    toast('Restored sheet defaults');
    renderItemsSection();
  } }));
}

// A single item row that flips between a view and a full inline editor
// (name, category, brand, quantity, unit). Edits to sheet items are stored as
// custom overrides; edits to custom items update them in place.
function itemLine(item, catOptions) {
  const line = el('div', { class: 'item-line' });

  function viewMode() {
    line.classList.remove('editing');
    line.innerHTML = '';
    const detail = [item.brand, item.quantity ? item.quantity + (item.unit ? ' ' + item.unit : '') : ''].filter(Boolean).join(' · ');
    line.appendChild(el('div', { class: 'il-main' }, [
      el('div', { class: 'il-name', text: item.item }),
      el('div', { class: 'il-detail muted', text: detail })
    ]));
    line.appendChild(el('div', { class: 'il-btns' }, [
      el('button', { class: 'il-edit', 'aria-label': 'Edit ' + item.item, html: '✎', onClick: editMode }),
      el('button', { class: 'il-del', 'aria-label': 'Delete ' + item.item, html: '×', onClick: () => {
        if (item.custom) Storage.removeCustomItem(item.key);
        else Storage.addDeletedItem(item.key);
        renderItemsSection();
      } })
    ]));
  }

  function editMode() {
    line.classList.add('editing');
    line.innerHTML = '';
    const opts = catOptions.slice();
    if (!opts.includes(item.category)) opts.unshift(item.category);
    const catSel = el('select', { class: 'ie-cat', 'aria-label': 'Category' }, opts.map(c => el('option', { value: c, text: c })));
    catSel.value = item.category;
    const nameI = el('input', { type: 'text', class: 'ie-name', value: item.item, placeholder: 'Item name', 'aria-label': 'Item name' });
    const brandI = el('input', { type: 'text', class: 'ie-brand', value: item.brand || '', placeholder: 'Brand', 'aria-label': 'Brand' });
    const qtyI = el('input', { type: 'text', class: 'ie-qty', value: item.quantity || '', placeholder: 'Qty', inputmode: 'decimal', 'aria-label': 'Quantity' });
    const unitI = el('input', { type: 'text', class: 'ie-unit', value: item.unit || '', placeholder: 'Unit', 'aria-label': 'Unit' });

    line.appendChild(el('div', { class: 'ie-row' }, [ catSel, nameI ]));
    line.appendChild(el('div', { class: 'ie-row' }, [ brandI, qtyI, unitI ]));
    line.appendChild(el('div', { class: 'ie-actions' }, [
      el('button', { class: 'btn-ghost', text: 'Cancel', onClick: viewMode }),
      el('button', { class: 'btn-primary', text: 'Save', onClick: () => {
        const name = nameI.value.trim();
        if (!name) { nameI.focus(); return; }
        saveEdit(item, { category: catSel.value || 'Other', name, brand: brandI.value.trim(), quantity: qtyI.value.trim(), unit: unitI.value.trim() });
        renderItemsSection();
      } })
    ]));
    nameI.focus();
  }

  viewMode();
  return line;
}

// Persist an edit to an item. Stored as a custom item keyed by its (possibly
// new) stable key, which overrides the sheet version at render time.
function saveEdit(original, values) {
  const updated = {
    category: values.category,
    item: values.name,
    brand: values.brand,
    quantity: values.quantity,
    unit: values.unit
  };
  if (original.id) updated.id = original.id; // keep stable sheet id if present
  const newKey = itemKey(updated);
  updated.key = newKey;
  const oldKey = original.key;

  // Avoid duplicate custom entries for either key.
  Storage.removeCustomItem(oldKey);
  Storage.removeCustomItem(newKey);
  // Renamed/recategorised a sheet item → hide the original so it can't reappear.
  if (!original.custom && newKey !== oldKey) Storage.addDeletedItem(oldKey);
  // Make sure the resulting key isn't being hidden.
  Storage.removeDeletedItem(newKey);
  Storage.addCustomItem(updated);
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
