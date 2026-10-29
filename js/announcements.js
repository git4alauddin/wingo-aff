// Rotate the two notices independently of the simulated round clock.
export function mountAnnouncements(element, messages, interval = 4000) {
  const page = element.ownerDocument;
  const motion = page.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
  const track = page.createElement('span');
  track.className = 'announcement-track';
  const current = page.createElement('span');
  const next = page.createElement('span');
  next.setAttribute('aria-hidden', 'true');
  track.append(current, next);
  element.replaceChildren(track);
  let index = 0, animation, destroyed = false;
  current.textContent = messages[index];
  element.title = messages[index];

  const timer = setInterval(async () => {
    if (page.hidden || animation || destroyed || messages.length < 2) return;
    const nextIndex = (index + 1) % messages.length;
    next.textContent = messages[nextIndex];
    if (!motion.matches) {
      animation = track.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-50%)' },
      ], { duration: 450, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      try { await animation.finished; } catch { return; }
      if (destroyed) return;
    }
    index = nextIndex;
    current.textContent = messages[index];
    element.title = messages[index];
    next.textContent = '';
    animation?.cancel();
    animation = null;
  }, interval);

  return { destroy() { destroyed = true; clearInterval(timer); animation?.cancel(); } };
}
