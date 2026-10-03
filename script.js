let siteConfig = null;

function render(config) {
  document.title = config.name || 'whoami';

  document.getElementById('name').textContent = config.name || '';
  document.getElementById('handle').textContent = config.handle ? '@' + config.handle : '';
  document.getElementById('desc').textContent = config.description || '';

  const pfp = document.getElementById('pfp');
  pfp.src = config.pfp || 'pfp/avatar.jpg';
  pfp.alt = config.name ? config.name + ' profile picture' : 'profile picture';

  const linksEl = document.getElementById('links');
  linksEl.innerHTML = '';
  (config.links || []).forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.target = link.url.startsWith('mailto:') ? '_self' : '_blank';
    a.rel = 'noopener noreferrer';

    const icon = document.createElement('img');
    icon.src = link.icon;
    icon.alt = '';
    icon.loading = 'lazy';

    const label = document.createElement('span');
    label.textContent = link.label;

    a.appendChild(icon);
    a.appendChild(label);
    li.appendChild(a);
    linksEl.appendChild(li);
  });
}

function renderDesktopIcons(config) {
  const grid = document.getElementById('desktopIcons');
  grid.innerHTML = '';

  const items = [
    { label: 'Terminal', isTerminal: true },
    { label: 'Projects', isFolder: true, url: 'pages/' },
    { label: 'Community', isFolder: true, url: 'pages/community.html' },
    ...(config.links || []).map(l => ({ label: l.label, icon: l.icon, url: l.url }))
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';

    const glyph = document.createElement('div');
    glyph.className = 'desktop-icon-glyph';
    if (item.isTerminal) {
      glyph.textContent = '>_';
    } else if (item.isFolder) {
      glyph.textContent = '📁';
    } else {
      const im = document.createElement('img');
      im.src = item.icon;
      im.alt = '';
      im.loading = 'lazy';
      glyph.appendChild(im);
    }

    const label = document.createElement('span');
    label.textContent = item.label;

    btn.appendChild(glyph);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      if (item.isTerminal) {
        restoreTerm();
      } else if (item.isFolder) {
        window.location.href = item.url;
      } else {
        window.open(item.url, item.url.startsWith('mailto:') ? '_self' : '_blank');
      }
    });
    grid.appendChild(btn);
  });
}

Promise.all([
  fetch('config.json').then(res => res.json()),
  fetch('description.txt').then(res => res.text())
])
  .then(([config, description]) => {
    config.description = description.trim();
    siteConfig = config;
    render(config);
    renderDesktopIcons(config);
    addDiscordLink(config);
    renderPresence(config);
    // refresh presence every couple of minutes, discord changes are infrequent
    setInterval(() => renderPresence(config), 1000 * 60 * 2);
  })
  .catch(err => {
    console.error('Could not load config.json or description.txt', err);
  });

// ── discord presence (Lanyard) ───────────────────────────────
// config.discordId (your numeric discord id) is the only requirement. the
// lanyard api sends cors: a * headers, so this works from the browser on
// github pages without any proxy.
const LANYARD = 'https://api.lanyard.live/v1/users/';
const STATUS_COLOR = { online: '#2db544', idle: '#b3ad30', dnd: '#b0413e', offline: '#8a8578' };
const ACTIVITY_ICON = { LISTENING: '🎧', STREAMING: '📺', PLAYING: '🎮', WATCHING: '📺', COMPETING: '🏆', CUSTOM_STATUS: '🟣' };

