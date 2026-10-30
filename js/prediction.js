import { predictionConfig, getPredictionText } from './prediction-config.js';
import { predictionMarkup } from './prediction-markup.js';
import { mountPredictionReels } from './prediction-reels.js';
import { settlementForNumber } from './prediction-model.js';
import { playAccessSequence } from './animations.js';
import { bindDialog } from './ui.js';

/** Shared DM-first 1-minute prediction UI. Studio supplies its own round snapshot. */
export function mountPrediction({ launcher, snapshot, creator = false, beforePredict = () => {}, beforeOpen = () => {} }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'predictionDialog';
  dialog.className = 'dialog prediction-dialog';
  dialog.innerHTML = predictionMarkup;
  document.body.append(dialog);
  bindDialog(dialog);
  const $ = selector => dialog.querySelector(selector);
  const text = getPredictionText();
  dialog.querySelectorAll('[data-prediction-text]').forEach(element => {
    element.textContent = text[element.dataset.predictionText] ?? '';
  });
  $('[data-prediction-heading]').textContent = predictionConfig.gameName;
  $('[data-prediction-admin-text]').textContent = predictionConfig.adminContact.text;
  const code = predictionConfig.accessCode?.trim();
  let unlocked = creator, phase = creator ? 'ready' : 'entry', destroyed = false;
  let displayedKey, runId = 0, cancelUnlock = () => {};
  const key = state => `${state.seconds}:${state.period}:${creator ? state.result.number : state.settlement.numbers.join(',')}`;
  const reels = mountPredictionReels(dialog, predictionConfig, Math.random, {
    ...(creator ? { selectVisibleNumber: () => snapshot().result.number } : {}),
    selectSettlement() {
      beforePredict(); update();
      const state = snapshot();
      return state.seconds === 60 ? creator ? settlementForNumber(state.result.number) : state.settlement : null;
    },
  });

  function setProgress(progress) {
    $('[data-prediction-progressbar]').style.setProperty('--unlock-progress', `${progress}%`);
    $('[data-prediction-progressbar]').setAttribute('aria-valuenow', progress);
    $('[data-prediction-percent]').textContent = `${progress}%`;
  }
  function resetReels() {
    reels.reset();
    if (unlocked && snapshot().seconds === 60) reels.enable();
  }
  function update() {
    if (destroyed) return;
    const state = snapshot();
    if (displayedKey !== key(state)) { if (creator) resetReels(); displayedKey = key(state); }
    $('#predictPeriod').textContent = `${creator ? 'Period' : 'Preview'} ${state.period}`;
    if (state.seconds !== 60) {
      reels.reset();
      $('#predictStatus').textContent = 'Select WinGo 1 Min to use this prediction preview.';
    }
  }
  function showReady() {
    phase = 'ready';
    dialog.classList.remove('gate-card');
    dialog.dataset.accessState = 'ready';
    dialog.setAttribute('aria-labelledby', 'predictionTitle');
    dialog.setAttribute('aria-describedby', 'prediction-preview-note');
    $('#predictAccess').hidden = true; $('#predictPreview').hidden = false;
    resetReels(); update();
    $('#predictionTitle').focus();
  }
  function resetGate() {
    cancelUnlock(); runId++;
    unlocked = creator;
    dialog.classList.toggle('gate-card', !creator);
    reels.reset();
    $('#predictCode').value = '';
    $('#predictCode').setAttribute('aria-invalid', 'false');
    $('#predictCodeError').hidden = Boolean(code);
    $('#predictCodeError').textContent = code ? '' : text.unavailableError;
    $('#predictCodeForm').hidden = false;
    $('#predictAdmin').hidden = true;
    $('[data-prediction-unlock-progress]').hidden = true;
    $('[data-prediction-unlock-label]').textContent = text.unlockButton;
    $('#predictUnlock').disabled = !code;
    $('#predictAccessTitle').textContent = text.entryTitle;
    $('#predictAccessHelp').textContent = text.entryHelp;
    setProgress(0);
    if (creator) { showReady(); return; }
    phase = 'entry'; dialog.dataset.accessState = 'entry';
    dialog.setAttribute('aria-labelledby', 'predictAccessTitle');
    dialog.setAttribute('aria-describedby', 'predictAccessHelp');
    $('#predictAccess').hidden = false; $('#predictPreview').hidden = true;
  }
  function open() {
    if (destroyed || dialog.open || document.querySelector('dialog[open]')) return;
    beforeOpen();
    if (document.querySelector('dialog[open]')) return;
    resetGate(); update();
    dialog.showModal(); launcher.setAttribute('aria-expanded', 'true');
    (creator ? $('#predictionTitle') : $('#predictCode')).focus();
  }
  function clearError() {
    if (phase !== 'entry' || !code) return;
    $('#predictCodeError').hidden = true; $('#predictAdmin').hidden = true;
    $('#predictCode').setAttribute('aria-invalid', 'false');
    dialog.dataset.accessState = 'entry';
    $('#predictAccessTitle').textContent = text.entryTitle;
    $('#predictAccessHelp').textContent = text.entryHelp;
    $('[data-prediction-unlock-label]').textContent = text.unlockButton;
  }
  function unlock(event) {
    event.preventDefault();
    if (destroyed || !dialog.open || phase !== 'entry' || !code) return;
    const entered = $('#predictCode').value.trim();
    if (!entered) {
      $('#predictCodeError').textContent = text.requiredCodeError; $('#predictCodeError').hidden = false;
      $('#predictCode').setAttribute('aria-invalid', 'true'); $('#predictCode').focus(); return;
    }
    const matches = entered === code, run = ++runId;
    phase = 'opening'; dialog.dataset.accessState = 'opening';
    $('#predictCode').value = ''; $('#predictCode').setAttribute('aria-invalid', 'false');
    $('#predictCodeError').hidden = true; $('#predictAdmin').hidden = true; $('#predictCodeForm').hidden = true;
    $('[data-prediction-unlock-progress]').hidden = false;
    $('[data-prediction-progress-label]').textContent = text.checkingProgress;
    $('#predictAccessTitle').textContent = text.checkingTitle;
    $('#predictAccessHelp').textContent = text.checkingHelp;
    $('#predictAccessTitle').focus();
    cancelUnlock = playAccessSequence({
      timing: { fillMs: predictionConfig.unlockDurationMs, holdMs: predictionConfig.unlockHoldMs, unlockMs: 0 },
      onUpdate({ progress }) { if (!destroyed && run === runId) setProgress(progress); },
      onComplete() {
        if (destroyed || run !== runId || !dialog.open) return;
        if (matches) { unlocked = true; showReady(); return; }
        phase = 'entry'; dialog.dataset.accessState = 'failed';
        $('#predictAccessTitle').textContent = text.deniedTitle; $('#predictAccessHelp').textContent = text.deniedHelp;
        $('[data-prediction-unlock-progress]').hidden = true; $('#predictCodeForm').hidden = false;
        $('#predictCodeError').textContent = text.invalidCodeError; $('#predictCodeError').hidden = false;
        $('#predictAdmin').hidden = false; $('#predictCode').setAttribute('aria-invalid', 'true');
        $('[data-prediction-unlock-label]').textContent = text.retryButton; $('#predictCode').focus();
      },
    });
  }
  function closed() {
    if (dialog.open) return;
    cancelUnlock(); runId++; reels.reset();
    launcher.setAttribute('aria-expanded', 'false');
    if (!destroyed) launcher.focus({ preventScroll: true });
  }
  $('#predictCodeForm').addEventListener('submit', unlock);
  $('#predictCode').addEventListener('input', clearError);
  dialog.addEventListener('close', closed);
  launcher.hidden = !predictionConfig.enabled;
  launcher.addEventListener('click', open);
  return {
    update, close: () => dialog.close(),
    destroy() {
      destroyed = true; cancelUnlock(); runId++; reels.destroy();
      launcher.removeEventListener('click', open);
      launcher.setAttribute('aria-expanded', 'false'); dialog.remove();
    },
  };
}
