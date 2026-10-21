'use strict';
(() => {
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#mobile-nav');
  function closeMenu() {
    if (!menu || !navigation) return;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    navigation.hidden = true;
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.hidden = !open;
  });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });
  matchMedia('(max-width: 600px)').addEventListener('change', closeMenu);
  document.querySelectorAll('#year').forEach(element => { element.textContent = new Date().getFullYear(); });
  const grid = document.querySelector('#project-grid');
  if (grid && window.PORTFOLIO_PROJECTS) {
    const total = String(window.PORTFOLIO_PROJECTS.length).padStart(2, '0');
    document.querySelector('.desktop-nav a span').textContent = total;
    document.querySelector('.filter[data-filter="all"] sup').textContent = total;
    document.querySelector('#work-count').textContent = `SHOWING ${total} PROJECTS`;
    grid.innerHTML = window.PORTFOLIO_PROJECTS.map((project, index) => `
      <article class="project-card ${project.wide ? 'wide' : ''}" data-category="${project.category}">
        <div class="project-preview"><a class="project-visual ${project.visualClass}" href="${project.page}" aria-label="Explore ${project.title}">
          <div class="visual-inner">${project.visual}</div>
          <span class="visual-corner">${project.label}</span><span class="visual-link" aria-hidden="true">↗</span>
        </a><button class="watch-demo" type="button" data-demo="${project.id}" aria-label="Watch ${project.title} demo"><span aria-hidden="true">▷</span> Watch demo</button></div>
        <div class="project-info"><div class="project-meta"><a href="${project.page}"><h3>${project.title}</h3></a><span class="project-number">${String(index + 1).padStart(2, '0')}</span></div>
        <p class="project-description">${project.summary}</p><div class="tags">${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        ${project.wide ? `<a class="text-link project-detail-link" href="${project.page}">Explore the project <span aria-hidden="true">↗</span></a>` : ''}</div>
      </article>`).join('');
    document.querySelectorAll('.filter').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(filter => {
          const active = filter === button;
          filter.classList.toggle('active', active);
          filter.setAttribute('aria-pressed', String(active));
        });
        let count = 0;
        grid.querySelectorAll('.project-card').forEach(card => {
          card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
          if (!card.hidden) count++;
        });
        document.querySelector('#work-count').textContent = `SHOWING ${String(count).padStart(2, '0')} PROJECT${count === 1 ? '' : 'S'}`;
        document.dispatchEvent(new CustomEvent('portfolio:filter'));
      });
    });
  }
  const copy = document.querySelector('#copy-email');
  let feedbackTimer;
  copy?.addEventListener('click', async () => {
    const feedback = document.querySelector('#copy-status');
    clearTimeout(feedbackTimer);
    try {
      await navigator.clipboard.writeText('menasheho@gmail.com');
      feedback.textContent = 'Email copied!';
    } catch {
      feedback.textContent = 'Select the email to copy, or click it to write.';
    }
    feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 4500);
  });
})();
