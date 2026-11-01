import { config } from './config.js';

export function configureStudioEntries() {
  document.querySelectorAll('[data-creator-link]').forEach(link => {
    link.hidden = !config.creatorStudio.enabled;
    const destination = new URL(config.creatorStudio.url, location.href);
    destination.searchParams.set('platform', link.dataset.studioPlatform === '9k' ? '9k' : 'dmfirst');
    link.href = destination.href;
  });
  document.querySelectorAll('.studio-entries').forEach(group => { group.hidden = !config.creatorStudio.enabled; });
}
