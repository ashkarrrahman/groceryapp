// Shopping session state and item-stepping logic.
const Session = (function () {

  function todayISO() { return new Date().toISOString(); }
  function todayDate() { return new Date().toISOString().slice(0, 10); }

  // Build a fresh session from a list, optionally pre-seeding values from a template.
  function create(list, template) {
    const prefill = Storage.getPrefill();
    const items = list.map(src => {
      const base = {
        category: src.category,
        item: src.item,
        brand: src.brand || '',
        quantity: src.quantity || '',
        unit: src.unit || '',
        note: '',
        status: 'pending'
      };
      // Template (from history) wins, then prefill memory, then sheet defaults.
      const tpl = template && template[src.item];
      const pre = prefill[src.item];
      const source = tpl || pre;
      if (source) {
        base.brand = source.brand || base.brand;
        base.quantity = source.quantity || base.quantity;
        base.unit = source.unit || base.unit;
        base.prefilled = true;
      }
      return base;
    });
    return {
      startedAt: todayISO(),
      currentCategory: 0,
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
    return items.filter(i => i.status === 'done');
  }

  // Persist an in-progress session.
  function persist(session) {
    Storage.saveActiveSession(session);
  }

  // Finalise: write to history, update prefill memory, clear active session.
  function complete(session) {
    const done = visibleItems(session.items);
    // Update prefill memory from successfully entered items.
    session.items.forEach(i => {
      if (i.status === 'done' && (i.brand || i.quantity)) {
        Storage.updatePrefill(i.item, i);
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

  return { create, categoriesOf, visibleItems, persist, complete, todayDate, todayISO };
})();
