#!/usr/bin/env node
'use strict';

// each person is a folder, laid out like the site root:
//
//   pages/people/<slug>/config.json      name, handle, links, bio link  (you edit)
//   pages/people/<slug>/description.txt  their bio                     (you edit)
//   pages/people/<slug>/pfp/…            their picture, copied in
//   pages/people/<slug>/projects.json    what they've sent in         (upload.js writes)
//   pages/people/<slug>/index.html       their page                   (generated)
//
// plus pages/people.html, the index of everyone (generated).
//
//   node profile.js "<name>" ["<description>"] [--handle <h>] [--pfp <path>]
//                                   [--links "<Label|url,...>"] [--slug <slug>]
//                                   [--bio-link "<Label|url>"]
//
// everything except the name is optional, so you can add someone with just a
// name, or with a name and a picture. re-run it with the same name to edit —
// their links, picture and projects are kept unless you pass them again.
//
//   node profile.js "Sam Doe" "makes little tools" --handle sam --pfp sam.png
//   node profile.js "Sam Doe" --links "GitHub|https://github.com/sam"
//   node profile.js "Sam Doe" --bio-link "vaults.lol|https://vaults.lol/sam"
//
// --pfp can be any path on your machine; the picture is copied into that
// person's folder so the folder stays self contained.
// --bio-link is their own link in bio page if they claimed one somewhere else
// (vaults.lol, ghosted.bio, whatever). their profile here stays the real one —
// this just puts a link to the other page on it.
//
// every run commits and pushes, so a codespace needs no extra steps. --no-push
// turns that off if you want to batch a few people into one commit.
//
// upload.js calls refresh() so a person's project list stays current.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PEOPLE_DIR = path.join(ROOT, 'pages', 'people');
const INDEX = path.join(ROOT, 'pages', 'people.html');
const SITE = 'RidelLazor';

const USAGE = [
  'usage: profile.js "<name>" ["<description>"]',
  '              [--handle <handle>] [--pfp <path>]',
  '              [--links "<Label|url,Label|url>"]',
  '              [--bio-link "<Label|url>"] [--slug <slug>] [--no-push]'
].join('\n              ');

