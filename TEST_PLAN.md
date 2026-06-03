# My Grocery List — Test Plan (v1.1.2)

## 1. Purpose & Scope

This document defines the manual/assisted test plan for **My Grocery List**, a
vanilla HTML5/CSS3/ES6 PWA that reads a grocery list from a public Google Sheet
(CSV export), persists shopping sessions in `localStorage`, and supports
WhatsApp share, printing, and offline use.

It covers the v1.1.2 UI/UX improvement release on top of the v1.2 ES-module
refactor:

1. Undo for destructive actions (skip category, remove item).
2. No-data-loss on Back from the first shopping category.
3. Larger (40px) touch targets and a clearer category stepper (✓ visited cue).
4. Searchable, per-category item editor in Settings with full-field editing.
5. Clearer summary screen (edit hint, explicit Done-vs-Share copy) and history
   multiplier hint.

Out of scope: backend/server logic (there is none), and Google Sheets authoring.

## 2. Test Environment

| Item | Value |
|------|-------|
| App type | Static PWA, no build step, no backend |
| Modules | ES modules via `<script type="module" src="main.js">` |
| Storage | `localStorage` keys: `settings`, `cachedList`, `prefill`, `sessions`, `activeSession`, `onboarded`, `customItems`, `deletedItems` |
| Data source | Google Sheet published as CSV; falls back to `cachedList`, then seed `DEFAULT_LIST` (130 items / 7 categories) |
| Test harness | Live in-browser preview server serving the app; flows driven through the real UI and `eval` against app state |
| Browsers (target) | Mobile Safari (iOS), Chrome (Android), desktop Chrome |

### 2.1 Deterministic reset procedure

The app re-persists the in-memory active session on `beforeunload`, so a single
`localStorage.clear()` + reload does **not** fully clear state — the unload
handler writes the live `App.session` back. To get a clean state:

1. `localStorage.clear()` then reload.
2. On the reloaded page (where `App.session` is `null`), `localStorage.clear()`
   again then reload.

After the second reload, `activeSession`/`sessions` are genuinely empty.

## 3. Test Case Taxonomy

| Prefix | Area |
|--------|------|
| TC-H | Home / launch |
| TC-S | Shop flow |
| TC-M | Summary / review |
| TC-T | Settings |
| TC-Y | History |
| TC-D | Data & persistence |
| TC-W | Service worker / PWA / manual |

