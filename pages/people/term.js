// profile page terminal — the same idea as the home page's script.js, but the
// person is baked into the page by profile.js instead of fetched from
// config.json, so this reads a <script id="personData"> block.
//
// window controls live in ../window.js and are shared with the home page.
(function () {
  const dataEl = document.getElementById('personData');
  if (!dataEl) return;

  let person;
  try {
    person = JSON.parse(dataEl.textContent);
  } catch (err) {
    console.error('bad person data', err);
    return;
  }

  const links = person.links || [];
  const projects = person.projects || [];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── desktop icons ─────────────────────────────────────────
  const grid = document.getElementById('desktopIcons');
  if (grid) {
    // looked up on click, not captured here — window.js may not have run yet,
    // and this file must not die if it never does
    const restore = () => {
      if (typeof window.restoreTerm === 'function') window.restoreTerm();
    };

    const items = [
      { label: 'Terminal', glyph: '>_', action: restore },
      { label: 'People', glyph: '\u{1F4C1}', url: '../people.html' },
      { label: 'Community', glyph: '\u{1F4C1}', url: '../community.html' }
    ].concat(links.map(l => ({ label: l.label, icon: l.icon, url: l.url })));

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'desktop-icon';

      const glyph = document.createElement('div');
      glyph.className = 'desktop-icon-glyph';
      if (item.glyph) {
        glyph.textContent = item.glyph;
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
        if (item.action) item.action();
        else window.open(item.url, item.url.startsWith('mailto:') ? '_self' : '_blank');
      });
      grid.appendChild(btn);
    });
  }

  // ── button commands ───────────────────────────────────────
  const history = document.getElementById('termHistory');

  function append(html) {
    if (!history) return;
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = html;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  const COMMANDS = {
    whoami: () => escapeHtml(person.name + (person.handle ? ' (@' + person.handle + ')' : '')),
    about: () => escapeHtml(person.bio || 'no bio yet'),
    date: () => escapeHtml(new Date().toString()),
    projects: () => escapeHtml(
      projects.length
        ? projects.length + (projects.length === 1 ? ' project' : ' projects') + ': ' + projects.map(p => p.name).join(', ')
        : 'no projects yet'
    ),
    // one line per link, so newlines need to become real breaks — html
    // collapses a bare \n into a space
    links: () => escapeHtml(
      links.length
        ? links.map(l => l.label + ' → ' + l.url).join('\n')
        : (person.bioLink ? person.bioLink.label + ' → ' + person.bioLink.url : 'no links yet')
    ).replace(/\n/g, '<br>')
  };

  const buttons = document.getElementById('termButtons');
  if (buttons) {
    buttons.addEventListener('click', e => {
      const btn = e.target.closest('.term-btn');
      if (!btn) return;
      const cmd = btn.dataset.cmd;

      if (cmd === 'clear') {
        if (history) history.innerHTML = '';
        return;
      }

      append('<span class="prompt">$</span> ' + escapeHtml(cmd));
      const out = COMMANDS[cmd];
      append(out ? '<span class="out">' + out() + '</span>' : '');
    });
  }
})();
