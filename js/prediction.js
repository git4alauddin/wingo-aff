import { predictionConfig } from './config.js';
import { resultFor } from './wingo-engine.js';
import { ball, bindDialog, roomLabel } from './ui.js';

// snapshot() is either a local visitor preset or the creator's simulated round.
// It never reads the third-party iframe or requests live game results.
export function mountPrediction({ launcher, snapshot, creator = false, beforePredict = () => {} }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'predictionDialog';
  dialog.className = 'dialog prediction-dialog';
  dialog.setAttribute('aria-labelledby', 'predictionTitle');
  dialog.innerHTML = `<header class="dialog-head"><span>DM FIRST <span class="muted">/</span> WIN GO</span><button type="button" class="icon-button" data-close aria-label="Close prediction">×</button></header>
  <div class="dialog-body"><div class="prediction-eyebrow"><span class="live-dot"></span> ${creator ? 'STUDIO PREDICTION' : 'PREDICTION PREVIEW'}</div><h2 id="predictionTitle" tabindex="-1">${creator ? 'WinGo prediction' : 'Enter access code'}</h2>
  <section id="predictAccess"><p class="muted">Enter your code to open the WinGo prediction preview.</p><form id="predictCodeForm" novalidate><label for="predictCode">Access code</label><input id="predictCode" type="password" required maxlength="128" autocomplete="off" spellcheck="false" aria-describedby="predictCodeError"><p class="error" id="predictCodeError" role="alert" hidden></p><button class="primary" type="submit" id="predictUnlock">Unlock preview ↗</button></form><p class="admin-contact" id="predictAdmin" hidden>Contact Admin · <span></span></p></section>
  <section id="predictPreview" hidden><div class="prediction-period"><span id="predictMode"></span><strong id="predictPeriod"></strong></div><div class="prediction-stage" id="predictResult" aria-busy="false"><div class="prediction-orbit" aria-hidden="true"></div><div id="predictBall">${ball(7, 'ball-large')}</div><div class="scan-line" aria-hidden="true"></div><span id="predictStageLabel">READY TO REVEAL</span></div><div class="prediction-values"><div><span>NUMBER</span><strong id="predictNumber">—</strong></div><div><span>BIG / SMALL</span><strong id="predictSize">—</strong></div><div><span>COLOR</span><strong id="predictColor">—</strong></div></div><button class="primary" type="button" id="predictRun">Predict</button><p class="prediction-status" id="predictStatus" role="status">Select Predict to reveal this demo round.</p></section><p class="dialog-note">Preset simulation · No live game data</p></div>`;
  document.body.append(dialog);
  bindDialog(dialog);
  const select = selector => dialog.querySelector(selector);
  let unlocked = creator, timer, displayedKey, revealedKey, generation = 0;
  const key = state => `${state.seconds}:${state.period}:${state.result.number}`;
  function reset() {
    clearTimeout(timer); timer = undefined; generation++;
    select('#predictResult').classList.remove('scanning', 'revealed');
    select('#predictResult').setAttribute('aria-busy', 'false');
    select('#predictNumber').textContent = '—';
    select('#predictSize').textContent = '—';
    select('#predictColor').textContent = '—';
    select('#predictStageLabel').textContent = 'READY TO REVEAL';
    select('#predictRun').disabled = false;
    select('#predictRun').textContent = 'Predict';
    select('#predictStatus').textContent = 'Select Predict to reveal this demo round.';
    revealedKey = undefined;
  }
  function update() {
    const state = snapshot();
    if (displayedKey !== key(state)) { reset(); displayedKey = key(state); }
    select('#predictPeriod').textContent = state.period;
    select('#predictMode').textContent = `WinGo ${roomLabel(state.seconds)}`;
  }
  function open() {
    update();
    select('#predictAccess').hidden = unlocked;
    select('#predictPreview').hidden = !unlocked;
    select('#predictionTitle').textContent = unlocked ? 'WinGo prediction' : 'Enter access code';
    select('#predictCodeError').hidden = true;
    select('#predictCode').setAttribute('aria-invalid', 'false');
    if (!dialog.open) dialog.showModal();
    launcher.setAttribute('aria-expanded', 'true');
    (unlocked ? select('#predictionTitle') : select('#predictCode')).focus();
  }
  select('#predictCodeForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = select('#predictCode');
    if (input.value.trim() !== predictionConfig.accessCode || !predictionConfig.accessCode) {
      select('#predictCodeError').textContent = input.value.trim() ? 'That code doesn’t match. Try again.' : 'Enter your access code.';
      select('#predictCodeError').hidden = false;
      input.setAttribute('aria-invalid', 'true');
      select('#predictAdmin').hidden = false;
      select('#predictAdmin span').textContent = predictionConfig.adminContact;
      input.focus(); return;
    }
    unlocked = true; input.value = ''; open();
  });
  select('#predictCode').addEventListener('input', () => { select('#predictCodeError').hidden = true; select('#predictCode').setAttribute('aria-invalid', 'false'); });
  select('#predictRun').addEventListener('click', () => {
    beforePredict(); update();
    const state = snapshot(), currentKey = key(state);
    if (creator && revealedKey === currentKey) return;
    reset();
    const token = generation;
    select('#predictResult').classList.add('scanning');
    select('#predictResult').setAttribute('aria-busy', 'true');
    select('#predictStageLabel').textContent = 'READING PRESET';
    select('#predictRun').disabled = true;
    select('#predictStatus').textContent = 'Revealing the local simulation result…';
    const reveal = () => {
      if (!dialog.open || token !== generation || key(snapshot()) !== currentKey) return;
      const result = resultFor(state.result.number);
      select('#predictBall').innerHTML = ball(result.number, 'ball-large');
      select('#predictResult').classList.remove('scanning'); select('#predictResult').classList.add('revealed');
      select('#predictResult').setAttribute('aria-busy', 'false');
      select('#predictStageLabel').textContent = 'PREVIEW READY';
      select('#predictNumber').textContent = result.number;
      select('#predictSize').textContent = result.size;
      select('#predictColor').textContent = result.colors.join(' + ');
      select('#predictColor').style.color = result.colors.length > 1 ? '#d7a1ff' : result.colors[0] === 'Green' ? '#64e6a4' : '#ff8f98';
      select('#predictStatus').textContent = `${result.number} · ${result.size} · ${result.colors.join(' + ')}. ${creator ? 'Matches this Studio period.' : 'Local preset preview.'}`;
      select('#predictRun').textContent = creator ? 'Revealed for this period' : 'Predict again';
      select('#predictRun').disabled = creator;
      revealedKey = currentKey;
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) reveal();
    else timer = setTimeout(reveal, predictionConfig.revealDurationMs);
  });
  dialog.addEventListener('close', () => { if (select('#predictResult').classList.contains('scanning')) reset(); launcher.setAttribute('aria-expanded', 'false'); });
  launcher.hidden = !predictionConfig.enabled;
  launcher.addEventListener('click', open);
  return { update, close: () => dialog.close(), destroy() { clearTimeout(timer); launcher.removeEventListener('click', open); dialog.remove(); } };
}