Status legend: **PASS**, **FAIL**, **MANUAL** (requires a device/feature the
automated harness can't exercise).

---

## 4. Test Cases & Results

### 4.1 Home / Launch (TC-H)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-H1 | Time-based greeting | Load app | Greeting matches time of day (Good morning/afternoon/evening) | PASS |
| TC-H2 | Start hint counts | Load app with seed list | Hint reads "130 items · 7 categories" | PASS |
| TC-H3 | Sheet status chip | Load app | Sheet/source chip is shown | PASS |
| TC-H4 | Start enabled | Load app | "Start shopping" is enabled | PASS |
| TC-H5 | No stray resume card on clean state | Run reset procedure (§2.1), reload | No "Resume session" card appears | PASS |
| TC-H6 | Resume card on paused session | Pause a live session, return home | "Resume session" card is shown and resumes the in-progress session | PASS |

### 4.2 Shop Flow (TC-S)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-S1 | Category-at-a-time render | Start shopping | One category card shown with its items; progress bar + stepper reflect position | PASS |
| TC-S2 | Stepper visited cue | Advance past a category, look at stepper | Visited dots show ✓; current dot is highlighted with halo; future dots are empty rings | PASS |
| TC-S3 | Touch target size | Inspect stepper dots / edit & delete controls | Hit areas are ≥40px | PASS |
| TC-S4 | Tick + fields auto-include | Type in brand/qty/unit | Checkbox auto-checks; item marked done on save | PASS |
| TC-S5 | Prefill cue | Item with prefill from last shop | Prefilled fields show amber left border; focus shows "from last shop" hint | PASS |
| TC-S6 | Next/Finish navigation | Tap Next on each category | Advances; last category shows "Finish →" → goes to Summary | PASS |
| TC-S7 | Skip category + undo | Tap "Skip entire category" | Category items set skipped, advance; toast "Skipped <cat>" with Undo restores prior item statuses and returns to that category | PASS |
| TC-S8 | Back saves edits | On first category, enter "TESTBRAND" then tap Back | Edits saved (not discarded); "Session saved" toast; returns Home | PASS |
| TC-S9 | Back navigates within flow | On category >0, tap Back | Saves edits, goes to previous category with in-left animation | PASS |
| TC-S10 | Pause | Tap pause icon | "Session saved" toast; returns Home; resumable | PASS |

### 4.3 Summary / Review (TC-M)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-M1 | Count + date header | Open summary | Shows "<n> items · <date>" | PASS |
| TC-M2 | Edit hint visible | Open summary | Hint "Tap any item to edit it · add extras below"; each row shows ✎ edit hint | PASS |
| TC-M3 | Inline edit | Tap a row | Flips to brand/qty/unit inputs; Save persists and returns to view; prefill updated | PASS |
| TC-M4 | Remove + undo | In edit mode tap Remove | Item set skipped, list re-renders; toast "Removed <item>" with Undo restores it | PASS |
| TC-M5 | Quick add | Type a name (+ qty) in Quick add, tap + / Enter | Item appended under "Other" as done; inputs clear; focus returns to name | PASS |
| TC-M6 | Edit list | Tap "← Edit list" | Re-enters shop flow at first category | PASS |
| TC-M7 | Done copy clarity | Inspect actions | "Done · save to history" button + note that sharing/printing won't end the shop | PASS |
| TC-M8 | Share / Print | Tap WhatsApp / Print | Opens WhatsApp share / print dialog (does not end session) | MANUAL |
| TC-M9 | Finish & exit | Tap Done | Session written to history, active session cleared, returns Home | PASS |

### 4.4 Settings (TC-T)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-T1 | Name autosave | Edit name, blur | Name persists without an explicit save | PASS |
| TC-T2 | Items header count | Open Settings | "Your items · <count>" reflects master list size | PASS |
| TC-T3 | Items grouped by category | Open items section | Items listed grouped under category headers | PASS |
| TC-T4 | Search filter | Type in item search | List filters by item/brand; "No items match" when none | PASS |
| TC-T5 | Edit item (all fields) | Tap ✎, change category/name/brand/qty/unit, Save | Item updated; persists as a custom override | PASS |
| TC-T6 | Rename hides original | Rename a sheet item | Original key added to `deletedItems`; new key not duplicated/hidden | PASS |
| TC-T7 | Delete item | Tap × on an item | Item removed from master list (added to `deletedItems`) | PASS |
| TC-T8 | Cancel edit | Tap ✎ then Cancel | No changes persisted | PASS |
| TC-T9 | Save sheet URL & refresh | Enter URL, tap save | Refreshes from sheet; autosave note shown for name/theme/edits | PASS |
| TC-T10 | Theme toggle | Change theme | Theme applied and persisted | PASS |

### 4.5 History (TC-Y)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-Y1 | Empty state | Open with no sessions | "No past sessions yet..." shown | PASS |
| TC-Y2 | Session card | Open with sessions | Card shows date, item & category counts; expands/collapses | PASS |
| TC-Y3 | Multiplier hint | Expand a card | Hint about ×0.5/×1/×2 scaling shown | PASS |
| TC-Y4 | Per-category multiplier chips | Tap a chip | Chip selects (others deselect) per category | PASS |
| TC-Y5 | Use as template | Tap "Use as template" | Builds template with per-category `_mult`; toast; starts new session with scaled quantities | PASS |

### 4.6 Data & Persistence (TC-D)

| ID | Title | Steps | Expected | Result |
|----|-------|-------|----------|--------|
| TC-D1 | Master list merge | Add custom + delete an item | Master = seed/sheet + customItems − deletedItems, deduped by stable key | PASS |
| TC-D2 | Edit override by key | Edit a sheet item | Custom item with same key overrides original | PASS |
| TC-D3 | Session persists across reload | Start session, reload | In-progress session restored | PASS |
| TC-D4 | Completed session saved | Finish a shop | Appears in History; active session cleared | PASS |
| TC-D5 | Offline / sheet failure fallback | Block sheet, reload | Falls back to `cachedList`, then seed list | MANUAL |
| TC-D6 | Reset clears custom + deleted | Reset items | `customItems` and `deletedItems` cleared; master returns to sheet/seed | PASS |

### 4.7 Service Worker / PWA / Manual (TC-W)

| ID | Title | Expected | Result |
|----|-------|----------|--------|
| TC-W1 | SW registration | `sw.js` registers; `CACHE_NAME = 'grocery-v2'` | PASS |
| TC-W2 | Shell caching | Stale-while-revalidate for app shell | MANUAL |
| TC-W3 | Sheet caching | Network-first for sheet CSV | MANUAL |
| TC-W4 | Install (Add to Home Screen) | Installable on iOS/Android | MANUAL |
| TC-W5 | Offline launch | App loads offline from cache | MANUAL |
| TC-W6 | WhatsApp share text | Share opens WhatsApp with formatted list | MANUAL |
| TC-W7 | Print layout | `print.css` produces clean printout | MANUAL |
| TC-W8 | iOS 7-day storage eviction | Known Safari caveat: script-writable storage may be evicted after 7 days of no use | MANUAL (documented caveat) |

---

## 5. Results Summary

| Area | Executed | Pass | Manual |
|------|----------|------|--------|
| Home (TC-H) | 6 | 6 | 0 |
| Shop (TC-S) | 10 | 10 | 0 |
| Summary (TC-M) | 9 | 8 | 1 |
| Settings (TC-T) | 10 | 10 | 0 |
| History (TC-Y) | 5 | 5 | 0 |
| Data (TC-D) | 6 | 5 | 1 |
| SW/PWA (TC-W) | 8 | 1 | 7 |

No console errors were observed during execution of the automated flows.

## 6. Notes & Known Caveats

- **Local-only edits**: Item edits/deletions live in this device's
  `localStorage` only; the Google Sheet remains the shared master. Other
  devices are unaffected.
- **iOS eviction**: Mobile Safari may clear script-writable storage after ~7
  days of non-use; sessions/history could be lost. The Google Sheet is the
  durable source of truth.
- **Deterministic resets** require the double clear+reload (see §2.1) because of
  the `beforeunload` re-persist of the active session.