function die(msg, showUsage) {
  console.error('profile: ' + msg);
  if (showUsage) console.error('       ' + USAGE);
  process.exit(1);
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

function isExternal(url) {
  return /^https?:\/\//i.test(url || '');
}

// uploads store paths like "community/foo.html" relative to pages/. a profile
// page lives at pages/people/<slug>/, so those need "../../" in front.
function rebase(url, prefix) {
  const u = url || '';
  return (isExternal(u) || u.startsWith('/') || u.startsWith(prefix)) ? u : prefix + u;
}

function personDir(slug) {
  return path.join(PEOPLE_DIR, slug);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    die(path.relative(ROOT, file) + ' is not valid json (' + err.message + ') — fix it, nothing was changed');
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

// ── reading and writing one person ─────────────────────────────
function readPerson(slug) {
  const dir = personDir(slug);
  if (!fs.existsSync(path.join(dir, 'config.json'))) return null;

  const config = readJson(path.join(dir, 'config.json'), {});
  const descFile = path.join(dir, 'description.txt');
  const projects = readJson(path.join(dir, 'projects.json'), []);

  return {
    slug: slug,
    name: config.name || slug,
    handle: config.handle || '',
    bio: fs.existsSync(descFile) ? fs.readFileSync(descFile, 'utf8').trim() : '',
    links: Array.isArray(config.links) ? config.links : [],
    bioLink: config.bioLink || null,
    discordId: config.discordId || null,
    avatar: config.pfp || null,
    projects: Array.isArray(projects) ? projects : []
  };
}

function writePerson(person) {
  const dir = personDir(person.slug);
  fs.mkdirSync(path.join(dir, 'pfp'), { recursive: true });

  // config.json holds only what you edit by hand; projects live in their own
  // file so upload.js and you never overwrite each other
  const config = { name: person.name };
  if (person.handle) config.handle = person.handle;
  if (person.links && person.links.length) config.links = person.links;
   if (person.bioLink) config.bioLink = person.bioLink;
   if (person.discordId) config.discordId = person.discordId;
   if (person.avatar) config.pfp = person.avatar;
  writeJson(path.join(dir, 'config.json'), config);

  fs.writeFileSync(path.join(dir, 'description.txt'), (person.bio || '') + '\n');

  if (!fs.existsSync(path.join(dir, 'projects.json'))) {
    writeJson(path.join(dir, 'projects.json'), person.projects || []);
  }
}

function writeProjects(slug, projects) {
  writeJson(path.join(personDir(slug), 'projects.json'), projects);
}

// every folder with a config.json is a person — the folder is the source of
// truth, so there is no central list to drift out of sync
function listPeople() {
  if (!fs.existsSync(PEOPLE_DIR)) return [];
  return fs.readdirSync(PEOPLE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => readPerson(d.name))
    .filter(Boolean)
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

// ── arguments ──────────────────────────────────────────────────
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

// copy their picture into the person's own folder so it travels with the
// profile. returns the path to record in config.json.
function storePicture(slug, source) {
  const abs = path.resolve(source);
  if (!fs.existsSync(abs)) die('picture not found: ' + source, true);
  if (!fs.statSync(abs).isFile()) die('picture is not a file: ' + source, true);

  const destDir = path.join(personDir(slug), 'pfp');
  fs.mkdirSync(destDir, { recursive: true });

  const name = path.basename(abs);
  const dest = path.join(destDir, name);

  // already there — don't copy a file onto itself
  if (path.resolve(dest) === abs) return 'pfp/' + name;

  fs.copyFileSync(abs, dest);
  return 'pfp/' + name;
}

// name and description are positional, the rest are flags. that way you never
// have to leave an empty slot to reach the picture, which is the fiddly bit.
function parseArgs(argv) {
  // null means "flag not passed" — so a re-run keeps whatever was already set
  const flags = { handle: '', pfp: '', links: '', bioLink: null, slug: '', push: true };
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
    else if (key === 'no-push' || key === 'nopush') flags.push = false;
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
    slug: flags.slug.trim(),
    push: flags.push
  };
}

// ── committing and pushing ─────────────────────────────────────
// the files are already written by the time we get here, so a push that fails
// must not lose the work — it reports what to run by hand and carries on.
function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
}

function gitWhy(err) {
  return String((err && (err.stderr || err.message)) || err).trim().split('\n')[0];
}

// a codespace often has no user.name/user.email set, and plain `git commit`
// would then fail. rather than invent an identity, reuse whoever made the last
// commit, so the new commit looks like the rest of the history.
function gitIdentity() {
  try {
    if (git(['config', 'user.email']).trim()) return [];
  } catch (err) { /* no config, fall through */ }
  try {
    const [name, email] = git(['log', '-1', '--format=%an%x00%ae']).split('\x00');
    if (email) return ['-c', 'user.name=' + name.trim(), '-c', 'user.email=' + email.trim()];
  } catch (err) { /* no commits yet, let git decide */ }
  return [];
}

function commitAndPush(person, created, message) {
  // stage all modified tracked files (so dev edits to profile.js / upload.js
  // never get left behind), plus any new or changed files in the pages area.
  const paths = [
    'pages/community',
    'pages/community.json',
    'pages/people.html',
    'pages/people/index.json',
    'pages/people/' + person.slug
  ];
  try {
    git(['add', '-u']);
    git(['add', '--'].concat(paths));
  } catch (err) {
    console.log('  git     could not stage: ' + gitWhy(err));
    console.log('          the files are written, so finish it by hand');
    return;
  }

  if (message === undefined) {
    message = (created ? 'Add ' : 'Update ') + person.name + (person.handle ? ' (@' + person.handle + ')' : '');
  }

  try {
    git(['rev-parse', '--is-inside-work-tree']);
  } catch (err) {
    console.log('  git     not a git repo, so nothing was pushed');
    return;
  }

  let branch;
  try {
    branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();

    // a re-run that changed nothing should not make an empty commit
    if (!git(['diff', '--cached', '--name-only']).trim()) {
      console.log('  git     nothing changed, nothing to commit');
      return;
    }

    git(gitIdentity().concat(['commit', '-q', '-m', message]));
    const sha = git(['rev-parse', '--short', 'HEAD']).trim();
    git(['push', '-q', 'origin', branch]);
    console.log('  git     ' + sha + '  ' + message);
  } catch (err) {
    console.log('  git     could not push: ' + gitWhy(err));
    console.log('          the files are written, so finish it by hand:');
    console.log('            git add -u');
    console.log('            git add ' + paths.join(' '));
    console.log('            git commit -m "' + message.replace(/"/g, '') + '"');
    console.log('            git push origin ' + (branch || 'main'));
  }
}

// ── page building ──────────────────────────────────────────────
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
  // lives at pages/people/<slug>/index.html and uses the site's terminal theme,
  // same as the home page. the person is baked in, so there is no fetch.
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
    // their picture sits in their own folder, next to this page
    person.avatar
      ? '      <img class="pfp" src="' + esc(person.avatar) + '" alt="' + esc(person.name) + ' profile picture">'
      : '      <img class="pfp" src="../../../pfp/avatar.jpg" alt="">',
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
          '      <li><a href="' + esc(rebase(p.url, '../../')) + '"' +
          (isExternal(p.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          esc(p.name) + '</a></li>'
        ).join('\n') + '\n    </ul>\n' +
        projects.filter(p => p.description).map(p => '    <p class="ls-note">' + esc(p.name) + ' \u2014 ' + esc(p.description) + '</p>').join('\n')
       : '    <p class="empty">no projects yet</p>',
    '',
    '    <div class="line prompt-line"><span class="prompt">$</span> check discord</div>',
    '    <div class="line"><span class="out" id="discordPresence">checking…</span></div>',

    '',
    '    <div class="line prompt-line"><span class="prompt">$</span> cd ..</div>',
    '    <div class="line"><a class="nav-link" href="../../people.html">people/</a></div>',
    '    <div class="line"><a class="nav-link" href="../../community.html">community/</a></div>',
    '    <div class="line"><a class="nav-link" href="../../../">home/</a></div>',
    '',
    '    <div class="term-buttons" id="termButtons">',
    '      <button class="term-btn" data-cmd="whoami">whoami</button>',
    '      <button class="term-btn" data-cmd="about">about</button>',
    '      <button class="term-btn" data-cmd="projects">projects</button>',
    '      <button class="term-btn" data-cmd="links">links</button>',
    '      <button class="term-btn" data-cmd="date">date</button>',
    '      <button class="term-btn" data-cmd="discord">discord</button>',
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
    '<link rel="icon" href="../../../pfp/avatar.jpg">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="../../../style.css">\n' +
    '<link rel="stylesheet" href="../term.css">\n' +
    '<script id="personData" type="application/json">' + safeJson(person) + '</' + 'script>',
    body,
    '<script src="../../window.js"></' + 'script>\n<script src="../term.js"></' + 'script>'
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
          '  <a class="item-name" href="people/' + esc(p.slug) + '/">' + esc(p.name) + '</a>\n' +
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

// the community list is built in the browser, and github pages cannot list a
// directory, so publish just enough to map an author name to a profile folder.
// generated alongside people.html — the folders stay the source of truth.
function writeIndexJson(people) {
  fs.writeFileSync(
    path.join(PEOPLE_DIR, 'index.json'),
    JSON.stringify(people.map(p => ({ slug: p.slug, name: p.name, handle: p.handle })), null, 2) + '\n'
  );
}

function writeIndexPage() {
  const people = listPeople();
  fs.writeFileSync(INDEX, buildIndex(people));
  writeIndexJson(people);
}

// regenerate a person's page (and the index) without touching their details
function refresh(slug) {
  const person = readPerson(slug);
  if (!person) return false;
  fs.writeFileSync(path.join(personDir(slug), 'index.html'), buildProfilePage(person));
  writeIndexPage();
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name) die('a name is required', true);

  const slug = slugify(args.slug || args.name);
  if (!slug) die('"' + (args.slug || args.name) + '" does not make a usable slug — use letters and numbers', true);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('slug "' + slug + '" is not allowed', true);

  // an explicit --slug picks that person, otherwise match on an existing name
  const existing = readPerson(slug) ||
    listPeople().find(p => String(p.name || '').toLowerCase() === args.name.toLowerCase());

  const links = parseLinks(args.links);
  const bioLink = parseBioLink(args.bioLink);

  const person = existing || {
    slug: slug, name: args.name, handle: '', bio: '', links: [], bioLink: null, avatar: null, projects: []
  };

  if (existing && existing.slug !== slug) {
    die('"' + args.name + '" already exists as ' + existing.slug + ' — edit that one, or pass --slug for a different person', true);
  }

  person.slug = slug;
  person.name = args.name;
  person.handle = args.handle;
  person.bio = args.bio;
  if (links.length) person.links = links;
  if (bioLink) person.bioLink = bioLink;

  if (args.pfp) person.avatar = storePicture(slug, args.pfp);

  writePerson(person);

  fs.writeFileSync(path.join(personDir(slug), 'index.html'), buildProfilePage(person));
  writeIndexPage();

  console.log((existing ? 'updated ' : 'created ') + person.name + (person.handle ? '  (@' + person.handle + ')' : ''));
  console.log('  folder   pages/people/' + slug + '/');
  console.log('  page     /people/' + slug + '/');
  console.log('  config   pages/people/' + slug + '/config.json');
  console.log('  bio      pages/people/' + slug + '/description.txt');

  if (args.push) commitAndPush(person, !existing);
  else console.log('  git      skipped (--no-push)');
}

module.exports = { refresh, findByAuthor, listPeople, readPerson, writeProjects, personDir, writeIndexPage, commitAndPush };

if (require.main === module) main();
