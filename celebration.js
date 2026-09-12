'use strict';
(() => {
  const canvas = document.getElementById('petal-canvas');
  const context = canvas.getContext('2d', { alpha: true });
  const controls = document.querySelector('.celebration-controls');
  const toggle = document.getElementById('petal-toggle');
  const label = document.getElementById('petal-label');
  const shower = document.getElementById('shower-petals');
  const status = document.getElementById('flower-status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touch = window.matchMedia('(pointer: coarse)');
  const portrait = document.querySelector('.photo-frame');
  const sprite = new Image();
  let enabled = !motion.matches && !navigator.connection?.saveData;
  let ready = false;
  let frame = 0;
  let previous = 0;
  let width = 0;
  let height = 0;
  let particles = [];
  let toastTimer = 0;
  let cooldownTimer = 0;
  let toast = null;
  let openingTimer = 0;
  let resizeFrame = 0;

  if (!context) {
    canvas.hidden = true;
    controls.hidden = true;
    return;
  }

  const random = (min, max) => min + Math.random() * (max - min);
  const compact = () => width < 720 || touch.matches;
  const ambientCount = () => compact() ? 18 : 30;
  const particleLimit = () => compact() ? 88 : 130;
  const active = () => enabled && ready && !document.hidden && !document.getElementById('lightbox').open;

  function petal(scatter = false, burst = false, index = 0) {
    const side = index % 2 === 0 ? -1 : 1;
    return {
      x: burst ? width * (side < 0 ? .1 : .9) : random(0, width),
      y: burst ? random(height * .12, height * .42) : scatter ? random(-80, height) : random(-140, -35),
      vx: burst ? -side * random(65, 190) : random(-7, 12),
      vy: burst ? random(-105, -40) : random(26, 55),
      size: random(compact() ? 18 : 22, compact() ? 33 : 43),
      spin: random(-1.2, 1.2),
      rotation: random(0, Math.PI * 2),
      wave: random(0, Math.PI * 2),
      phase: random(0, Math.PI * 2),
      type: Math.floor(random(0, 4)),
      alpha: random(.6, .94),
      age: 0,
      burst
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    // Cap pixel density to keep the flower layer light on high-resolution phones.
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = particles.slice(0, particleLimit()).map(p => ({ ...p, x: Math.max(-30, Math.min(width + 30, p.x)) }));
  }

  function seed() {
    particles = Array.from({ length: ambientCount() }, () => petal(true));
  }

  function clear() {
    context.clearRect(0, 0, width, height);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    clear();
  }

  function start() {
    if (active() && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    if (!active()) { stop(); return; }
    const elapsed = previous ? now - previous : 1000 / 30;
    if (elapsed < 1000 / 30 - 1) { frame = requestAnimationFrame(draw); return; }
    const dt = Math.min(elapsed / 1000, .05);
    previous = now;
    clear();
    const cellWidth = sprite.naturalWidth / 2;
    const cellHeight = sprite.naturalHeight / 2;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.rotation += p.spin * dt;
      p.phase += dt * .85;
      if (p.burst) {
        p.vy = Math.min(p.vy + dt * 54, 90);
        p.vx *= Math.exp(-dt * .32);
      }
      p.x += (p.vx + Math.sin(p.phase + p.wave) * 14) * dt;
      p.y += p.vy * dt;
      if (p.y > height + 55 || p.x < -100 || p.x > width + 100 || (p.burst && p.age > 15)) {
        if (p.burst) particles.splice(i, 1);
        else particles[i] = petal();
        continue;
      }
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.rotation);
      const flutter = .4 + Math.abs(Math.cos(p.phase * 1.5)) * .6;
      context.scale(1, flutter);
      context.globalAlpha = p.alpha * (p.burst ? Math.min(1, p.age * 3) : 1);
      context.drawImage(sprite, (p.type % 2) * cellWidth, Math.floor(p.type / 2) * cellHeight,
        cellWidth, cellHeight, -p.size / 2, -p.size / 2, p.size, p.size);
      context.restore();
    }
    // A few tiny, slowly glowing lights add warmth between the real petal sprites.
    for (let i = 0; i < (compact() ? 6 : 12); i++) {
      const x = ((i * 137.51 + now * .003) % 1000) / 1000 * width;
      const y = ((i * 231.7 + now * .002) % 1000) / 1000 * height;
      const glow = .16 + (Math.sin(now / 1500 + i) + 1) * .15;
      context.fillStyle = `rgba(248,214,145,${glow})`;
      context.beginPath();
      context.arc(x, y, i % 3 === 0 ? 1.8 : 1, 0, Math.PI * 2);
      context.fill();
    }
    frame = requestAnimationFrame(draw);
  }

  function updateUI() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pause flower effects' : 'Play flower effects');
    label.textContent = enabled ? 'Flowers on' : 'Flowers off';
    document.body.classList.toggle('effects-paused', !enabled);
  }

  function setEnabled(value) {
    enabled = value;
    updateUI();
    if (enabled) { seed(); start(); }
    else { stop(); particles = []; }
  }

  function announceBlessing() {
    window.clearTimeout(toastTimer);
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'blessing-toast';
    toast.lang = 'ne';
    toast.setAttribute('aria-hidden', 'true');
    toast.textContent = 'सन्तोष र रैसालाई धेरै शुभकामना!';
    document.body.append(toast);
    status.textContent = 'With love and best wishes for Santosh and Raisha.';
    toastTimer = window.setTimeout(() => { toast?.remove(); toast = null; }, 3600);
  }

  function burst() {
    if (!active()) return;
    const count = Math.min(compact() ? 48 : 76, particleLimit() - particles.length);
    for (let i = 0; i < count; i++) particles.push(petal(false, true, i));
    start();
  }

  toggle.addEventListener('click', () => {
    setEnabled(!enabled);
    status.textContent = enabled ? 'Flower effects playing.' : 'Flower effects paused.';
  });
  shower.addEventListener('click', () => {
    if (shower.disabled) return;
    // Respect an explicit pause: the blessing still appears without motion.
    burst();
    announceBlessing();
    shower.disabled = true;
    cooldownTimer = window.setTimeout(() => { shower.disabled = false; }, 1800);
  });
  document.addEventListener('invitation:open', () => {
    window.clearTimeout(openingTimer);
    openingTimer = window.setTimeout(burst, motion.matches ? 0 : 950);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  const dialog = document.getElementById('lightbox');
  const dialogObserver = new MutationObserver(() => { if (dialog.open) stop(); else start(); });
  dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  window.addEventListener('resize', () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
  }, { passive: true });
  motion.addEventListener('change', event => setEnabled(!event.matches));

  // Very small portrait tilt follows a mouse only; touch photos remain steady.
  portrait.addEventListener('pointermove', event => {
    if (!enabled || motion.matches || event.pointerType !== 'mouse') return;
    const box = portrait.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    portrait.style.setProperty('--portrait-x', `${-y * 1.6}deg`);
    portrait.style.setProperty('--portrait-y', `${x * 1.6}deg`);
  });
  const resetPortrait = () => {
    portrait.style.setProperty('--portrait-x', '0deg');
    portrait.style.setProperty('--portrait-y', '0deg');
  };
  portrait.addEventListener('pointerleave', resetPortrait);
  toggle.addEventListener('click', resetPortrait);
  motion.addEventListener('change', resetPortrait);

  sprite.addEventListener('load', () => { ready = true; seed(); start(); });
  sprite.addEventListener('error', () => {
    ready = false;
    setEnabled(false);
    toggle.disabled = true;
    label.textContent = 'Flowers unavailable';
    toggle.setAttribute('aria-label', 'Flower animation could not load');
  });
  window.addEventListener('pagehide', () => {
    stop();
    window.clearTimeout(openingTimer);
    window.clearTimeout(toastTimer);
    window.clearTimeout(cooldownTimer);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    toast?.remove();
    toast = null;
    shower.disabled = false;
  });
  window.addEventListener('pageshow', start);
  resize();
  updateUI();
  sprite.src = 'assets/petal-sprites.webp';
})();
