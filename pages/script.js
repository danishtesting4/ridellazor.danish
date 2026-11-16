function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
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
    const g = document.getElementById('projectsGrid');
    if (g) g.innerHTML = '<p class="projects-empty">could not load projects.json</p>';
  });
