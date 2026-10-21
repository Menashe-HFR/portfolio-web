'use strict';
(() => {
  const id=document.body.dataset.project;
  const projects=window.PORTFOLIO_PROJECTS;
  const index=projects.findIndex(project=>project.id===id);
  const project=projects[index];
  const main=document.querySelector('#project-content');
  if (!project) return;
  const next=projects[(index+1)%projects.length];
  main.innerHTML=`
    <a class="detail-back" href="index.html#work"><span aria-hidden="true">←</span> Back to selected work</a>
    <header class="detail-header"><p class="eyebrow section-kicker">PROJECT ${String(index+1).padStart(2, '0')} / ${project.label}</p><h1>${project.title}<span style="color:var(--accent)">.</span></h1><p class="detail-summary">${project.intro}</p></header>
    <dl class="detail-meta"><div><dt>BUILT WITH</dt><dd>${project.tags.join(' · ')}</dd></div><div><dt>PROJECT TYPE</dt><dd>Personal project</dd></div><div><dt>SOURCE CODE</dt><dd><a class="text-link" href="${project.repo}" target="_blank" rel="noopener">View on GitHub ↗</a></dd></div></dl>
    <figure class="detail-media"><video controls preload="none" playsinline poster="${project.poster}" aria-label="${project.title} demonstration"><source src="${project.video}" type="${project.type}">Your browser does not support video. <a href="${project.video}">Download the demo</a>.</video><figcaption>THE PROJECT IN ACTION — press play to watch the original demonstration.</figcaption></figure>
    <div class="detail-body"><div><p class="eyebrow section-kicker">THE IDEA & THE BUILD</p><h2>Small experiments.<br><em>Useful outcomes.</em></h2></div><div><h3>Overview</h3><p>${project.overview}</p><h3>What it does</h3><ul>${project.features.map(feature=>`<li>${feature}</li>`).join('')}</ul><h3 style="margin-top:28px">Why I built it</h3><p>${project.lesson}</p><div class="detail-actions"><a class="button button-primary" href="${project.repo}" target="_blank" rel="noopener">Explore the code <span aria-hidden="true">↗</span></a><a class="button button-outline" href="mailto:menasheho@gmail.com">Let’s talk <span aria-hidden="true">↗</span></a></div></div></div>
    <a class="detail-next" href="${next.page}"><div><small>KEEP EXPLORING / NEXT PROJECT</small><h3>${next.title}</h3></div><span aria-hidden="true">↗</span></a>`;
})();
