// community list — entries are added with `node upload.js` at the repo root

const EMAIL = 'ridellazorreply@gmail.com';

function setCount(count) {
  const el = document.getElementById('siteCount');
  if (el) el.textContent = count === 1 ? '1 project' : count + ' projects';
}

function writeNote(message) {
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = message;
  return p;
}

function renderItem(site) {
  const row = document.createElement('a');
  row.className = 'item';
  row.href = site.url || '#';

  if (/^https?:\/\//i.test(site.url || '')) {
    row.target = '_blank';
    row.rel = 'noopener noreferrer';
  }

  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = site.name || 'Untitled';
  row.appendChild(name);

  let desc = site.description || '';
  if (site.by) desc = 'by ' + site.by + (desc ? ' — ' + desc : '');
  if (desc) {
    const text = document.createElement('span');
    text.className = 'item-desc';
    text.textContent = desc;
    row.appendChild(text);
  }

  const link = document.createElement('span');
  link.className = 'item-link';
  link.textContent = /^https?:\/\//i.test(site.url || '') ? 'open →' : 'view →';
  row.appendChild(link);

  return row;
}

function render(sites) {
  const list = document.getElementById('communityList');
  if (!list) return;

  list.textContent = '';
  setCount(sites.length);

  if (!sites.length) {
    list.appendChild(writeNote('Nothing here yet. The first one is whatever you send over.'));
    return;
  }

  const frag = document.createDocumentFragment();
  sites.forEach(site => frag.appendChild(renderItem(site)));
  list.appendChild(frag);
}

fetch('community.json')
  .then(res => {
    if (!res.ok) throw new Error('community.json responded ' + res.status);
    return res.json();
  })
  .then(data => render(Array.isArray(data) ? data : []))
  .catch(err => {
    console.error('Could not load community.json', err);
    const list = document.getElementById('communityList');
    if (!list) return;
    list.textContent = '';
    setCount(0);
    list.appendChild(writeNote('Could not load the list. Try again in a moment, or mail ' + EMAIL + '.'));
  });
