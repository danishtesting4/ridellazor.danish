#!/usr/bin/env node
'use strict';

// upload "<name>" "<description>" "<file.html>" "<author>"
//
// copies the file into pages/community/ and adds it to pages/community.json
//
//   node upload.js "Sawit RNG" "a luck based clicker" "sawit.html" "danish"
//
// all four arguments are required — the author shows up as the "by ..." line on the card

const fs = require('fs');
const path = require('path');
const { refresh, findByAuthor, listPeople, writeProjects, commitAndPush } = require('./profile.js');

const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'pages', 'community');
const LIST = path.join(ROOT, 'pages', 'community.json');

const [name, description, file, by] = process.argv.slice(2).map(arg => (arg || '').trim());

function die(msg) {
  console.error('upload: ' + msg);
  process.exit(1);
}

function show(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'site';
}

if (!name || !description || !file || !by) {
  const missing = [
    !name && '"<name>"',
    !description && '"<description>"',
    !file && '"<file.html>"',
    !by && '"<author>"'
  ].filter(Boolean).join(' ');

  die(
    'missing ' + missing + '\n' +
    'usage: node upload.js "<name>" "<description>" "<file.html>" "<author>"'
  );
}

const source = path.resolve(process.cwd(), file);
if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
  die('cannot read "' + file + '"');
}

const slug = slugify(name);
const ext = path.extname(source) || '.html';
const dest = path.join(SITE_DIR, slug + ext);

if (fs.existsSync(dest)) {
  die('pages/community/' + slug + ext + ' already exists — change the name or delete that file first');
}

// read the list before touching anything, so a broken file never gets clobbered
let list = [];
if (fs.existsSync(LIST)) {
  const raw = fs.readFileSync(LIST, 'utf8').trim();
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (err) {
      die('pages/community.json is not valid json (' + err.message + ') — fix it, nothing was changed');
    }
  }
}
if (!Array.isArray(list)) {
  die('pages/community.json should contain a list, fix it and run this again');
}

const entry = { name: name, by: by };
entry.description = description;
entry.url = 'community/' + slug + ext;

fs.mkdirSync(SITE_DIR, { recursive: true });
fs.copyFileSync(source, dest);

try {
  list.push(entry);
  fs.writeFileSync(LIST, JSON.stringify(list, null, 2) + '\n');
} catch (err) {
  fs.unlinkSync(dest);
  die('could not update pages/community.json (' + err.message + ') — copied file removed');
}

console.log('added  ' + name);
console.log('  file  ' + show(dest));
console.log('  list  ' + show(LIST));

// keep the author's profile page in step, if they have one
const people = listPeople();
const person = findByAuthor(people, by);

if (person) {
  const already = person.projects.some(p => p.name === name && p.url === entry.url);
  if (!already) {
    person.projects.push({ name: name, description: description, url: entry.url });
    writeProjects(person.slug, person.projects);
  }
  if (refresh(person.slug)) {
    console.log('  person  pages/people/' + person.slug + '/');
  }
} else {
  console.log('');
  console.log('note: no profile for "' + by + '" yet, so the name will not link anywhere.');
  console.log('      run:  node profile.js "' + by + '" "' + by + '" "' + by + '" "a line about them"');
}

if (ext === '.html' && /(?:src|href)\s*=\s*["']\.{1,2}\//i.test(fs.readFileSync(dest, 'utf8'))) {
  console.log('');
  console.log('note: that file links to local paths, which are not copied along with it.');
  console.log('      use full urls, or drop assets in pages/community/ and point at them.');
}

// push the result: everything upload just wrote, plus the author's profile
const bySlug = slugify(by);
const message = 'Add ' + name + ' to community';
if (person) {
  commitAndPush(person, false, message);
} else {
  commitAndPush({ slug: bySlug, name: by, handle: '' }, false, message);
}

