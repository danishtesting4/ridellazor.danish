'use strict';

const app = document.getElementById('app');

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── topbar indicator ────────────────────────────────────────
(function () {
  const bar = document.getElementById('topbar');
  const ind = document.getElementById('topbarIndicator');
  if (!bar || !ind) return;
  const tabs = Array.from(bar.querySelectorAll('.topbar-tab'));
  function move(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    ind.style.left = (r.left - br.left) + 'px';
    ind.style.width = r.width + 'px';
  }
  function setActive(label) {
    tabs.forEach(t => t.classList.toggle('active', t.textContent.trim().toLowerCase() === label.toLowerCase()));
    const a = bar.querySelector('.topbar-tab.active') || tabs[0];
    requestAnimationFrame(() => move(a));
  }
  window.__setActiveTab = setActive;
  tabs.forEach(t => {
    t.addEventListener('mouseenter', () => move(t));
    t.addEventListener('mouseleave', () => move(bar.querySelector('.topbar-tab.active') || tabs[0]));
  });
  window.addEventListener('resize', () => move(bar.querySelector('.topbar-tab.active') || tabs[0]));
})();

function setActiveTab(label) {
  if (window.__setActiveTab) window.__setActiveTab(label);
}

// ── helpers ─────────────────────────────────────────────────
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}

function show(html) { app.innerHTML = html; }

// ── renderers ───────────────────────────────────────────────
async function renderHome() {
  setActiveTab('Home');
  let config = {};
  let desc = '';
  try { config = await fetchJson('config.json'); } catch (e) { console.error(e); }
  try { desc = await fetchText('description.txt'); } catch (e) { console.error(e); }
  if (desc) config.description = desc.trim();

  const links = (config.links || []).map(l => `
    <li><a href="${escapeHtml(l.url)}" target="${(l.url||'').startsWith('mailto:')?'_self':'_blank'}" rel="noopener noreferrer">
      ${l.icon ? '<img src="' + escapeHtml(l.icon) + '" alt="" loading="lazy">' : ''}
      <span>${escapeHtml(l.label)}</span>
    </a></li>`).join('');

  const discordLink = config.discordId
    ? `<li><a href="https://discord.com/users/${config.discordId}" target="_blank" rel="noopener noreferrer"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg" alt=""> <span>discord</span></a></li>`
    : '';

  show(`
    <section class="hero">
      <img class="hero-pfp" src="${escapeHtml(config.pfp || 'pfp/avatar.jpg')}" alt="profile picture">
      <div class="hero-text">
        <p class="hero-eyebrow">${escapeHtml(config.handle || '')}</p>
        <h1 class="hero-name">${escapeHtml(config.name || '—')}</h1>
        <p class="hero-handle">${config.handle ? '@' + escapeHtml(config.handle) : ''}</p>
        <p class="hero-bio">${escapeHtml(config.description || '')}</p>
      </div>
    </section>

    <section class="block">
      <h2 class="block-title">Links</h2>
      <ul class="link-list">${links}${discordLink}</ul>
    </section>

    <section class="block">
      <h2 class="block-title">Projects</h2>
      <p class="block-sub">Work that has been sent in.</p>
      <a class="btn" href="#/projects">Browse all projects →</a>
    </section>

    <section class="block">
      <h2 class="block-title">People</h2>
      <p class="block-sub">Everyone who has sent something in.</p>
      <a class="btn" href="#/people">See all people →</a>
    </section>
  `);
  document.title = (config.name || 'whoami') + ' — ridellazor.danish';
}

async function renderPeople() {
  setActiveTab('People');
  let people = [];
  try { people = await fetchJson('pages/people/index.json'); } catch (e) { console.error(e); }
  const cards = people.map(p => `
    <div class="item">
      <a class="item-name" href="#/people/${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a>
      ${p.handle ? '<span class="item-by">@' + escapeHtml(p.handle) + '</span>' : ''}
      <span class="item-desc">${p.projects && p.projects.length ? (p.projects.length === 1 ? '1 project' : p.projects.length + ' projects') : 'no projects yet'}</span>
    </div>`).join('');
  show(`
    <section class="hero"><h1 class="hero-name">People</h1><p class="hero-bio">Everyone who has sent something in.</p></section>
    <section class="block">
      ${people.length ? '<p class="count">' + people.length + ' person' + (people.length === 1 ? '' : 's') + '</p>' + cards : '<p class="note">No profiles yet.</p>'}
    </section>
  `);
  document.title = 'People — ridellazor.danish';
}