function renderPresence(config) {
  const el = document.getElementById('discordPresence');
  if (!el || !config || !config.discordId) {
    if (el) el.textContent = 'no discord id configured';
    return;
  }

  el.innerHTML = '<span class="muted">discord: checking…</span>';

  fetch(LANYARD + config.discordId)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const p = d && d.data;
      if (!p) { el.textContent = 'discord: presence unavailable'; return; }

      const state = p.status || 'offline';
      const dot = '<span class="dot" style="background:' + (STATUS_COLOR[state] || STATUS_COLOR.offline) + '"></span>';
      const name = p.username || config.handle || config.name || 'someone';
      const avatar = p.avatar
        ? '<img src="https://cdn.discordapp.com/avatars/' + config.discordId + '/' + p.avatar + '.' + (String(p.avatar).startsWith('a_') ? 'gif' : 'png') + '?size=32" alt="' + escapeHtml(name) + '" loading="lazy">'
        : '';

      // current activity (a song, a game, whatever), lanyard types are strings
      const act = Array.isArray(p.activities) ? p.activities.find(a => a.type !== 'CUSTOM_STATUS') : null;
      let activity = '';
      if (act) {
        const icon = ACTIVITY_ICON[act.type] || '•';
        const val = act.state || act.details || act.name || '';
        activity = '  ' + icon + ' ' + (act.name || '') + (val ? ' — ' + val : '');
      }

      const stateLabel = p.online ? 'online (' + state + ')' : 'offline';
      el.innerHTML = dot + ' ' + avatar + escapeHtml(name) + ' — ' + stateLabel + (activity ? '<span class="muted">' + escapeHtml(activity) + '</span>' : '');
    })
    .catch(() => {
      el.textContent = 'discord: could not load presence';
    });
}

// load the api lanyard exposes so you can link to the actual profile
function addDiscordLink(config) {
  if (!config.discordId) return;
  const linksEl = document.getElementById('links');
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

// ── window controls ─────────────────────────────────────────
const term = document.getElementById('term');
const desktop = document.getElementById('desktop');
const btnMin = document.getElementById('btnMin');
const btnMax = document.getElementById('btnMax');
const btnClose = document.getElementById('btnClose');
const restoreBtn = document.getElementById('restoreBtn');

function openDesktop() {
  term.classList.add('closing');
  setTimeout(() => {
    term.classList.add('hidden');
    term.classList.remove('closing');
    desktop.classList.add('active');
  }, 220);
}

function restoreTerm() {
  desktop.classList.remove('active');
  term.classList.remove('hidden');
}

btnMin.addEventListener('click', openDesktop);
btnClose.addEventListener('click', openDesktop);
btnMax.addEventListener('click', () => term.classList.toggle('maximized'));
restoreBtn.addEventListener('click', restoreTerm);

// ── button commands ───────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function appendHistoryLine(html) {
  const historyEl = document.getElementById('termHistory');
  const div = document.createElement('div');
  div.className = 'line';
  div.innerHTML = html;
  historyEl.appendChild(div);
  historyEl.scrollTop = historyEl.scrollHeight;
}

function runButtonCommand(cmd) {
  if (cmd === 'clear') {
    document.getElementById('termHistory').innerHTML = '';
    return;
  }

  if (cmd === 'projects') {
    window.location.href = 'pages/';
    return;
  }

  if (cmd === 'community') {
    window.location.href = 'pages/community.html';
    return;
  }

  if (cmd === 'discord') {
    renderPresence(siteConfig);
    return;
  }

  if (!siteConfig) {
    appendHistoryLine('<span class="out">still loading, try again in a moment</span>');
    return;
  }

  let output = '';
  switch (cmd) {
    case 'whoami':
      output = (siteConfig.name || '') + (siteConfig.handle ? ' (@' + siteConfig.handle + ')' : '');
      break;
    case 'about':
      output = siteConfig.description || '';
      break;
    case 'date':
      output = new Date().toString();
      break;
  }

  appendHistoryLine('<span class="prompt">$</span> ' + escapeHtml(cmd));
  if (output) {
    appendHistoryLine('<span class="out">' + escapeHtml(output) + '</span>');
  }
}

document.getElementById('termButtons').addEventListener('click', e => {
  const btn = e.target.closest('.term-btn');
  if (!btn) return;
  runButtonCommand(btn.dataset.cmd);
});
