#!/usr/bin/env node
'use strict';

// adds or updates a person in pages/people.json, then regenerates
//   pages/people/<slug>.html   their profile page
//   pages/people.html          the index of everyone
//
//   node profile.js "<name>" ["<description>"] [--handle <h>] [--pfp <path>]
//                                   [--links "<Label|url,...>"] [--slug <slug>]
//                                   [--bio-link "<Label|url>"]
//
// everything except the name is optional, so you can add someone with just a
// name, or with a name and a picture. re-run it with the same name to edit —
// existing links, picture and projects are kept unless you pass them again.
//
//   node profile.js "Sam Doe" "makes little tools" --handle sam --pfp pfp/sam.png
//   node profile.js "Sam Doe" "makes little tools" --pfp pfp/sam.png --links "GitHub|https://github.com/sam"
//
// --pfp takes a path inside the repo, e.g. pfp/avatar.jpg or pfp/sam.png.
// --bio-link is their own link in bio page if they claimed one somewhere else
// (vaults.lol, ghosted.bio, whatever). their profile here stays the real one —
// this just puts a link to the other page on it.
//
//   node profile.js "Sam Doe" --bio-link "vaults.lol|https://vaults.lol/sam"
//
// upload.js calls refresh() so a person's project list stays current.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PEOPLE = path.join(ROOT, 'pages', 'people.json');
const PEOPLE_DIR = path.join(ROOT, 'pages', 'people');
const INDEX = path.join(ROOT, 'pages', 'people.html');
const SITE = 'RidelLazor';

const USAGE = [
  'usage: profile.js "<name>" ["<description>"]',
  '              [--handle <handle>] [--pfp <path>]',
  '              [--links "<Label|url,Label|url>"]',
  '              [--bio-link "<Label|url>"] [--slug <slug>]'
].join('\n              ');

function die(msg, showUsage) {
  console.error('profile: ' + msg);
  if (showUsage) console.error('       ' + USAGE);
  process.exit(1);
}

function readPeople() {
  if (!fs.existsSync(PEOPLE)) return [];
  const raw = fs.readFileSync(PEOPLE, 'utf8').trim();
  if (!raw) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    die('pages/people.json is not valid json (' + err.message + ') — fix it, nothing was changed');
  }
  if (!Array.isArray(data)) die('pages/people.json should contain a list, fix it and run this again');
  return data;
}

function writePeople(people) {
  fs.writeFileSync(PEOPLE, JSON.stringify(people, null, 2) + '\n');
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "GitHub|https://..., YouTube|https://..." and optionally a third field for
// the little square icon, "GitHub|https://github.com/x|https://icon.url"
function parseLinks(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(',').map(part => {
    const bits = part.split('|');
    if (bits.length < 2 || !bits[0].trim() || !bits[1].trim()) {
      die('bad link "' + part.trim() + '" — expected Label|url', true);
    }
    return {
      label: bits[0].trim(),
      url: bits[1].trim(),
      icon: (bits[2] || '').trim() || undefined
    };
  }).filter(l => l.url);
}

// their other page, e.g. "vaults.lol|https://vaults.lol/sam". must be a real
// web address, otherwise a typo would quietly produce a dead link.
function parseBioLink(raw) {
  if (!raw || !raw.trim()) return null;
  const parts = parseLinks(raw);
  if (parts.length !== 1) die('--bio-link takes exactly one link, like "vaults.lol|https://vaults.lol/sam"', true);
  const link = parts[0];
  if (!isExternal(link.url)) die('--bio-link needs a full http(s) url, got "' + link.url + '"', true);
  return link;
}

function isExternal(url) {
  return /^https?:\/\//i.test(url || '');
}

// uploads store local paths like "community/foo.html", which are relative to
// pages/. a profile page lives one level deeper, so those need "../" prepended.
function rebase(url, prefix) {
  const u = url || '';
  return (isExternal(u) || u.startsWith('/') || u.startsWith(prefix)) ? u : prefix + u;
}

function page(head, body, scripts) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    head +
    '</head>\n<body>\n\n' + body + '\n\n' +
    (scripts || '') +
    '\n</body>\n</html>\n';
}

