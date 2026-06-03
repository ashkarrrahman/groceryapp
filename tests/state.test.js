// Unit tests for the master-list merge logic in state.js.
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
    expect(itemKey({ id: 42, item: 'Milk' })).toBe('id:42');
  });

  it('falls back to a lowercased, trimmed name', () => {
    expect(itemKey({ item: '  Milk  ' })).toBe('name:milk');
  });

  it('handles missing item gracefully', () => {
    expect(itemKey({})).toBe('name:');
    expect(itemKey(null)).toBe('name:');
  });
});

describe('getMasterList', () => {
  function seedSheet(list) {
    Storage.saveCachedList(list);
  }

  it('returns the seeded list annotated with stable keys', () => {
    seedSheet([
      { item: 'Milk', category: 'Dairy' },
      { item: 'Apples', category: 'Produce' }
    ]);
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Milk', 'Apples']);
    expect(master[0].key).toBe('name:milk');
    expect(master[0].custom).toBe(false);
  });

  it('appends custom items not present in the sheet', () => {
    seedSheet([{ item: 'Milk', category: 'Dairy' }]);
    Storage.addCustomItem({ item: 'Tofu', category: 'Produce' });
    const master = getMasterList();
    expect(master.map(i => i.item)).toContain('Tofu');
    const tofu = master.find(i => i.item === 'Tofu');
    expect(tofu.custom).toBe(true);
  });

  it('lets a custom item override a sheet item with the same key', () => {
    seedSheet([{ item: 'Milk', category: 'Dairy', brand: '' }]);
    Storage.addCustomItem({ item: 'Milk', category: 'Dairy', brand: 'Amul' });
    const master = getMasterList();
    const milks = master.filter(i => i.key === 'name:milk');
    expect(milks).toHaveLength(1);        // deduped, not duplicated
    expect(milks[0].brand).toBe('Amul');  // custom value wins
    expect(milks[0].custom).toBe(true);
  });

  it('hides items whose key is in deletedItems', () => {
    seedSheet([
      { item: 'Milk', category: 'Dairy' },
      { item: 'Apples', category: 'Produce' }
    ]);
    Storage.addDeletedItem('name:milk');
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Apples']);
  });

  it('treats a renamed (deleted-key + new custom) item as a single entry', () => {
    // Simulates renaming sheet "Milk" → "Oat Milk": original key deleted,
    // a custom item added under the new key.
    seedSheet([{ item: 'Milk', category: 'Dairy' }]);
    Storage.addDeletedItem('name:milk');
    Storage.addCustomItem({ item: 'Oat Milk', category: 'Dairy' });
    const master = getMasterList();
    expect(master.map(i => i.item)).toEqual(['Oat Milk']);
  });
});
