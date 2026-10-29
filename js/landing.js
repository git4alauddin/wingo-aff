import { config } from './config.js';
import { playAccessSequence, startCodeRain } from './animations.js';

const $ = selector => document.querySelector(selector);
const root = document.documentElement;
const preview = new URLSearchParams(location.search).get('preview') === '1';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const steps = [...document.querySelectorAll('[data-console-step]')];
const tiles = [...document.querySelectorAll('[data-status-tile]')];
const stepThresholds = [0, 18, 36, 55, 74, 92];
const tileThresholds = [16, 38, 65, 100];
const tileLabels = ['LOADED', 'ATTACHED', 'PREPARED', 'OPEN'];
let lastState = { progress: 0, stage: 'locked' }, lastProgress = -1;
let stopRain = () => {}, navigationFrame;

$('#preview-notice').hidden = !preview;
$('[data-year]').textContent = new Date().getFullYear();
document.querySelectorAll('[data-wrapper-link]').forEach(link => { link.href = config.registrationPage; });
document.querySelectorAll('[data-creator-link]').forEach(link => { link.hidden = !config.creatorStudio.enabled; link.href = config.creatorStudio.url; });

function updateClock() {
  const now = new Date();
  $('[data-clock]').textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  $('[data-clock]').dateTime = now.toISOString();
}
updateClock();
const clockTimer = setInterval(() => { if (!document.hidden) updateClock(); }, 1000);

function render(state) {
  const { progress, stage } = state;
  lastState = state;
  root.dataset.stage = stage;
  root.style.setProperty('--progress', `${progress}%`);
  root.style.setProperty('--progress-number', progress);
  $('[data-progress-value]').textContent = progress;
  $('[role="progressbar"]').setAttribute('aria-valuenow', progress);

  if (progress !== lastProgress) {
    const active = stepThresholds.findLastIndex(threshold => progress >= threshold);
    steps.forEach((step, index) => {
      const complete = index < active || progress === 100;
      step.classList.toggle('is-visible', index <= active);
      step.classList.toggle('is-current', index === active && !complete);
      step.classList.toggle('is-done', complete);
      const copy = step.querySelector('[data-line]');
      const span = (stepThresholds[index + 1] ?? 101) - stepThresholds[index];
      const fraction = motion.matches || complete ? 1 : Math.min(1, (progress - stepThresholds[index] + 3) / span);
      copy.textContent = index <= active ? copy.dataset.line.slice(0, Math.ceil(copy.dataset.line.length * fraction)) : '';
    });
    const activeTile = tileThresholds.findIndex(threshold => progress < threshold);
    tiles.forEach((tile, index) => {
      const complete = progress >= tileThresholds[index];
      tile.classList.toggle('is-complete', complete);
      tile.classList.toggle('is-active', index === activeTile);
      tile.querySelector('[data-tile-label]').textContent = complete ? tileLabels[index] : index === 3 ? 'LOCKED' : index === 0 ? 'LOADING' : 'STANDBY';
    });
    $('[data-diagnostic]').textContent = `0x${(progress * 631).toString(16).padStart(4, '0').toUpperCase()}`;
    lastProgress = progress;
  }

  // Decorative interface preview only; it does not expose or predict a game round.
  const digits = [2, 9, 1, 6, 7, 3, 8];
  const number = progress === 100 || motion.matches ? 7 : digits[Math.floor(progress / 7) % digits.length];
  const green = number % 2 === 1;
  const ball = $('[data-hero-ball] .ball');
  ball.classList.toggle('ball-green', green); ball.classList.toggle('ball-red', !green);
  $('[data-scene-digit]').textContent = number;
  $('[data-number-code]').textContent = String(number).padStart(3, '0');
  $('[data-sample-number]').textContent = String(number).padStart(2, '0');
  $('[data-sample-color]').textContent = green ? 'GREEN' : 'RED';
  $('[data-sample-size]').textContent = number >= 5 ? 'BIG' : 'SMALL';

  const ready = progress === 100;
  $('[data-terminal-title]').textContent = ready ? 'Access ready' : 'Preparing access';
  $('[data-progress-label]').textContent = ready ? 'YOUR INTERFACE IS READY' : 'PREPARING YOUR INTERFACE';
  $('[data-access-status]').textContent = ready ? 'READY' : 'PREPARING';
  $('[data-console-state]').textContent = ready ? 'COMPLETE' : 'INITIALIZING';
  $('[data-module-status]').textContent = ready ? 'MODULE READY' : 'STANDBY';
  $('[data-scene-phase]').textContent = ready ? 'INTERFACE READY' : progress < 38 ? 'LOADING VISUALS' : progress < 74 ? 'MAPPING INTERFACE' : 'FINAL CHECK';
}

function updateMotion() {
  stopRain();
  root.dataset.motion = motion.matches ? 'reduced' : 'full';
  if (!motion.matches) stopRain = startCodeRain($('#code-rain'), {
    background: '#031711', colors: ['#247951', '#ac9552'], symbols: '0123456789<>/{}WG',
  });
  lastProgress = -1; render(lastState);
}
updateMotion();
motion.addEventListener('change', updateMotion);

const stopSequence = playAccessSequence({
  timing: config.sequence,
  onUpdate: render,
  onComplete() {
    root.dataset.finished = 'true';
    $('[data-redirect-status]').textContent = preview ? 'Access ready. Continue below.' : 'Opening DmFirst registration…';
    $('#sequence-announcement').textContent = preview ? 'WinGo access preview complete. Registration is available below.' : 'Access ready. Opening DmFirst registration.';
    if (!preview) navigationFrame = requestAnimationFrame(() => {
      navigationFrame = requestAnimationFrame(() => { location.replace(config.registrationPage); });
    });
  },
});

window.addEventListener('pagehide', () => {
  stopSequence(); stopRain(); clearInterval(clockTimer); cancelAnimationFrame(navigationFrame);
  motion.removeEventListener('change', updateMotion);
}, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
