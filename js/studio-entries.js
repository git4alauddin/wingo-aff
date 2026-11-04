import { config } from './config.js';

export function configureStudioEntries() {
  document.querySelectorAll('[data-creator-link]').forEach(link => {
    link.hidden = !config.creatorStudio.enabled;
    const destination = new URL(config.creatorStudio.url, location.href);
    const platform = link.dataset.studioPlatform;
    destination.searchParams.set('platform', ['9k', 'dmplay'].includes(platform) ? platform : 'dmfirst');
    link.href = destination.href;
  });
  document.querySelectorAll('.studio-entries').forEach(group => { group.hidden = !config.creatorStudio.enabled; });
}
