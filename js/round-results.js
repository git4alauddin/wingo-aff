import { bindDialog, money, roomLabel } from './ui.js';
import { resultMarkup } from './result-markup.js';

/** Summarize only settled bets belonging to this exact room and period. */
export function summarizeRound(result, bets) {
  const settled = bets.filter(bet => bet.room === result.room && bet.period === result.period && bet.status !== 'pending');
  if (!settled.length) return null;
  const payout = settled.reduce((sum, bet) => sum + bet.payout, 0);
  const stake = settled.reduce((sum, bet) => sum + bet.amount, 0);
  return { ...result, payout, stake, count: settled.length, outcome: payout > 0 ? 'won' : 'lost' };
}

/** Queue result receipts behind other dialogs; never interrupt a prediction reveal. */
export function mountRoundResults(dialog, settings = {}) {
  dialog.innerHTML = resultMarkup;
  bindDialog(dialog);
  const page = dialog.ownerDocument;
  const $ = selector => dialog.querySelector(selector);
  const seconds = Math.max(1, Number(settings.autoCloseSeconds) || 3);
  const queue = [], seen = new Set();
  let current = null, timer, previous, remaining = seconds * 1000, destroyed = false;
  let automatic = settings.autoClose !== false;
  const checkbox = $('#resultAutoClose');
  checkbox.checked = automatic;

  function label() {
    $('#resultAutoLabel').textContent = `${Math.max(1, Math.ceil(remaining / 1000))} seconds auto close`;
  }
  function stopTimer() { clearInterval(timer); timer = undefined; }
  function startTimer() {
    stopTimer(); previous = Date.now();
    if (!automatic || !dialog.open) return;
    timer = setInterval(() => {
      const now = Date.now();
      if (!page.hidden) remaining -= now - previous;
      previous = now; label();
      if (remaining <= 0) { stopTimer(); dialog.close(); }
    }, 100);
  }
  function pump() {
    if (destroyed || current || !queue.length || page.querySelector('dialog[open]')) return;
    current = queue.shift();
    dialog.dataset.outcome = current.outcome;
    dialog.dataset.period = current.period;
    dialog.dataset.room = current.room;
    dialog.dataset.payout = current.payout;
    dialog.dataset.stake = current.stake;
    $('#resultTitle').textContent = current.outcome === 'won' ? 'Congratulations' : 'Sorry';
    $('#resultChips').replaceChildren(...[
      ...current.colors.map(color => ({ text: color, className: color.toLowerCase() })),
      { text: current.number, className: `number ${current.colors[0].toLowerCase()} ${current.colors.length > 1 ? 'dual' : ''}` },
      { text: current.size, className: current.size.toLowerCase() },
    ].map(({ text, className }) => {
      const span = page.createElement('span'); span.className = `lottery-tag ${className}`; span.textContent = text; return span;
    }));
    $('#resultBonusLabel').hidden = current.outcome !== 'won';
    $('#resultAmount').hidden = current.outcome !== 'won';
    $('#resultAmount').textContent = money(current.payout);
    $('#resultLoss').hidden = current.outcome === 'won';
    $('#resultPeriod').textContent = current.period;
    $('#resultRoom').textContent = `Period: WinGo ${roomLabel(current.room)}`;
    $('#resultReturn').textContent = `${money(current.payout)} returned · ${money(current.stake)} staked`;
    remaining = seconds * 1000; checkbox.checked = automatic; label();
    dialog.showModal(); startTimer();
  }
  function onClose(event) {
    if (event.target === dialog && !dialog.open) { stopTimer(); current = null; }
    queueMicrotask(pump);
  }
  function onToggle() { automatic = checkbox.checked; remaining = seconds * 1000; label(); startTimer(); }
  function visibilityChanged() { previous = Date.now(); }
  page.addEventListener('close', onClose, true);
  page.addEventListener('visibilitychange', visibilityChanged);
  checkbox.addEventListener('change', onToggle);
  return {
    enqueue(result, bets) {
      const row = summarizeRound(result, bets), key = `${result.room}:${result.period}`;
      if (!row || seen.has(key) || destroyed) return;
      seen.add(key); queue.push(row); pump();
    },
    destroy() {
      destroyed = true; stopTimer(); queue.length = 0;
      page.removeEventListener('close', onClose, true);
      page.removeEventListener('visibilitychange', visibilityChanged);
      checkbox.removeEventListener('change', onToggle);
      if (dialog.open) dialog.close();
    },
  };
}
