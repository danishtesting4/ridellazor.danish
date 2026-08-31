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
  })
  .catch(err => {
    console.error('Could not load config.json or description.txt', err);
  });

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
