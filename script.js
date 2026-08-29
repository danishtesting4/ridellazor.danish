fetch('config.json')
  .then(res => res.json())
  .then(config => {
    document.title = config.name || 'whoami';

    document.getElementById('name').textContent = config.name || '';
    document.getElementById('handle').textContent = config.handle ? '@' + config.handle : '';
    document.getElementById('desc').textContent = config.description || '';

    const pfp = document.getElementById('pfp');
    pfp.src = config.pfp || 'pfp/avatar.jpg';
    pfp.alt = config.name ? config.name + ' profile picture' : 'profile picture';

    const linksEl = document.getElementById('links');
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
  })
  .catch(err => {
    console.error('Could not load config.json', err);
  });
