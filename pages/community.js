// ── community sites ────────────────────────────────────────────
// entries are added with `node upload.js` at the repo root
function renderSites(sites) {
  const grid = document.getElementById('communityGrid');
  grid.innerHTML = '';

  if (!sites.length) {
    const empty = document.createElement('p');
    empty.className = 'projects-empty';
    empty.textContent = 'nothing here yet — mail one over';
    grid.appendChild(empty);
    return;
  }

  sites.forEach(site => {
    const card = document.createElement('div');
    card.className = 'project-card';

    const head = document.createElement('div');
    head.className = 'project-card-head';

    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = site.name || 'Untitled';
    head.appendChild(name);
    card.appendChild(head);

    if (site.by) {
      const by = document.createElement('span');
      by.className = 'site-by';
      by.textContent = 'by ' + site.by;
      card.appendChild(by);
    }

    if (site.description) {
      const desc = document.createElement('p');
      desc.className = 'project-desc';
      desc.textContent = site.description;
      card.appendChild(desc);
    }

    if (site.url) {
      const link = document.createElement('a');
      link.className = 'project-link';
      link.href = site.url;
      link.textContent = 'view →';
      if (/^https?:\/\//i.test(site.url)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      card.appendChild(link);
    }

    grid.appendChild(card);
  });
}

fetch('community.json')
  .then(res => res.json())
  .then(renderSites)
  .catch(err => {
    console.error('Could not load community.json', err);
    const grid = document.getElementById('communityGrid');
    const msg = document.createElement('p');
    msg.className = 'projects-empty';
    msg.textContent = 'could not load community.json';
    grid.appendChild(msg);
  });

// ── desktop icons ──────────────────────────────────────────────
function renderDesktopIcons() {
  const grid = document.getElementById('desktopIcons');
  grid.innerHTML = '';

  const items = [
    { label: 'Home', url: '../', glyph: '⌂' },
    { label: 'Projects', url: './', glyph: '📁' },
    { label: 'Terminal', isTerminal: true, glyph: '>_' }
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';

    const glyph = document.createElement('div');
    glyph.className = 'desktop-icon-glyph';
    glyph.textContent = item.glyph;

    const label = document.createElement('span');
    label.textContent = item.label;

    btn.appendChild(glyph);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      if (item.isTerminal) {
        window.restoreTerm();
      } else {
        window.location.href = item.url;
      }
    });
    grid.appendChild(btn);
  });
}

renderDesktopIcons();
