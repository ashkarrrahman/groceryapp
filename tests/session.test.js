// Unit tests for the pure helpers in session.js.
// scaleQty / categoriesOf / visibleItems have no storage dependency.
import { describe, it, expect } from 'vitest';
import { Session } from '../session.js';

describe('Session.scaleQty', () => {
  it('returns the input unchanged for a ×1 multiplier', () => {
    expect(Session.scaleQty('2', 1)).toBe('2');
  });

  it('returns the input unchanged for falsy qty or mult', () => {
    expect(Session.scaleQty('', 2)).toBe('');
    expect(Session.scaleQty('2', 0)).toBe('2');
    expect(Session.scaleQty('2', undefined)).toBe('2');
  });

  it('scales a plain numeric quantity', () => {
    expect(Session.scaleQty('3', 2)).toBe('6');
    expect(Session.scaleQty('3', 0.5)).toBe('1.5');
  });

  it('scales the numeric prefix and preserves trailing text', () => {
    expect(Session.scaleQty('500g', 2)).toBe('1000g');
    expect(Session.scaleQty('1.5 kg', 2)).toBe('3 kg');
  });

  it('rounds to at most two decimal places', () => {
    expect(Session.scaleQty('1', 0.333)).toBe('0.33');
  });

  it('leaves non-numeric quantities untouched', () => {
    expect(Session.scaleQty('a few', 2)).toBe('a few');
  });
});

describe('Session.categoriesOf', () => {
  it('returns unique categories preserving first-seen order', () => {
    const items = [
      { category: 'Produce' },
      { category: 'Dairy' },
      { category: 'Produce' },
      { category: 'Pantry' }
    ];
    expect(Session.categoriesOf(items)).toEqual(['Produce', 'Dairy', 'Pantry']);
  });

  it('returns an empty array for no items', () => {
    expect(Session.categoriesOf([])).toEqual([]);
  });
});

describe('Session.visibleItems', () => {
  it('keeps only items with status "done"', () => {
    const items = [
      { item: 'A', status: 'done' },
      { item: 'B', status: 'skipped' },
      { item: 'C', status: 'pending' },
      { item: 'D', status: 'done' }
    ];
    expect(Session.visibleItems(items).map(i => i.item)).toEqual(['A', 'D']);
  });
});
