// Unit tests for share.js — WhatsApp text building & date formatting.
// share.js has no imports and no DOM/storage dependencies, so these are
// pure-function tests.
import { describe, it, expect } from 'vitest';
import { Share } from '../share.js';

describe('Share.buildText', () => {
  it('starts with a bold, date-stamped header line', () => {
    const text = Share.buildText([], '2026-06-03');
    const firstLine = text.split('\n')[0];
    expect(firstLine).toContain('*Grocery List —');
    expect(firstLine).toContain('3 June 2026');
  });

  it('groups items under a bold category heading', () => {
    const items = [
      { category: 'Produce', item: 'Apples', brand: '', quantity: '', unit: '' },
      { category: 'Produce', item: 'Bananas', brand: '', quantity: '', unit: '' }
    ];
    const text = Share.buildText(items, '2026-06-03');
    // The category should appear exactly once as a heading.
    const headingCount = (text.match(/\*Produce\*/g) || []).length;
    expect(headingCount).toBe(1);
    expect(text).toContain('• Apples');
    expect(text).toContain('• Bananas');
  });

  it('emits a new heading when the category changes', () => {
    const items = [
      { category: 'Produce', item: 'Apples', brand: '', quantity: '', unit: '' },
      { category: 'Dairy', item: 'Milk', brand: '', quantity: '', unit: '' }
    ];
    const text = Share.buildText(items, '2026-06-03');
    expect(text).toContain('*Produce*');
    expect(text).toContain('*Dairy*');
  });

  it('appends brand · quantity unit as a detail suffix', () => {
    const items = [
      { category: 'Dairy', item: 'Milk', brand: 'Amul', quantity: '2', unit: 'L' }
    ];
    const text = Share.buildText(items, '2026-06-03');
    expect(text).toContain('• Milk — Amul · 2 L');
  });

  it('omits the detail suffix when there is no brand/quantity', () => {
    const items = [
      { category: 'Dairy', item: 'Milk', brand: '', quantity: '', unit: '' }
    ];
    const text = Share.buildText(items, '2026-06-03');
    const milkLine = text.split('\n').find(l => l.includes('Milk'));
    expect(milkLine).toBe('• Milk');
  });

  it('includes quantity without a unit when unit is missing', () => {
    const items = [
      { category: 'Pantry', item: 'Eggs', brand: '', quantity: '12', unit: '' }
    ];
    const text = Share.buildText(items, '2026-06-03');
    expect(text).toContain('• Eggs — 12');
  });
});

describe('Share.formatDate', () => {
  it('formats an ISO date as "D Month YYYY"', () => {
    expect(Share.formatDate('2026-06-03')).toBe('3 June 2026');
  });

  it('falls back to today for an empty/undefined input', () => {
    // Just assert it returns a non-empty string rather than throwing.
    expect(typeof Share.formatDate()).toBe('string');
    expect(Share.formatDate().length).toBeGreaterThan(0);
  });
});
