function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';

  if (!projects.length) {
    grid.innerHTML = '<p class="projects-empty">(no projects yet — add some to projects.json)</p>';
    return;
  }

  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';

    const head = document.createElement('div');
    head.className = 'project-card-head';

    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = p.name || 'Untitled';
    head.appendChild(name);

    if (p.status) {
      const status = document.createElement('span');
      status.className = 'project-status';
      status.textContent = p.status;
      head.appendChild(status);
    }

    card.appendChild(head);

    if (p.description) {
      const desc = document.createElement('p');
      desc.className = 'project-desc';
      desc.textContent = p.description;
      card.appendChild(desc);
    }

    if (p.tags && p.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'project-tags';
      p.tags.forEach(t => {
        const tag = document.createElement('span');
        tag.className = 'project-tag';
        tag.textContent = t;
        tags.appendChild(tag);
      });
      card.appendChild(tags);
    }

    if (p.url) {
      const link = document.createElement('a');
      link.className = 'project-link';
      link.href = p.url;
      const isExternal = /^https?:\/\//i.test(p.url);
      if (isExternal) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      link.textContent = 'view →';
      card.appendChild(link);
    }

    grid.appendChild(card);
  });
}

fetch('projects.json')
  .then(res => res.json())
  .then(renderProjects)
  .catch(err => {
    console.error('Could not load projects.json', err);
    document.getElementById('projectsGrid').innerHTML =
      '<p class="projects-empty">could not load projects.json</p>';
  });

// ── window controls (same behavior as the home page) ─────────
const term = document.getElementById('term');
const desktop = document.getElementById('desktop');
const btnMin = document.getElementById('btnMin');
const btnMax = document.getElementById('btnMax');
const btnClose = document.getElementById('btnClose');
const restoreBtn = document.getElementById('restoreBtn');

function renderDesktopIcons() {
  const grid = document.getElementById('desktopIcons');
  grid.innerHTML = '';

  const items = [
    { label: 'Home', url: '../' },
    { label: 'Terminal', isTerminal: true }
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';

    const glyph = document.createElement('div');
    glyph.className = 'desktop-icon-glyph';
    glyph.textContent = item.isTerminal ? '>_' : '⌂';

    const label = document.createElement('span');
    label.textContent = item.label;

    btn.appendChild(glyph);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      if (item.isTerminal) {
        restoreTerm();
      } else {
        window.location.href = item.url;
      }
    });
    grid.appendChild(btn);
  });
}
renderDesktopIcons();

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
