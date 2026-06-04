// Small shared view fragments used by more than one screen.
import { el } from './dom.js';

// The brand / quantity / unit input trio shown in both the shopping flow and
// the summary editor. Returns the three inputs plus the wrapping row so callers
// can wire their own listeners.
//
// opts.prefilled: when true, fields that carry a remembered value get the
// `prefilled` class (amber cue) — used in the shop flow only.
export function fieldInputs(item, opts) {
  opts = opts || {};
  const pf = !!(opts.prefilled && item.prefilled);
  const cls = (base, value) => base + (pf && value ? ' prefilled' : '');

  const brand = el('input', {
    type: 'text', class: cls('ci-brand', item.brand), value: item.brand || '',
    placeholder: 'Brand', 'aria-label': item.item + ' brand'
  });
  const qty = el('input', {
    type: 'text', class: cls('ci-qty', item.quantity), value: item.quantity || '',
    placeholder: 'Qty', inputmode: 'decimal', 'aria-label': item.item + ' quantity'
  });
  const unit = el('input', {
    type: 'text', class: cls('ci-unit', item.unit), value: item.unit || '',
    placeholder: 'Unit', 'aria-label': item.item + ' unit'
  });
  const row = el('div', { class: 'ci-fields' }, [brand, qty, unit]);
  return { brand, qty, unit, row };
}
