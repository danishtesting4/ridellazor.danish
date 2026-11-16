'use strict';

// ── site config ─────────────────────────────────────────────
let siteConfig = null;

const term = null; // legacy alias, kept for compatibility
const desktop = null;

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function render(config) {
  const nameEl = document.getElementById('name');
  const handleEl = document.getElementById('handle');
  const descEl = document.getElementById('desc');
  const pfpEl = document.getElementById('pfp');
  if (nameEl) nameEl.textContent = config.name || '—';
  if (handleEl) handleEl.textContent = config.handle ? '@' + config.handle : '';
  if (descEl) descEl.textContent = config.description || '';
  if (pfpEl && config.pfp) pfpEl.src = config.pfp;
  document.title = (config.name || 'whoami') + ' — ridellazor.danish';
}

function renderDesktopIcons() { /* no-op: terminal desktop removed */ }

function addDiscordLink(config) {
  if (!config.discordId) return;
  const linksEl = document.getElementById('links');
  if (!linksEl) return;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = 'https://lanyard.live/profile/' + config.discordId;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  const icon = document.createElement('img');
  icon.src = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg';
  icon.alt = 'discord';
  const label = document.createElement('span');
  label.textContent = 'discord';
  a.appendChild(icon); a.appendChild(label); li.appendChild(a);
  linksEl.appendChild(li);
}

function renderPresence(config) {
  window.initLanyard(document.getElementById('discordPresence'), config.discordId, config.handle || config.name);
}

Promise.all([
  fetch('config.json').then(res => res.json()),
  fetch('description.txt').then(res => res.text())
])
  .then(([config, description]) => {
    config.description = description.trim();
    siteConfig = config;
    render(config);
    addDiscordLink(config);
    renderPresence(config);
    setInterval(() => renderPresence(config), 1000 * 60 * 2);
  })
  .catch(err => {
    console.error('Could not load config.json or description.txt', err);
  });

// ── topbar indicator ─────────────────────────────────────────
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
  const active = bar.querySelector('.topbar-tab.active') || tabs[0];
  requestAnimationFrame(() => move(active));
  tabs.forEach(t => {
    t.addEventListener('mouseenter', () => move(t));
    t.addEventListener('mouseleave', () => move(bar.querySelector('.topbar-tab.active') || tabs[0]));
  });
  window.addEventListener('resize', () => move(bar.querySelector('.topbar-tab.active') || tabs[0]));
})();
