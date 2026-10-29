import { money } from './ui.js';

function timestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${date.toLocaleTimeString('en-GB', { hour12: false })}`;
}
function badge(selection) {
  const name = selection.type === 'number' ? `${selection.value % 2 ? 'green' : 'red'} ${selection.value === 0 || selection.value === 5 ? 'dual' : ''}` : selection.value.toLowerCase();
  return `<span class="bet-badge ${name}" aria-label="Selected ${selection.value}">${selection.type === 'color' ? `<span class="sr-only">${selection.value}</span>` : selection.value}</span>`;
}
export function mountBetHistory(root) {
  const expanded = new Set();
  function updateDetailButton() {
    const rows = [...root.querySelectorAll('details')], button = root.querySelector('[data-history-detail]');
    button?.setAttribute('aria-pressed', String(rows.length > 0 && rows.every(row => row.open)));
  }
  function clicked(event) {
    if (!event.target.closest('[data-history-detail]')) return;
    const rows = [...root.querySelectorAll('details')], open = !rows.every(row => row.open);
    rows.forEach(row => { row.open = open; if (open) expanded.add(row.dataset.betId); else expanded.delete(row.dataset.betId); });
    updateDetailButton();
  }
  function toggled(event) {
    const row = event.target;
    if (!row.matches('details[data-bet-id]')) return;
    if (row.open) expanded.add(row.dataset.betId); else expanded.delete(row.dataset.betId);
    updateDetailButton();
  }
  root.addEventListener('click', clicked);
  root.addEventListener('toggle', toggled, true);
  return {
    render(bets) {
      if (!bets.length) {
        root.innerHTML = '<div class="empty-state"><div class="empty-scroll" aria-hidden="true"><span>≋</span></div><p>No data</p><small class="muted">Your virtual bets will appear here.</small></div>';
        return;
      }
      root.innerHTML = '<div class="my-history-tools"><button type="button" data-history-detail aria-pressed="false">Detail <span aria-hidden="true">›</span></button></div>' + bets.map(bet => `<details class="my-history-row" data-bet-id="${bet.id}" ${expanded.has(String(bet.id)) ? 'open' : ''}>
        <summary>${badge(bet.selection)}<span class="bet-meta"><strong>${bet.period}<i aria-hidden="true">⌄</i></strong><time datetime="${new Date(bet.createdAt).toISOString()}">${timestamp(bet.createdAt)}</time></span>
        <span class="bet-outcome ${bet.status}"><span>${bet.status === 'won' ? 'Win' : bet.status === 'lost' ? 'Lose' : 'Pending'}</span><strong>${bet.status === 'won' ? '+' + money(bet.payout) : bet.status === 'lost' ? '−' + money(bet.amount) : money(bet.amount)}</strong></span></summary>
        <div class="history-detail-content"><span>Selection</span><strong>${bet.selection.type === 'number' ? 'Number ' : ''}${bet.selection.value}</strong><span>Bet amount</span><strong>${money(bet.amount)}</strong><span>Service fee</span><strong>${bet.status === 'pending' ? 'At settlement' : money(bet.fee)}</strong><span>Return incl. stake</span><strong>${money(bet.payout)}</strong><span>Round result</span><strong>${bet.status === 'pending' ? 'Awaiting result' : bet.result}</strong></div>
      </details>`).join('');
      updateDetailButton();
    },
    destroy() { root.removeEventListener('click', clicked); root.removeEventListener('toggle', toggled, true); },
  };
}
