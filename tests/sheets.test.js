// Unit tests for the CSV parser — the most error-prone, highest-value logic.
import { describe, it, expect } from 'vitest';
import { Sheets } from '../sheets.js';

const { parseCSV, normaliseUrl } = Sheets;

describe('Sheets.parseCSV', () => {
  it('parses a simple sheet with header aliases', () => {
    const csv = 'Category,Item,Brand,Qty,Unit\nDairy,Milk,Amul,2,L';
    expect(parseCSV(csv)).toEqual([
      { category: 'Dairy', item: 'Milk', brand: 'Amul', quantity: '2', unit: 'L' }
    ]);
  });

  it('inherits a blank category from the row above', () => {
    const csv = 'Category,Item\nProduce,Apples\n,Bananas';
    const rows = parseCSV(csv);
    expect(rows.map(r => r.category)).toEqual(['Produce', 'Produce']);
  });

  it('falls back to "Uncategorised" when the first row has no category', () => {
    const csv = 'Category,Item\n,Mystery';
    expect(parseCSV(csv)[0].category).toBe('Uncategorised');
  });

  it('respects quoted fields containing commas', () => {
    const csv = 'Category,Item,Brand\nPantry,"Beans, baked",Heinz';
    const row = parseCSV(csv)[0];
    expect(row.item).toBe('Beans, baked');
    expect(row.brand).toBe('Heinz');
  });

  it('respects quoted fields containing newlines (regression)', () => {
    // The old line-splitting parser tore this across two rows.
    const csv = 'Category,Item,Brand\nPantry,"Rice\n(basmati)",Tilda';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].item).toBe('Rice\n(basmati)');
    expect(rows[0].brand).toBe('Tilda');
  });

  it('handles escaped double-quotes inside a quoted field', () => {
    const csv = 'Category,Item\nPantry,"6"" nails"';
    expect(parseCSV(csv)[0].item).toBe('6" nails');
  });

  it('picks up an optional id column and normalises CRLF', () => {
    const csv = 'id,Category,Item\r\nX1,Dairy,Milk\r\n';
    const row = parseCSV(csv)[0];
    expect(row.id).toBe('X1');
    expect(row.item).toBe('Milk');
  });

  it('uses positional columns when the header is unrecognised', () => {
    const csv = 'col1,col2\nDairy,Milk';
    expect(parseCSV(csv)[0]).toMatchObject({ category: 'Dairy', item: 'Milk' });
  });

  it('drops rows with no item and returns [] for empty input', () => {
    expect(parseCSV('Category,Item\nDairy,\n,')).toEqual([]);
    expect(parseCSV('')).toEqual([]);
  });
});

describe('Sheets.normaliseUrl', () => {
  it('builds a CSV export URL from a standard edit URL', () => {
    const out = normaliseUrl('https://docs.google.com/spreadsheets/d/ABC123/edit#gid=7');
    expect(out).toBe('https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=7');
  });

  it('leaves an already-CSV URL untouched', () => {
    const url = 'https://example.com/data.csv';
    expect(normaliseUrl(url)).toBe(url);
  });

  it('defaults gid to 0 when none is present', () => {
    const out = normaliseUrl('https://docs.google.com/spreadsheets/d/ABC123/edit');
    expect(out).toContain('gid=0');
  });
});
