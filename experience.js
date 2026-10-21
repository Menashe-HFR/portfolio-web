'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const palettes = {
    sage: { hex: '#c3f58c', rgb: '195,245,140' },
    ice: { hex: '#94dcff', rgb: '148,220,255' },
    ember: { hex: '#ffb28e', rgb: '255,178,142' },
  };
  const paletteButtons = document.querySelectorAll('[data-palette]');
  function setPalette(name) {
    const palette = palettes[name] || palettes.sage;
    document.documentElement.style.setProperty('--accent', palette.hex);
    document.documentElement.style.setProperty('--accent-rgb', palette.rgb);
    document.documentElement.dataset.palette = palettes[name] ? name : 'sage';
    paletteButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === document.documentElement.dataset.palette)));
    try { localStorage.setItem('portfolio.palette', document.documentElement.dataset.palette); } catch { /* Storage is optional. */ }
    document.dispatchEvent(new CustomEvent('portfolio:palette', { detail: palette }));
  }
  let savedPalette = 'sage';
  try { savedPalette = localStorage.getItem('portfolio.palette') || 'sage'; } catch { /* Use the default. */ }
  setPalette(savedPalette);
  paletteButtons.forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette)));

  // Observe each entrance once; content is visible if observers are unsupported.
  const entrances = document.querySelectorAll('.section-heading,.project-card,.github-more,.about-portrait,.about-copy,.contact-title,.contact-bottom');
  if ('IntersectionObserver' in window) {
    const entranceObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); entranceObserver.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    function observeEntrances() {
      entrances.forEach(element => {
        if (reduced.matches) { element.classList.remove('reveal-ready'); return; }
        if (!element.classList.contains('in-view')) {
          element.classList.add('reveal-ready');
          entranceObserver.observe(element);
        }
      });
    }
    observeEntrances();
    reduced.addEventListener('change', observeEntrances);
    document.addEventListener('portfolio:filter', observeEntrances);
  }

  // Pointer work is event-driven and coalesced to one update per animation frame.
  document.querySelectorAll('.project-preview').forEach(preview => {
    let frame = 0, rect, pointer;
    function reset() {
      cancelAnimationFrame(frame); frame = 0; rect = null;
      ['--tilt-x', '--tilt-y', '--light-x', '--light-y'].forEach(name => preview.style.removeProperty(name));
    }
    preview.addEventListener('pointerenter', () => { rect = preview.getBoundingClientRect(); });
    preview.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduced.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0; rect ||= preview.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (pointer.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (pointer.y - rect.top) / rect.height));
        preview.style.setProperty('--tilt-x', `${(0.5-y)*5}deg`);
        preview.style.setProperty('--tilt-y', `${(x-0.5)*5}deg`);
        preview.style.setProperty('--light-x', `${x*100}%`);
        preview.style.setProperty('--light-y', `${y*100}%`);
      });
    }, { passive: true });
    preview.addEventListener('pointerleave', reset);
    preview.addEventListener('pointercancel', reset);
    reduced.addEventListener('change', reset);
  });

  const progress = document.querySelector('.reading-progress');
  let scrollFrame = 0;
  function updateProgress() {
    scrollFrame = 0;
    const available = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, scrollY/available)) : 0})`;
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress);
  }, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });
  document.addEventListener('portfolio:filter', updateProgress);
  updateProgress();

  if ('IntersectionObserver' in window) {
    const navigation = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    const sections = navigation.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    // One observer handles all section links with the same activation window.
    const sectionObserver = new IntersectionObserver(entries => {
      const current = entries.find(entry => entry.isIntersecting);
      if (!current) return;
      navigation.forEach(link => {
        if (link.hash === `#${current.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -55% 0px' });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Native dialog supplies focus containment and Escape handling.
  const dialog = document.querySelector('#demo-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    document.querySelectorAll('.watch-demo').forEach(button => { button.hidden = true; });
    return;
  }
  const projects = window.PORTFOLIO_PROJECTS;
  const media = document.querySelector('#demo-media');
  let selected = 0, opener;
  function releaseVideo() {
    const video = media.querySelector('video');
    if (!video) return;
    video.pause();
    video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    video.removeAttribute('src'); video.load();
    media.replaceChildren();
  }
  function showProject(index) {
    releaseVideo();
    selected = (index + projects.length) % projects.length;
    const project = projects[selected];
    document.querySelector('#demo-title').textContent = project.title;
    document.querySelector('#demo-counter').textContent = `${String(selected+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;
    document.querySelector('#demo-details').href = project.page;
    const video = document.createElement('video');
    video.controls = true; video.playsInline = true; video.preload = 'none'; video.poster = project.poster;
    video.setAttribute('aria-label', `${project.title} demonstration`);
    const source = document.createElement('source'); source.src = project.video; source.type = project.type;
    video.append(source); media.append(video);
  }
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    showProject(projects.findIndex(project => project.id === button.dataset.demo));
    document.body.classList.add('demo-open');
    dialog.showModal();
  }));
  dialog.querySelector('.demo-close').addEventListener('click', () => dialog.close());
  document.querySelector('#demo-prev').addEventListener('click', () => showProject(selected-1));
  document.querySelector('#demo-next').addEventListener('click', () => showProject(selected+1));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    // Keep native video seek/volume shortcuts intact when its controls have focus.
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); showProject(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    releaseVideo(); document.body.classList.remove('demo-open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
})();
