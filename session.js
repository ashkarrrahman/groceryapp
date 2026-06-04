// Shopping session state and item-stepping logic.
import { Storage } from './storage.js';
import { itemKey, STATUS } from './keys.js';
import { toast } from './dom.js';

function todayISO() { return new Date().toISOString(); }
function todayDate() { return new Date().toISOString().slice(0, 10); }

// Scale a quantity string by a numeric multiplier, preserving non-numeric text.
function scaleQty(qty, mult) {
  if (!qty || !mult || mult === 1) return qty;
  const m = String(qty).match(/^\s*(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return qty;
  const n = parseFloat(m[1]) * mult;
  const text = (Math.round(n * 100) / 100).toString();
  return text + m[2];
}

// Build a fresh session from a list, optionally pre-seeding values from a template.
// Template entries may carry `_mult` (a per-category quantity multiplier) which
// scales the default quantity for this session only (never written to prefill).
function create(list, template) {
  const prefill = Storage.getPrefill();
  const items = list.map(src => {
    const base = {
      id: src.id || undefined,
      category: src.category,
      item: src.item,
      brand: src.brand || '',
      quantity: src.quantity || '',
      unit: src.unit || '',
      note: '',
      status: STATUS.PENDING
    };
    // Template (from history) wins, then prefill memory, then sheet defaults.
    // Both are keyed by the item's stable identity (category-scoped name / id).
    const key = itemKey(src);
    const tpl = template && template[key];
    const pre = prefill[key];
    const source = tpl || pre;
    if (source) {
      base.brand = source.brand || base.brand;
      base.quantity = source.quantity || base.quantity;
      base.unit = source.unit || base.unit;
      base.prefilled = true;
    }
    // Apply per-category multiplier from a template, if any.
    if (tpl && tpl._mult && tpl._mult !== 1) {
      base._baseQty = base.quantity;       // remember unscaled value for prefill
      base.quantity = scaleQty(base.quantity, tpl._mult);
      base._noPrefillQty = true;           // don't persist the scaled qty
    }
    return base;
  });
  return {
    startedAt: todayISO(),
    currentCategory: 0,
    visited: [0],
    items
  };
}

function categoriesOf(items) {
  const seen = [];
  items.forEach(i => { if (!seen.includes(i.category)) seen.push(i.category); });
  return seen;
}

// Items that should appear in the summary / final list.
function visibleItems(items) {
  return items.filter(i => i.status === STATUS.DONE);
}

// Persist an in-progress session. Returns false (and warns the user) if the
// write failed — e.g. storage is full or has been evicted — so an in-progress
// shop is never silently lost.
function persist(session) {
  const ok = Storage.saveActiveSession(session);
  if (!ok) toast('Couldn’t save your session — device storage may be full');
  return ok;
}

// Finalise: write to history, update prefill memory, clear active session.
function complete(session) {
  const done = visibleItems(session.items);
  // Update prefill memory from successfully entered items.
  session.items.forEach(i => {
    if (i.status === STATUS.DONE && (i.brand || i.quantity)) {
      if (i._noPrefillQty) {
        Storage.updatePrefill(i, { brand: i.brand, quantity: i._baseQty || '', unit: i.unit });
      } else {
        Storage.updatePrefill(i, i);
      }
    }
  });
  const record = {
    id: 'sess_' + Date.now(),
    date: todayDate(),
    completedAt: todayISO(),
    totalItems: done.length,
    categories: categoriesOf(done).length,
    items: session.items
  };
  Storage.saveSession(record);
  Storage.clearActiveSession();
  return record;
}

export const Session = { create, categoriesOf, visibleItems, persist, complete, todayDate, todayISO, scaleQty };
