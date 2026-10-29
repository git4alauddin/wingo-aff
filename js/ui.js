import { resultFor } from './wingo-engine.js';
export const money = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(paise / 100);
export const roomLabel = seconds => seconds === 30 ? '30 sec' : `${seconds / 60} Min`;
export function ball(number, extra = '') {
  const { colors } = resultFor(number);
  return `<span class="ball ball-${colors[0].toLowerCase()} ${colors.length > 1 ? 'ball-dual' : ''} ${extra}" aria-label="Number ${number}, ${colors.join(' and ')}"><b>${number}</b></span>`;
}
export function numberText(number) {
  const result = resultFor(number);
  return `<span class="result-number ${result.colors[0].toLowerCase()} ${result.colors.length > 1 ? 'dual' : ''}" style="--number-color:${number === 5 ? '#24c080' : '#ff5a65'}">${number}</span>`;
}
export function dots(colors) { return `<span class="color-dots" aria-label="${colors.join(' and ')}">${colors.map(color => `<i class="color-dot ${color.toLowerCase()}" aria-hidden="true"></i>`).join('')}</span>`; }
export function bindDialog(dialog) {
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
let toastTimer;
export function toast(text, { variant = '', duration = 3500 } = {}) {
  const element = document.querySelector('#toast');
  if (!element) return;
  clearTimeout(toastTimer);
  element.dataset.variant = variant;
  element.textContent = text;
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, duration);
}
