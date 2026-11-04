// Each entry URL chooses its own palette before styles load.
(() => {
  const root = document.documentElement;
  const platform = new URLSearchParams(location.search).get('platform');
  const brands = {
    '9k': { name: '9K Club', label: '9K CLUB', color: '#e96a21', logo: 'assets/images/brand-9k.svg', icon: 'assets/images/favicon-9k.svg' },
    dmplay: { name: 'DmPlay', label: 'DMPLAY', color: '#ff6549', logo: 'assets/images/brand-dmplay.png', icon: 'assets/images/brand-dmplay.png' },
  };
  const brand = Object.hasOwn(brands, platform) ? brands[platform] : null;
  root.dataset.studioTheme = brand ? platform : 'original';
  root.dataset.studioPlatform = brand ? platform : 'dmfirst';
  if (!brand) return;
  document.title = `${brand.name} × WinGo — Creator Studio`;
  document.querySelector('meta[name="theme-color"]').content = brand.color;
  document.querySelector('meta[name="description"]').content = `${brand.name} WinGo Creator Studio with virtual betting and preset rounds.`;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('link[rel="icon"]').href = brand.icon;
    document.querySelectorAll('img[alt="DmFirst"]').forEach(image => {
      image.src = brand.logo; image.alt = brand.name;
    });
    document.querySelector('#studioGate .auth-title').textContent = `${brand.name} Studio`;
    document.querySelector('#studioGate .eyebrow').textContent = `${brand.label} · CREATOR ACCESS`;
    document.querySelector('#rulesDialog .dialog-head>span').textContent = `${brand.label} / WIN GO`;
    document.querySelector('#creditsDialog .dialog-head>span').textContent = `${brand.label} / VIRTUAL WALLET`;
    document.querySelector('.game-shell').setAttribute('aria-label', `${brand.name} WinGo gameplay simulation`);
    document.querySelector('#predictLauncher').setAttribute('aria-label', `Open ${brand.name} Studio prediction`);
    if (platform === 'dmplay') document.querySelector('.wallet-caption span').textContent = 'Wallet balance';
  }, { once: true });
})();