async function renderPerson(slug) {
  setActiveTab('People');
  show('<p class="muted">loading…</p>');
  let html = '';
  try { html = await fetchText('pages/people/' + encodeURIComponent(slug) + '/index.html'); }
  catch (e) { show('<p class="note">could not load profile: ' + escapeHtml(e.message) + '</p>'); return; }
  // extract <main> content
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const main = doc.querySelector('main');
  const footer = doc.querySelector('footer');
  const content = (main ? main.outerHTML : '') + (footer ? footer.outerHTML : '');
  show(content);
  // update title from fetched doc
  const t = doc.querySelector('title');
  if (t) document.title = t.textContent;
}

async function renderProjects() {
  setActiveTab('Projects');
  let projects = [];
  try { projects = await fetchJson('pages/projects.json'); } catch (e) { console.error(e); }
  if (!Array.isArray(projects)) projects = [];
  const cards = projects.map(p => {
    const isExt = /^https?:\/\//i.test(p.url || '');
    return `
    <div class="project-card">
      <div class="project-card-head">
        <span class="project-name">${escapeHtml(p.name || 'Untitled')}</span>
        ${p.status ? '<span class="project-status">' + escapeHtml(p.status) + '</span>' : ''}
      </div>
      ${p.description ? '<p class="project-desc">' + escapeHtml(p.description) + '</p>' : ''}
      ${p.tags && p.tags.length ? '<div class="project-tags">' + p.tags.map(t => '<span class="project-tag">' + escapeHtml(t) + '</span>').join('') + '</div>' : ''}
      ${p.url ? '<a class="project-link" href="' + escapeHtml(p.url) + '"' + (isExt ? ' target="_blank" rel="noopener noreferrer"' : '') + '>view →</a>' : ''}
    </div>`;
  }).join('');
  show(`
    <section class="hero"><h1 class="hero-name">Projects</h1><p class="hero-bio">Work that has been sent in. Each one is a small site of its own.</p></section>
    <section class="block">
      <div class="projects-grid">${cards || '<p class="projects-empty">(no projects yet)</p>'}</div>
    </section>
  `);
  document.title = 'Projects — ridellazor.danish';
}

async function renderCommunity() {
  setActiveTab('Community');
  let sites = [];
  try { sites = await fetchJson('pages/community.json'); } catch (e) { console.error(e); }
  if (!Array.isArray(sites)) sites = [];
  const cards = sites.map(s => {
    const person = null;
    const author = s.by ? '<div class="by">by ' + escapeHtml(s.by) + '</div>' : '';
    return `
    <div class="community-card">
      <h3>${escapeHtml(s.name || 'Untitled')}</h3>
      ${author}
      ${s.description ? '<p>' + escapeHtml(s.description) + '</p>' : ''}
      ${s.url ? '<a class="open" href="' + escapeHtml(s.url) + '"' + (/^https?:\/\//i.test(s.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>open →</a>' : ''}
    </div>`;
  }).join('');
  show(`
    <section class="hero"><h1 class="hero-name">Community</h1><p class="hero-bio">Work from people who got in touch.</p></section>
    <section class="block">
      <div class="community-list">${cards || '<p class="note">Nothing here yet.</p>'}</div>
    </section>
  `);
  document.title = 'Community — ridellazor.danish';
}

// ── router ──────────────────────────────────────────────────
function route() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) { renderHome(); return; }
  if (parts[0] === 'people') {
    if (parts[1]) { renderPerson(decodeURIComponent(parts[1])); }
    else { renderPeople(); }
    return;
  }
  if (parts[0] === 'projects') { renderProjects(); return; }
  if (parts[0] === 'community') { renderCommunity(); return; }
  if (parts[0] === 'home') { renderHome(); return; }
  // fallback
  renderHome();
}

window.addEventListener('hashchange', route);
if (!location.hash) location.hash = '#/';
route();
