// WhatsApp sharing and printing of the final list.

function formatDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildText(items, dateStr) {
  const lines = ['\u{1F6D2} *Grocery List — ' + formatDate(dateStr) + '*\n'];
  let currentCat = '';
  items.forEach(item => {
    if (item.category !== currentCat) {
      currentCat = item.category;
      lines.push('\n*' + currentCat + '*');
    }
    const qty = item.quantity ? (item.quantity + (item.unit ? ' ' + item.unit : '')) : '';
    const detail = [item.brand, qty].filter(Boolean).join(' · ');
    lines.push('• ' + item.item + (detail ? ' — ' + detail : ''));
  });
  return lines.join('\n');
}

async function shareList(items, dateStr) {
  const text = buildText(items, dateStr);
  // Prefer native share sheet (lets user pick WhatsApp, Messages, etc.).
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Grocery List', text });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // user cancelled
    }
  }
  // Fallback: open WhatsApp web/app directly.
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function printList() {
  window.print();
}

export const Share = { buildText, shareList, printList, formatDate };
