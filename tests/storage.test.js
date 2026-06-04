// Round-trip tests for the storage layer against happy-dom's localStorage.
import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../storage.js';
import { itemKey } from '../keys.js';

beforeEach(() => localStorage.clear());

describe('custom items', () => {
  it('adds and removes by stable key', () => {
    const item = { item: 'Tofu', category: 'Produce' };
    item.key = itemKey(item);
    Storage.addCustomItem(item);
    expect(Storage.getCustomItems()).toHaveLength(1);
    Storage.removeCustomItem(item.key);
    expect(Storage.getCustomItems()).toHaveLength(0);
  });

  it('removes by computed key when the item carries no .key', () => {
    Storage.addCustomItem({ item: 'Tofu', category: 'Produce' }); // no .key field
    Storage.removeCustomItem(itemKey({ item: 'Tofu', category: 'Produce' }));
    expect(Storage.getCustomItems()).toHaveLength(0);
  });
});

describe('deleted items', () => {
  it('adds idempotently and removes', () => {
    Storage.addDeletedItem('name:dairy|milk');
    Storage.addDeletedItem('name:dairy|milk');
    expect(Storage.getDeletedItems()).toEqual(['name:dairy|milk']);
    Storage.removeDeletedItem('name:dairy|milk');
    expect(Storage.getDeletedItems()).toEqual([]);
  });
});

describe('prefill', () => {
  it('keys by item identity, not raw name (no cross-category bleed)', () => {
    const spicesSalt = { item: 'Salt', category: 'Spices' };
    const pantrySalt = { item: 'Salt', category: 'Pantry' };
    Storage.updatePrefill(spicesSalt, { brand: 'TataSpice', quantity: '1', unit: 'g' });
    Storage.updatePrefill(pantrySalt, { brand: 'TataPantry', quantity: '2', unit: 'kg' });
    const map = Storage.getPrefill();
    expect(map[itemKey(spicesSalt)].brand).toBe('TataSpice');
    expect(map[itemKey(pantrySalt)].brand).toBe('TataPantry');
  });

  it('defaults values to the item when no explicit values passed', () => {
    const item = { item: 'Milk', category: 'Dairy', brand: 'Amul', quantity: '2', unit: 'L' };
    Storage.updatePrefill(item);
    expect(Storage.getPrefill()[itemKey(item)]).toEqual({ brand: 'Amul', quantity: '2', unit: 'L' });
  });
});

describe('resetCustomisations', () => {
  it('clears both custom and deleted items', () => {
    Storage.addCustomItem({ item: 'Tofu', category: 'Produce' });
    Storage.addDeletedItem('name:dairy|milk');
    Storage.resetCustomisations();
    expect(Storage.getCustomItems()).toEqual([]);
    expect(Storage.getDeletedItems()).toEqual([]);
  });
});
