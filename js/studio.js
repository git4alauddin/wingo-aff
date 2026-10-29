import { studioConfig } from './studio-config.js';
import { WinGoEngine, statistics } from './wingo-engine.js';
import { mountPrediction } from './prediction.js';
import { mountDraggableWidget } from './draggable-widget.js';
import { mountRoundResults } from './round-results.js';
import { mountBetHistory } from './bet-history.js';
import { ball, dots, money, numberText, roomLabel, bindDialog, toast } from './ui.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const gateForm = $('#studioGateForm');
let started = false;
gateForm.addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#studioPassword');
  if (started) return;
  if (!studioConfig.accessCode || input.value.trim() !== studioConfig.accessCode) {
    $('#studioGateError').textContent = input.value.trim() ? 'Incorrect password. Try again.' : 'Enter your creator password.';
    $('#studioGateError').hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return;
  }
  started = true; input.value = '';
  $('#studioApp').hidden = false; $('#studioApp').inert = false; $('#studioGate').hidden = true;
  startStudio(); $('#howTo').focus({ preventScroll: true });
});
$('#studioPassword').addEventListener('input', () => { $('#studioGateError').hidden = true; $('#studioPassword').setAttribute('aria-invalid', 'false'); });

function startStudio() {
  const engine = new WinGoEngine(studioConfig);
  let multiplier = 1, selection, betPeriod, tab = 'history', page = 0;
  let renderedPeriod, renderedNumber, renderedSecond, historyVersion, frame, previousTime = performance.now();
  let sound = false, audioContext;
  $$('.dialog:not(#resultDialog)').forEach(bindDialog);
  const roundResults = mountRoundResults($('#resultDialog'), studioConfig.resultPopup);
  const personalHistory = mountBetHistory($('#myHistory'));
  $('#simulationRibbon').textContent = studioConfig.disclaimer;
  $('#feeNote').textContent = `${studioConfig.serviceFee * 100}% service fee. Returns are calculated on the stake after this fee.`;
  $('#rulesFee').textContent = `This Studio applies a ${studioConfig.serviceFee * 100}% service fee to each stake. Multipliers include the returned stake and apply after the fee. Losing bets return zero.`;
  $('#betStake').min = studioConfig.minStake; $('#betStake').max = studioConfig.maxStake;
  $('#numberGrid').innerHTML = Array.from({ length: 10 }, (_, n) => `<button type="button" data-selection="number:${n}" aria-label="Bet on number ${n}">${ball(n)}</button>`).join('');
  const prediction = mountPrediction({
    launcher: $('#predictLauncher'), snapshot: () => engine.snapshot(), creator: true,
    beforeOpen() {
      if (engine.activeRoom !== 60) $('#room60').click();
    },
  });
  const draggable = mountDraggableWidget($('#predictLauncher'));

  function open(dialog) { if (!dialog.open && !document.querySelector('dialog[open]')) dialog.showModal(); }
  ['#howTo', '#support', '#announcementDetail'].forEach(selector => $(selector).addEventListener('click', () => open($('#rulesDialog'))));
  $('#deposit').addEventListener('click', () => open($('#creditsDialog')));
  $('#withdraw').addEventListener('click', () => toast('Studio uses virtual credits. Withdrawals are unavailable in the simulation.'));
  $('#refreshWallet').addEventListener('click', () => { renderWallet(); toast('Virtual balance is up to date.'); });
  $('#addCredits').addEventListener('click', () => { engine.balance += 100000; renderWallet(); $('#creditsDialog').close(); toast('₹1,000 virtual credits added.'); });
  $('#soundToggle').addEventListener('click', async () => {
    try {
      if (!audioContext) audioContext = new AudioContext();
      await audioContext.resume(); sound = !sound;
      $('#soundToggle').setAttribute('aria-pressed', sound);
      $('#soundToggle').setAttribute('aria-label', sound ? 'Turn game sound off' : 'Turn game sound on');
      if (sound) chime(); toast(sound ? 'Game sound on.' : 'Game sound off.');
    } catch { toast('Sound is unavailable in this browser.'); }
  });
  function chime() {
    if (!sound || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + .12);
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .25);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .26);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function activateTab(button, buttons) {
    buttons.forEach(item => { item.setAttribute('aria-selected', String(item === button)); item.tabIndex = item === button ? 0 : -1; });
  }
  function keyboardTabs(buttons) {
    buttons.forEach((button, index) => button.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null;
      if (target === null) return;
      event.preventDefault(); buttons[target].click(); buttons[target].focus();
    }));
  }
  const roomButtons = $$('[data-room]'); keyboardTabs(roomButtons);
  roomButtons.forEach(button => button.addEventListener('click', () => {
    advanceClock(); engine.switchRoom(Number(button.dataset.room));
    activateTab(button, roomButtons); $('#gameRound').setAttribute('aria-labelledby', button.id);
    page = 0; historyVersion = null; render(true);
  }));
  const historyButtons = $$('[data-tab]'); keyboardTabs(historyButtons);
  historyButtons.forEach(button => button.addEventListener('click', () => {
    tab = button.dataset.tab; page = 0; activateTab(button, historyButtons);
    $('#historyPanel').hidden = tab !== 'history'; $('#chartPanel').hidden = tab !== 'chart'; $('#myPanel').hidden = tab !== 'my';
    renderHistory();
  }));
  function pageCount() { return Math.max(1, Math.ceil((tab === 'my' ? engine.bets.filter(bet => bet.room === engine.activeRoom).length : engine.room.history.length) / 10)); }
  $('#previousPage').addEventListener('click', () => { page = Math.max(0, page - 1); renderHistory(); });
  $('#nextPage').addEventListener('click', () => { page = Math.min(pageCount() - 1, page + 1); renderHistory(); });
  $$('[data-multiplier]').forEach(button => button.addEventListener('click', () => {
    multiplier = Number(button.dataset.multiplier);
    $$('[data-multiplier]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  }));
  $$('[data-selection]').forEach(button => button.addEventListener('click', () => {
    const [type, value] = button.dataset.selection.split(':');
    beginBet({ type, value: type === 'number' ? Number(value) : value });
  }));
  $('#randomBet').addEventListener('click', () => beginBet({ type: 'number', value: Math.floor(Math.random() * 10) }));
  function beginBet(nextSelection) {
    advanceClock(); render();
    if (document.querySelector('dialog[open]')) return;
    const state = engine.snapshot();
    if (state.locked) return toast('This round is locked. Wait for the next period.');
    selection = nextSelection; betPeriod = state.period;
    $('#betTitle').textContent = `Select ${selection.value}`;
    $('#betPeriod').textContent = `WIN GO ${roomLabel(state.seconds).toUpperCase()} · ${betPeriod}`;
    $('#betStake').value = studioConfig.defaultStake; $('#betMultiplier').value = multiplier;
    $('#betError').hidden = true; $('#betStake').setAttribute('aria-invalid', 'false'); $('#confirmBet').disabled = false;
    updateBetTotal(); open($('#betDialog')); $('#betStake').focus();
  }
  function updateBetTotal() {
    const stake = Number($('#betStake').value), factor = Number($('#betMultiplier').value);
    $('#betTotal').textContent = money(Number.isFinite(stake) && stake >= 0 ? Math.round(stake * 100) * factor : 0);
  }
  $('#betStake').addEventListener('input', updateBetTotal); $('#betMultiplier').addEventListener('change', updateBetTotal);
  $$('[data-stake]').forEach(button => button.addEventListener('click', () => { $('#betStake').value = button.dataset.stake; updateBetTotal(); }));
  $('#betForm').addEventListener('submit', event => {
    event.preventDefault(); advanceClock();
    try {
      engine.placeBet(selection, Number($('#betStake').value), Number($('#betMultiplier').value), betPeriod);
      $('#betDialog').close(); renderWallet(); renderHistory(); toast(`Virtual bet placed on ${selection.value}.`);
    } catch (error) { $('#betError').textContent = error.message; $('#betError').hidden = false; $('#betStake').setAttribute('aria-invalid', 'true'); }
  });
  function renderWallet() { $('#wallet').textContent = money(engine.balance); }
  function render(force = false) {
    const state = engine.snapshot();
    if (force || renderedPeriod !== state.period || renderedNumber !== state.result.number) {
      $('#period').textContent = state.period;
      $('#gameRoomName').textContent = `WinGo ${roomLabel(state.seconds)}`;
      $('#recentBalls').innerHTML = state.history.slice(0, 5).map(row => ball(row.number, 'ball-small')).join('');
      prediction.update();
      if (renderedPeriod && renderedPeriod !== state.period) page = 0;
      renderedPeriod = state.period; renderedNumber = state.result.number;
    }
    if (force || renderedSecond !== state.remaining) {
      const time = `${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}`;
      $('#countdown').innerHTML = [...time].map(character => `<span${character === ':' ? ' class="colon"' : ''}>${character}</span>`).join('');
      $('#countdown').setAttribute('aria-label', `${state.remaining} seconds remaining${state.paused ? ', paused' : ''}`);
      $('#countdown').classList.toggle('urgent', state.locked);
      $('#timerCaption').textContent = state.paused ? 'Paused' : 'Time remaining';
      const phase = state.paused ? 'Simulation paused' : state.locked ? 'Betting closed · Result in a moment' : 'Betting open';
      $('#roundState').textContent = phase;
      $('#bettingLock').hidden = !state.locked; $('#lockCountdown').textContent = state.remaining;
      $$('[data-selection],#randomBet').forEach(button => { button.disabled = state.locked; });
      if ($('#betDialog').open) {
        const stale = betPeriod !== state.period;
        $('#confirmBet').disabled = stale || state.locked;
        if (stale || state.locked) { $('#betError').textContent = stale ? 'The round changed. Close this window and select again.' : 'Betting has closed for this round.'; $('#betError').hidden = false; }
      }
      renderedSecond = state.remaining;
    }
    const version = `${state.seconds}:${state.history[0].period}:${engine.bets.length}`;
    if (force || version !== historyVersion) { renderWallet(); renderHistory(); historyVersion = version; }
  }
  function renderHistory() {
    const state = engine.snapshot();
    page = Math.min(page, pageCount() - 1);
    const rows = state.history.slice(page * 10, page * 10 + 10);
    $('#historyRows').innerHTML = rows.map(row => `<tr><td>${row.period}</td><td>${numberText(row.number)}</td><td>${row.size}</td><td>${dots(row.colors)}</td></tr>`).join('');
    if (tab === 'chart') {
      const stats = statistics(state.history);
      const labels = [['Winning Numbers', 'number'], ['Missing', 'missing'], ['Avg missing', 'average'], ['Frequency', 'frequency'], ['Max consecutive', 'maxConsecutive']];
      $('#statistics').innerHTML = labels.map(([label, property]) => `<div class="stat-row"><span>${label}</span><div class="stat-digits">${stats.map(item => `<span${property === 'number' ? ' class="winning-digit"' : ''}>${item[property]}</span>`).join('')}</div></div>`).join('');
      $('#chartRows').innerHTML = rows.map(row => `<div class="chart-row"><span>${row.period}</span><div class="chart-digits">${Array.from({ length: 10 }, (_, number) => `<span class="chart-digit ${number === row.number ? `selected ${row.colors[0].toLowerCase()} ${row.colors.length > 1 ? 'dual' : ''}` : ''}">${number}</span>`).join('')}</div><span class="size-circle ${row.size.toLowerCase()}" aria-label="${row.size}">${row.size[0]}</span></div>`).join('');
      requestAnimationFrame(drawChart);
    }
    if (tab === 'my') {
      const bets = engine.bets.filter(bet => bet.room === state.seconds).slice(page * 10, page * 10 + 10);
      personalHistory.render(bets);
    }
    $('#pageLabel').textContent = `${page + 1}/${pageCount()}`;
    $('#previousPage').disabled = page === 0; $('#nextPage').disabled = page >= pageCount() - 1;
  }
  function drawChart() {
    if (tab !== 'chart' || $('#chartPanel').hidden) return;
    const container = $('#chartRows'), rect = container.getBoundingClientRect();
    if (!rect.width) return;
    container.querySelector('.chart-lines')?.remove();
    const points = [...container.querySelectorAll('.chart-digit.selected')].map(item => {
      const bounds = item.getBoundingClientRect(); return `${bounds.left + bounds.width / 2 - rect.left},${bounds.top + bounds.height / 2 - rect.top}`;
    }).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'chart-lines'); svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`); svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points); line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#f55c6b'); line.setAttribute('stroke-width', '1'); svg.append(line); container.prepend(svg);
  }
  function showCompleted(completed) {
    if (!completed.length) return;
    const result = completed.find(row => row.room === engine.activeRoom);
    renderWallet();
    completed.forEach(row => roundResults.enqueue(row, engine.bets));
    if (!result) return;
    chime();
    const bets = engine.bets.filter(bet => bet.period === result.period && bet.room === result.room);
    if (!bets.length) toast(`Result ${result.number} · ${result.size} · ${result.colors.join(' + ')}`);
  }
  function advanceClock() {
    const now = performance.now();
    const completed = engine.tick(Math.max(0, now - previousTime)); previousTime = now;
    showCompleted(completed);
  }
  let lastPaint = 0;
  function animate(now) {
    if (now - lastPaint >= 100) { advanceClock(); render(); lastPaint = now; }
    frame = requestAnimationFrame(animate);
  }
  render(true); frame = requestAnimationFrame(animate);
  window.addEventListener('resize', drawChart);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { advanceClock(); render(true); } });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); prediction.destroy(); draggable.destroy(); roundResults.destroy(); personalHistory.destroy(); audioContext?.close(); }, { once: true });
}
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
