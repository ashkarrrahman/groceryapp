// Canonical item identity and status vocabulary.
//
// This is the single source of truth for two concepts that were previously
// re-derived (and subtly inconsistent) in several modules:
//
//   1. How an item is uniquely keyed — used by the master-list merge, prefill
//      memory, and custom/deleted-item storage. The key MUST incorporate the
//      category, otherwise two items that share a name but live in different
//      categories (e.g. "Salt" under both Spices and Pantry) collide and one
//      silently disappears during de-duplication.
//   2. The allowed item statuses — centralised so a typo can't silently break
//      status filtering.
//
// Kept dependency-free so both storage.js and state.js can import it without
// creating an import cycle.

/** @typedef {'pending'|'done'|'skipped'} ItemStatus */

/** Allowed values for `item.status`. */
export const STATUS = Object.freeze({
  PENDING: 'pending',
  DONE: 'done',
  SKIPPED: 'skipped'
});

const norm = s => (s || '').toString().toLowerCase().trim();

/**
 * Stable identity key for an item.
 * Prefers an explicit sheet `id` so renamed rows don't resurrect; otherwise
 * falls back to a category-scoped name so same-named items in different
 * categories stay distinct.
 *
 * @param {{id?: string|number, category?: string, item?: string} | null | undefined} item
 * @returns {string}
 */
export function itemKey(item) {
  if (item && item.id) return 'id:' + item.id;
  return 'name:' + norm(item && item.category) + '|' + norm(item && item.item);
}
