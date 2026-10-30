// A short, two-sided paper burst from the rocket medal on the winning receipt.
// Animate the paper in the top layer so it can pass in front of a modal dialog.
export function mountWinConfetti(page) {
  const view = page.defaultView;
  const motion = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const layer = page.createElement('div');
  layer.className = 'result-confetti';
  layer.setAttribute('popover', 'manual');
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  page.body.append(layer);
  const colors = ['#ff4b38', '#ff573c', '#ff7043', '#ff4657', '#fa5038', '#ff6347', '#ffe66d', '#35e84c', '#29a7ed', '#ed35dd'];
  let animations = [], timer, run = 0;

  function stop() {
    run++;
    clearTimeout(timer);
    animations.forEach(animation => animation.cancel());
    animations = [];
    layer.replaceChildren();
    if (layer.hidePopover && layer.matches(':popover-open')) layer.hidePopover();
  }

  function play(emblem) {
    stop();
    if (motion?.matches || !layer.showPopover) return;
    layer.showPopover();
    const width = view.innerWidth, height = view.innerHeight;
    const scale = Math.min(1.3, Math.max(.65, width / 1005));
    const bounds = emblem?.getBoundingClientRect();
    const originX = bounds ? bounds.left + bounds.width / 2 : width / 2;
    const originY = bounds ? bounds.top + bounds.height * .44 : height * .33;
    const activeRun = run;
    for (let index = 0; index < 96; index++) {
      const piece = page.createElement('i');
      // A seeded spread keeps the reference's red-heavy mix and two fans on every win.
      const fraction = ((index * 73 + 19) % 101) / 101;
      const variation = ((index * 37 + 11) % 97) / 97;
      const side = index % 2 ? 1 : -1;
      const duration = 650 + variation * variation * 1000;
      const velocityX = side * (384 + fraction * 720) * scale;
      const velocityY = (-575 + ((index * 53 + 7) % 103) / 103 * 1150) * scale;
      const rotation = index * 137.5;
      const tumble = 540 + fraction * 900;
      const frames = [];
      // Exponential air resistance opens each fan quickly, then lets the paper flutter down.
      for (let step = 0; step <= 32; step++) {
        const progress = step / 32, elapsed = duration / 1000 * progress;
        const drag = (1 - Math.exp(-3.6 * elapsed)) / 3.6;
        const flutter = Math.sin(elapsed * 12 + index) * 9 * progress * scale;
        const x = originX + velocityX * drag + flutter;
        const y = originY + velocityY * drag + 145 * elapsed * elapsed * scale;
        frames.push({
          offset: progress,
          opacity: progress < .65 ? 1 : Math.max(0, (1 - progress) / .35),
          transform: `translate3d(${x}px,${y}px,0) rotate(${rotation + tumble * progress}deg) rotateY(${index * 29 + progress * 900}deg)`,
        });
      }
      const streamer = index % 11 === 0, circle = index % 7 === 0;
      piece.style.width = `${streamer ? 4 : 5 + fraction * 5}px`;
      piece.style.height = `${streamer ? 20 + variation * 12 : 5 + variation * 5}px`;
      piece.style.borderRadius = circle ? '50%' : '0';
      piece.style.background = colors[Math.floor(index / 2) % colors.length];
      layer.append(piece);
      animations.push(piece.animate(frames, {
        duration, delay: index % 4 * 12, easing: 'linear', fill: 'both',
      }));
    }
    timer = view.setTimeout(() => { if (run === activeRun) stop(); }, 1700);
  }

  function motionChanged() { if (motion.matches) stop(); }
  motion?.addEventListener('change', motionChanged);
  return {
    play, stop,
    destroy() {
      stop(); layer.remove();
      motion?.removeEventListener('change', motionChanged);
    },
  };
}
