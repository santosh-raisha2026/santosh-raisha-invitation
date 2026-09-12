'use strict';
(() => {
  // Explicit offset: 3 PM NPT is 09:15 UTC, independent of a guest's timezone.
  const EVENT_AT = Date.parse('2026-10-12T15:00:00+05:45');
  const EVENT_END_OF_DAY = Date.parse('2026-10-13T00:00:00+05:45');
  const byId = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const welcome = byId('welcome');
  const page = byId('invitation-page');
  const music = byId('background-music');
  const musicButton = byId('music-button');
  let opened = false;
  page.inert = true;
  music.volume = 0.48;

  function updateMusicUI() {
    const playing = !music.paused && !music.ended;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
    byId('music-label').textContent = playing ? 'Music on' : 'Music off';
  }
  async function playMusic() {
    try {
      await music.play();
      byId('audio-status').textContent = 'Background music is playing.';
    } catch (error) {
      byId('audio-status').textContent = 'Music could not start. Tap the music button to try again.';
    }
    updateMusicUI();
  }
  music.addEventListener('play', updateMusicUI);
  music.addEventListener('pause', updateMusicUI);
  music.addEventListener('error', () => {
    updateMusicUI();
    byId('audio-status').textContent = 'The music could not load. You can still enjoy the invitation.';
  });
  musicButton.addEventListener('click', () => {
    if (music.paused) playMusic();
    else {
      music.pause();
      byId('audio-status').textContent = 'Background music paused.';
    }
  });

  byId('open-invitation').addEventListener('click', () => {
    if (opened) return;
    opened = true;
    // Start during this user gesture so mobile browsers can permit audio.
    playMusic();
    page.inert = false;
    document.body.classList.add('is-open');
    welcome.classList.add('is-leaving');
    window.scrollTo({ top: 0, behavior: 'instant' });
    byId('invitation').focus({ preventScroll: true });
    welcome.inert = true;
    window.setTimeout(() => { welcome.hidden = true; welcome.style.display = 'none'; }, reducedMotion ? 0 : 900);
    revealVisibleSections();
  });

  function calculateRemaining(now) {
    const total = Math.max(0, Math.floor((EVENT_AT - now) / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor(total % 86400 / 3600),
      minutes: Math.floor(total % 3600 / 60),
      seconds: total % 60
    };
  }
  function updateCountdown() {
    const now = Date.now();
    const remaining = calculateRemaining(now);
    for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
      const value = String(remaining[unit]).padStart(2, '0');
      if (byId(unit).textContent !== value) byId(unit).textContent = value;
    }
    const status = byId('countdown-status');
    const message = now < EVENT_AT ? '' : now < EVENT_END_OF_DAY
      ? 'Our celebration begins today! · आज हाम्रो विशेष दिन!'
      : 'A beautiful beginning, forever remembered. · हाम्रो सुन्दर नयाँ सुरुवात।';
    if (status.textContent !== message) status.textContent = message;
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });

  const gallery = byId('photo-gallery');
  const galleryPrev = byId('gallery-prev');
  const galleryNext = byId('gallery-next');
  function updateGalleryArrows() {
    galleryPrev.disabled = gallery.scrollLeft < 2;
    galleryNext.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 3;
  }
  function scrollGallery(direction) {
    const card = gallery.querySelector('.gallery-card');
    const gap = parseFloat(getComputedStyle(gallery).gap) || 24;
    const step = card.getBoundingClientRect().width + gap;
    gallery.scrollBy({ left: direction * step, behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  galleryPrev.addEventListener('click', () => scrollGallery(-1));
  galleryNext.addEventListener('click', () => scrollGallery(1));
  gallery.addEventListener('scroll', updateGalleryArrows, { passive: true });
  window.addEventListener('resize', updateGalleryArrows, { passive: true });
  updateGalleryArrows();

  const lightbox = byId('lightbox');
  const image = byId('lightbox-image');
  const cards = [...gallery.querySelectorAll('.gallery-card')];
  let currentPhoto = 0;
  let lastPhotoTrigger = null;
  function showPhoto(index) {
    currentPhoto = (index + cards.length) % cards.length;
    const card = cards[currentPhoto];
    image.src = card.href;
    image.alt = card.querySelector('img').alt;
    byId('photo-counter').textContent = `${currentPhoto + 1} / ${cards.length}`;
    const next = new Image();
    next.src = cards[(currentPhoto + 1) % cards.length].href;
  }
  cards.forEach((card, index) => card.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof lightbox.showModal !== 'function') return;
    event.preventDefault();
    lastPhotoTrigger = card;
    showPhoto(index);
    lightbox.showModal();
    document.body.classList.add('has-lightbox');
    byId('close-lightbox').focus();
  }));
  byId('close-lightbox').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('close', () => {
    document.body.classList.remove('has-lightbox');
    if (lastPhotoTrigger) lastPhotoTrigger.focus({ preventScroll: true });
  });
  byId('lightbox-prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
  byId('lightbox-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(currentPhoto + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(currentPhoto - 1); }
  });
  let swipeStart = null;
  byId('lightbox-stage').addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('button')) return;
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  byId('lightbox-stage').addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) showPhoto(currentPhoto + (deltaX < 0 ? 1 : -1));
    swipeStart = null;
  });
  byId('lightbox-stage').addEventListener('pointercancel', () => { swipeStart = null; });

  const revealElements = document.querySelectorAll('.reveal');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && opened) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }
  }, { threshold: 0.08 }) : null;
  function revealVisibleSections() {
    revealElements.forEach(el => {
      if (reducedMotion || !observer) el.classList.add('is-visible');
      else observer.observe(el);
    });
  }
})();
