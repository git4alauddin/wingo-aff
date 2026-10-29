import { config, predictionConfig } from './config.js';
import { mountRegistrationFlow } from './registration-flow.js';
import { mountRegistrationAudio } from './registration-audio.js';
import { mountDraggableWidget } from './draggable-widget.js';
import { mountPrediction } from './prediction.js';
import { resultFor } from './wingo-engine.js';
document.querySelector('[data-creator-link]').hidden = !config.creatorStudio.enabled;
document.querySelector('[data-creator-link]').href = config.creatorStudio.url;
let guidance = { destroy() {} };
if (config.guidance.enabled && config.guidance.src) {
  document.querySelector('[data-registration-audio]').src = config.guidance.src;
  guidance = mountRegistrationAudio(document);
}
const flow = mountRegistrationFlow(document);
let index = -1;
const prediction = mountPrediction({
  launcher: document.querySelector('#predictLauncher'),
  snapshot: () => ({ seconds: 60, period: `DEMO-${String(Math.max(0, index) + 1).padStart(5, '0')}`, result: resultFor(predictionConfig.outcomes[Math.max(0, index) % predictionConfig.outcomes.length]) }),
  beforePredict() { index++; },
});
const draggable = ['[data-deposit-widget]', '#predictLauncher'].map(selector => mountDraggableWidget(document.querySelector(selector)));
window.addEventListener('pagehide', () => { prediction.destroy(); flow.destroy(); guidance.destroy(); draggable.forEach(widget => widget.destroy()); }, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
