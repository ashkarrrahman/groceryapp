// Unit tests for the master-list merge logic in state.js + item identity.
// Uses the real Storage layer against happy-dom's localStorage and seeds a
// controlled cached list (so the merge doesn't pull in the 130-item seed).
import { describe, it, expect, beforeEach } from 'vitest';
import { itemKey, getMasterList, App } from '../state.js';
import { Storage } from '../storage.js';

beforeEach(() => {
  localStorage.clear();
  // Force ensureList() to re-read from storage on each test.
  App.list = null;
});

describe('itemKey', () => {
  it('prefers a sheet id when present', () => {
    expect(itemKey({ id: 42, item: 'Milk', category: 'Dairy' })).toBe('id:42');
  });

  it('is category-scoped and lowercased/trimmed for name-based keys', () => {
    expect(itemKey({ item: '  Milk  ', category: 'Dairy' })).toBe('name:dairy|milk');
  });

  it('gives different keys to same-named items in different categories', () => {
    expect(itemKey({ item: 'Salt', category: 'Spices' }))
      .not.toBe(itemKey({ item: 'Salt', category: 'Pantry' }));
  });

  it('handles missing fields gracefully', () => {
    expect(itemKey({})).toBe('name:|');
    expect(itemKey(null)).toBe('name:|');
  });
});

describe('getMasterList', () => {
  const seedSheet = list => Storage.saveCachedList(list);

  it('returns the seeded list annotated with stable keys', () => {
    seedSheet([
      { item: 'Milk', category: 'Dairy' },
      { item: 'Apples', category: 'Produce' }
    ]);
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Milk', 'Apples']);
    expect(master[0].key).toBe('name:dairy|milk');
    expect(master[0].custom).toBe(false);
  });

  it('keeps same-named items in different categories as separate rows', () => {
    // Regression for the identity-collision bug: previously both "Salt" rows
    // deduped to one and one silently disappeared.
    seedSheet([
      { item: 'Salt', category: 'Spices' },
      { item: 'Salt', category: 'Pantry' }
    ]);
    const master = getMasterList();
    expect(master).toHaveLength(2);
    expect(master.map(i => i.category).sort()).toEqual(['Pantry', 'Spices']);
  });

  it('appends custom items not present in the sheet', () => {
    seedSheet([{ item: 'Milk', category: 'Dairy' }]);
    Storage.addCustomItem({ item: 'Tofu', category: 'Produce' });
    const master = getMasterList();
    const tofu = master.find(i => i.item === 'Tofu');
    expect(tofu).toBeTruthy();
    expect(tofu.custom).toBe(true);
  });

  it('lets a custom item override a sheet item with the same key', () => {
    seedSheet([{ item: 'Milk', category: 'Dairy', brand: '' }]);
    Storage.addCustomItem({ item: 'Milk', category: 'Dairy', brand: 'Amul' });
    const master = getMasterList();
    const milks = master.filter(i => i.key === 'name:dairy|milk');
    expect(milks).toHaveLength(1);        // deduped, not duplicated
    expect(milks[0].brand).toBe('Amul');  // custom value wins
    expect(milks[0].custom).toBe(true);
  });

  it('hides items whose key is in deletedItems', () => {
    seedSheet([
      { item: 'Milk', category: 'Dairy' },
      { item: 'Apples', category: 'Produce' }
    ]);
    Storage.addDeletedItem('name:dairy|milk');
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Apples']);
  });

  it('treats a renamed (deleted-key + new custom) item as a single entry', () => {
    seedSheet([{ item: 'Milk', category: 'Dairy' }]);
    Storage.addDeletedItem('name:dairy|milk');
    Storage.addCustomItem({ item: 'Oat Milk', category: 'Dairy' });
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Oat Milk']);
  });
});
