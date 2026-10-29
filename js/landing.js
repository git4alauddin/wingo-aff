import { config } from './config.js';
import { playAccessSequence } from './animations.js';
const preview = new URLSearchParams(location.search).get('preview') === '1';
document.querySelector('#preview-notice').hidden = !preview;
const stop = playAccessSequence({ timing: config.sequence, onUpdate({ progress }) {
  document.querySelector('[data-progress-value]').textContent = progress;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', progress);
  document.querySelector('.access-track span').style.width = `${progress}%`;
  if (progress === 100) {
    document.querySelector('[data-progress-label]').textContent = 'Your access is ready';
    document.querySelector('[data-access-status]').textContent = 'READY';
  }
}, onComplete() {
  document.querySelector('[data-redirect-status]').textContent = preview ? 'Ready. Continue when you are.' : 'Opening DmFirst registration…';
  if (!preview) location.replace(config.registrationPage);
} });
window.addEventListener('pagehide', stop, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
