const { defineConfig } = require('vite');
const fs = require('node:fs');
const path = require('node:path');

function collectEntries() {
  const entries = {};
  const add = (rel) => {
    const abs = path.resolve(__dirname, rel);
    if (!fs.existsSync(abs)) return;
    const key = rel.replace(/\.html$/, '').replace(/[\\/]/g, '-');
    entries[key] = abs;
  };
  add('index.html');
  const pagesDir = path.resolve(__dirname, 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir)) {
      if (f.endsWith('.html')) add(path.join('pages', f));
    }
    const peopleDir = path.join(pagesDir, 'people');
    if (fs.existsSync(peopleDir)) {
      for (const slug of fs.readdirSync(peopleDir, { withFileTypes: true })) {
        if (!slug.isDirectory()) continue;
        const idx = path.join(peopleDir, slug.name, 'index.html');
        if (fs.existsSync(idx)) add(path.join('pages', 'people', slug.name, 'index.html'));
      }
    }
  }
  return entries;
}

module.exports = defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: collectEntries()
    }
  }
});