// JSON dropped into a <script> block must not be able to close the tag.
// \u003c is "<" as far as JSON.parse is concerned, so escaping it is invisible.
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function nav(links) {
  return '<nav class="nav">\n  <div class="nav-inner">\n' +
    '    <a class="nav-brand" href="' + links.home + '">' + SITE + '</a>\n' +
    '    <div class="nav-links">\n' +
    '      <a href="' + links.people + '">People</a>\n' +
    '      <a href="' + links.projects + '">Projects</a>\n' +
    '      <a href="' + links.home + '">Home</a>\n' +
    '    </div>\n  </div>\n</nav>';
}

function projectList(projects, prefix, emptyMessage) {
  if (!projects.length) {
    return '<p class="note">' + esc(emptyMessage) + '</p>';
  }
  return projects.map(p =>
    '<div class="item">\n' +
    '  <a class="item-name" href="' + esc(rebase(p.url, prefix)) + '"' +
      (isExternal(p.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
      esc(p.name) + '</a>\n' +
    (p.description ? '  <span class="item-desc">' + esc(p.description) + '</span>\n' : '') +
    '</div>'
  ).join('\n');
}

// a link row, same shape as the "ls links/" rows on the home page
function linkRow(link, note, extraClass) {
  return '    <li><a href="' + esc(link.url) + '"' +
    (isExternal(link.url) ? ' target="_blank" rel="noopener noreferrer"' : '') +
    (extraClass ? ' class="' + extraClass + '"' : '') + '>' +
    (link.icon ? '<img src="' + esc(link.icon) + '" alt="" loading="lazy"> ' : '') +
    esc(link.label) +
    (note ? '<span class="ls-desc">' + esc(note) + '</span>' : '') +
    '</a></li>';
}

function buildProfilePage(person) {
  // this page lives at pages/people/<slug>.html and uses the site's terminal
  // theme, same as the home page. the person is baked in, so no fetch needed.
  const handle = person.handle || person.slug;
  const links = person.links || [];
  const projects = person.projects || [];

  const body = [
    '<main class="term" id="term">',
    '  <div class="term-bar">',
    '    <span class="term-title">' + esc(handle) + '@site: ~</span>',
    '    <div class="win-controls">',
    '      <span class="win-btn" id="btnMin" title="Minimize">\u2013</span>',
    '      <span class="win-btn" id="btnMax" title="Maximize">\u25A2</span>',
    '      <span class="win-btn win-close" id="btnClose" title="Close">\u00D7</span>',
    '    </div>',
    '  </div>',
    '',
    '  <div class="term-body" id="termBody">',
    '    <div class="line prompt-line"><span class="prompt">$</span> whoami</div>',
    '',
    '    <div class="identity">',
    person.avatar
      ? '      <img class="pfp" src="../../' + esc(person.avatar) + '" alt="' + esc(person.name) + ' profile picture">'
      : '      <img class="pfp" src="../../pfp/avatar.jpg" alt="">',
    '      <div class="identity-text">',
    '        <h1>' + esc(person.name) + '</h1>',
    person.handle ? '        <p class="handle">@' + esc(person.handle) + '</p>' : '',
    person.bio ? '        <p class="desc">' + esc(person.bio) + '</p>' : '',
    '      </div>',
    '    </div>',
    '',
    '    <div class="line prompt-line"><span class="prompt">$</span> ls links/</div>',
    links.length
      ? '    <ul class="ls">\n' + links.map(l => linkRow(l)).join('\n') + '\n    </ul>'
      : '    <p class="empty">nothing here yet</p>',
    '',
    // their page elsewhere, kept below our own links so this page still reads
    // as the real one
    person.bioLink
      ? '    <div class="line prompt-line"><span class="prompt">$</span> cat bio-page.txt</div>\n' +
        '    <ul class="ls">\n' + linkRow(person.bioLink, 'their link in bio', 'leaving') + '\n    </ul>\n'
      : '',
    '',
    '    <div class="line prompt-line"><span class="prompt">$</span> ls projects/</div>',
    projects.length
      ? '    <ul class="ls">\n' + projects.map(p =>
          '      <li><a href="' + esc(rebase(p.url, '../')) + '"' +
          (isExternal(p.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          esc(p.name) + '</a></li>'
        ).join('\n') + '\n    </ul>\n' +
        projects.filter(p => p.description).map(p => '    <p class="ls-note">' + esc(p.name) + ' \u2014 ' + esc(p.description) + '</p>').join('\n')
      : '    <p class="empty">no projects yet</p>',
    '',
    '    <div class="line prompt-line"><span class="prompt">$</span> cd ..</div>',
    '    <div class="line"><a class="nav-link" href="../people.html">people/</a></div>',
    '    <div class="line"><a class="nav-link" href="../community.html">community/</a></div>',
    '    <div class="line"><a class="nav-link" href="../../">home/</a></div>',
    '',
    '    <div class="term-buttons" id="termButtons">',
    '      <button class="term-btn" data-cmd="whoami">whoami</button>',
    '      <button class="term-btn" data-cmd="about">about</button>',
    '      <button class="term-btn" data-cmd="projects">projects</button>',
    '      <button class="term-btn" data-cmd="links">links</button>',
    '      <button class="term-btn" data-cmd="date">date</button>',
    '      <button class="term-btn" data-cmd="clear">clear</button>',
    '    </div>',
    '',
    '    <div class="term-history" id="termHistory"></div>',
    '  </div>',
    '</main>',
    '',
    '<div class="desktop" id="desktop">',
    '  <div class="desktop-icons" id="desktopIcons"></div>',
    '  <button class="taskbar-item" id="restoreBtn">',
    '    <span class="taskbar-dot"></span> ' + esc(handle) + '@site: ~',
    '  </button>',
    '</div>'
  ].filter(line => line !== undefined && line !== '').join('\n');

  return page(
    '<title>whoami</title>\n' +
    '<link rel="icon" href="../../pfp/avatar.jpg">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="../../style.css">\n' +
    '<link rel="stylesheet" href="term.css">\n' +
    '<script id="personData" type="application/json">' + safeJson(person) + '</' + 'script>',
    body,
    '<script src="../window.js"></' + 'script>\n<script src="term.js"></' + 'script>'
  );
}

function buildIndex(people) {
  const body = [
    nav({ home: '../', projects: './', people: './people.html' }),
    '',
    '<main class="main">',
    '',
    '  <h1>People</h1>',
    '  <p class="sub">Everyone who has sent something in.</p>',
    '',
    people.length
      ? '  <p class="count">' + (people.length === 1 ? '1 person' : people.length + ' people') + '</p>\n\n' +
        people.map(p =>
          '<div class="item">\n' +
          '  <a class="item-name" href="people/' + esc(p.slug) + '.html">' + esc(p.name) + '</a>\n' +
          (p.handle ? '  <span class="item-by">@' + esc(p.handle) + '</span>\n' : '') +
          '  <span class="item-desc">' +
            (p.projects.length === 1 ? '1 project' : p.projects.length + ' projects') +
          '</span>\n' +
          '</div>'
        ).join('\n')
      : '  <p class="note">No profiles yet. Run profile.js to add one.</p>',
    '',
    '</main>'
  ].join('\n');

  return page(
    '<title>People — ' + SITE + '</title>\n' +
    '<link rel="icon" href="../pfp/avatar.jpg">\n' +
    '<link rel="stylesheet" href="site.css">',
    body
  );
}

// regenerate a person's page (and the index) without touching their details
function refresh(slug) {
  const people = readPeople();
  const person = people.find(p => p.slug === slug);
  if (!person) return false;
  person.projects = person.projects || [];
  fs.mkdirSync(PEOPLE_DIR, { recursive: true });
  fs.writeFileSync(path.join(PEOPLE_DIR, slug + '.html'), buildProfilePage(person));
  fs.writeFileSync(INDEX, buildIndex(people));
  return true;
}

function findByAuthor(people, author) {
  if (!author) return null;
  const needle = author.trim().toLowerCase();
  return people.find(p =>
    p.slug.toLowerCase() === needle ||
    String(p.name || '').toLowerCase() === needle ||
    String(p.handle || '').toLowerCase() === needle
  ) || null;
}

// name and description are positional, the rest are flags. that way you never
// have to leave an empty slot to reach the picture, which is the fiddly bit.
function parseArgs(argv) {
  // null means "flag not passed" — so a re-run keeps whatever was already set
  const flags = { handle: '', pfp: '', links: '', bioLink: null, slug: '' };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2).toLowerCase();

    if (key === 'handle') flags.handle = argv[++i] || '';
    else if (key === 'pfp' || key === 'avatar') flags.pfp = argv[++i] || '';
    else if (key === 'links') flags.links = argv[++i] || '';
    else if (key === 'bio-link' || key === 'biolink' || key === 'elsewhere') flags.bioLink = argv[++i] ?? '';
    else if (key === 'slug') flags.slug = argv[++i] || '';
    else if (key === 'help' || key === 'h') { console.log(USAGE); process.exit(0); }
    else die('unknown option "' + arg + '"', true);
  }

  if (positional.length > 2) die('too many arguments — name and description only', true);

  return {
    name: (positional[0] || '').trim(),
    bio: (positional[1] || '').trim(),
    handle: flags.handle.trim().replace(/^@/, ''),
    pfp: flags.pfp.trim(),
    links: flags.links,
    bioLink: flags.bioLink,
    slug: flags.slug.trim()
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name) die('a name is required', true);

  const slug = slugify(args.slug || args.name);
  if (!slug) die('"' + (args.slug || args.name) + '" does not make a usable slug — use letters and numbers', true);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('slug "' + slug + '" is not allowed', true);

  if (args.pfp) {
    const rel = args.pfp.replace(/\\/g, '/').replace(/^\.\//, '');
    const onDisk = path.resolve(ROOT, rel);
    if (!fs.existsSync(onDisk)) die('picture not found: ' + rel + '  (use a path inside the repo, e.g. pfp/avatar.jpg)', true);
    args.pfp = rel;
  }

  const links = parseLinks(args.links);
  const bioLink = parseBioLink(args.bioLink);
  const people = readPeople();

  // an explicit --slug picks that person, otherwise match on an existing name
  let at = args.slug ? people.findIndex(p => p.slug === slug)
                     : people.findIndex(p => String(p.name || '').toLowerCase() === args.name.toLowerCase());
  const existed = at !== -1;

  const person = existed ? people[at] : { slug: slug, projects: [] };
  person.slug = slug;
  person.name = args.name;
  person.handle = args.handle;
  person.bio = args.bio;
  if (links.length) person.links = links;
  else if (!person.links) person.links = [];
  if (bioLink) person.bioLink = bioLink;
  if (args.pfp) person.avatar = args.pfp;
  person.projects = person.projects || [];

  if (existed) people[at] = person;
  else people.push(person);

  writePeople(people);
  fs.mkdirSync(PEOPLE_DIR, { recursive: true });
  fs.writeFileSync(path.join(PEOPLE_DIR, slug + '.html'), buildProfilePage(person));
  fs.writeFileSync(INDEX, buildIndex(people));

  console.log((existed ? 'updated ' : 'created ') + person.name + (person.handle ? '  (@' + person.handle + ')' : ''));
  console.log('  profile  pages/people/' + slug + '.html');
  console.log('  index    pages/people.html');
  console.log('  list     pages/people.json');
}

module.exports = { refresh, findByAuthor, readPeople, writePeople };

if (require.main === module) main();
