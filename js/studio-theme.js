// Each entry URL chooses its own palette before styles load.
(() => {
  const root = document.documentElement;
  const club = new URLSearchParams(location.search).get('platform') === '9k';
  root.dataset.studioTheme = club ? '9k' : 'original';
  root.dataset.studioPlatform = club ? '9k' : 'dmfirst';
  if (!club) return;
  document.title = '9K Club × WinGo — Creator Studio';
  document.querySelector('meta[name="theme-color"]').content = '#e96a21';
  document.querySelector('meta[name="description"]').content = '9K Club WinGo Creator Studio with virtual betting and preset rounds.';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('link[rel="icon"]').href = 'assets/images/favicon-9k.svg';
    document.querySelectorAll('img[alt="DmFirst"]').forEach(image => {
      image.src = 'assets/images/brand-9k.svg'; image.alt = '9K Club';
    });
    document.querySelector('#studioGate .auth-title').textContent = '9K Club Studio';
    document.querySelector('#studioGate .eyebrow').textContent = '9K CLUB · CREATOR ACCESS';
    document.querySelector('#rulesDialog .dialog-head>span').textContent = '9K CLUB / WIN GO';
    document.querySelector('#creditsDialog .dialog-head>span').textContent = '9K CLUB / VIRTUAL WALLET';
    document.querySelector('.game-shell').setAttribute('aria-label', '9K Club WinGo gameplay simulation');
    document.querySelector('#predictLauncher').setAttribute('aria-label', 'Open 9K Club Studio prediction');
  }, { once: true });
})();
