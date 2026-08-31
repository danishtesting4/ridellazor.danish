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
    buildFS(config);
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
  cmdInput.focus();
}

btnMin.addEventListener('click', openDesktop);
btnClose.addEventListener('click', openDesktop);
btnMax.addEventListener('click', () => {
  term.classList.toggle('maximized');
  cmdInput.focus();
});
restoreBtn.addEventListener('click', restoreTerm);

// ── virtual filesystem ──────────────────────────────────────
let fs = { '~': { type: 'dir', children: [] } };
let cwd = '~';

function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'link';
}

function buildFS(config) {
  const links = config.links || [];
  const linkChildren = [];
  fs = {
    '~': { type: 'dir', children: ['about.txt', 'links', 'pages'] },
    '~/about.txt': { type: 'file', content: config.description || '' },
    '~/links': { type: 'dir', children: linkChildren },
    '~/pages': { type: 'dir', children: [] }
  };
  links.forEach(l => {
    const fname = slugify(l.label) + '.url';
    linkChildren.push(fname);
    fs['~/links/' + fname] = { type: 'file', content: l.url, label: l.label };
  });
}

function resolvePath(base, arg) {
  if (!arg || arg === '~') return '~';
  if (arg === '..') {
    if (base === '~') return '~';
    const parts = base.split('/');
    parts.pop();
    return parts.join('/') || '~';
  }
  if (arg.startsWith('~/')) return arg;
  return base === '~' ? '~/' + arg : base + '/' + arg;
}

// ── command engine ──────────────────────────────────────────
const HELP_TEXT =
  'Available commands:\n' +
  '  help            show this help\n' +
  '  whoami          show your name and handle\n' +
  '  about           show the description\n' +
  '  ls [dir]        list files\n' +
  '  cd <dir>        change directory\n' +
  '  cat <file>      print file contents\n' +
  '  pwd             print working directory\n' +
  '  echo <text>     print text\n' +
  '  open <name>     open a link in a new tab\n' +
  '  projects        go to the projects page\n' +
  '  date            show current date/time\n' +
  '  clear           clear the terminal\n' +
  '  exit            close the window';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function findLinkByName(name) {
  if (!siteConfig) return null;
  const lower = name.toLowerCase();
  return (siteConfig.links || []).find(l =>
    slugify(l.label) === slugify(name) ||
    l.label.toLowerCase() === lower ||
    l.label.toLowerCase().includes(lower)
  );
}

function executeCommand(cmd, args) {
  if (!siteConfig) return 'still loading, try again in a moment';

  switch (cmd) {
    case 'help':
      return HELP_TEXT;

    case 'whoami':
      return (siteConfig.name || '') + (siteConfig.handle ? ' (@' + siteConfig.handle + ')' : '');

    case 'about':
      return siteConfig.description || '';

    case 'pwd':
      return cwd;

    case 'echo':
      return args.join(' ');

    case 'date':
      return new Date().toString();

    case 'ls': {
      const target = args[0] ? resolvePath(cwd, args[0]) : cwd;
      const node = fs[target];
      if (!node || node.type !== 'dir') return 'ls: not a directory: ' + (args[0] || cwd);
      return node.children.map(c => {
        const childPath = target + '/' + c;
        return fs[childPath] && fs[childPath].type === 'dir' ? c + '/' : c;
      }).join('  ') || '(empty)';
    }

    case 'cd': {
      const target = resolvePath(cwd, args[0]);
      const node = fs[target];
      if (!node || node.type !== 'dir') return 'cd: no such directory: ' + (args[0] || '');
      cwd = target;
      document.getElementById('cwd').textContent = cwd;
      return '';
    }

    case 'cat': {
      if (!args[0]) return 'cat: missing file operand';
      const target = resolvePath(cwd, args[0]);
      const node = fs[target];
      if (!node) return 'cat: no such file: ' + args[0];
      if (node.type === 'dir') return 'cat: ' + args[0] + ' is a directory';
      return node.content;
    }

    case 'open': {
      if (!args[0]) return 'open: usage: open <link name>';
      const link = findLinkByName(args.join(' '));
      if (!link) return 'open: no link matching "' + args.join(' ') + '" — try "ls links/"';
      window.open(link.url, link.url.startsWith('mailto:') ? '_self' : '_blank');
      return 'opening ' + link.label + '...';
    }

    case 'projects':
      window.location.href = 'pages/';
      return 'opening projects...';

    case 'sudo':
      return 'nice try.';

    case 'exit':
      openDesktop();
      return '';

    default:
      return cmd + ': command not found (type "help" for a list of commands)';
  }
}

function appendHistoryLine(html) {
  const historyEl = document.getElementById('termHistory');
  const div = document.createElement('div');
  div.className = 'line';
  div.innerHTML = html;
  historyEl.appendChild(div);
  historyEl.scrollTop = historyEl.scrollHeight;
}

function runCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  const [cmdRaw, ...args] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  if (cmd === 'clear') {
    document.getElementById('termHistory').innerHTML = '';
    return;
  }

  appendHistoryLine(
    '<span class="prompt">$</span> <span class="cwd-echo">' + escapeHtml(cwd) + '</span> ' + escapeHtml(trimmed)
  );

  const output = executeCommand(cmd, args);
  if (output) {
    appendHistoryLine('<span class="out">' + escapeHtml(output).replace(/\n/g, '<br>') + '</span>');
  }
}

const cmdInput = document.getElementById('cmdInput');
cmdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = cmdInput.value;
    cmdInput.value = '';
    runCommand(val);
  }
});

document.getElementById('termBody').addEventListener('click', e => {
  if (e.target.tagName !== 'A') cmdInput.focus();
});
