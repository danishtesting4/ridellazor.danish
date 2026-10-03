# ridellazor.danish

RidelLazor's site. A small terminal-themed page that points at the things they
make and a list of projects sent in by other people.

- Live at https://ridellazor.dpdns.org
- Served from the `pages/` folder (GitHub Pages builds from `/pages`)

## Layout

```
pages/
  index.html            the home / terminal window       (script.js)
  people.html           index of everyone who has sent anything in
  people/               per-person folders — one per contributor
    <slug>/
      config.json       name, handle, links, bio link, discordId  (you edit)
      description.txt   their bio                                   (you edit)
      pfp/              their picture, copied in                     (you edit)
      projects.json     projects they've sent in                     (upload.js writes)
      index.html        their profile page                          (generated)
  community.html        the project list                            (community.js)
  community.json        the list itself                             (upload.js writes)
```

A person's folder is the source of truth — there is no central `people.json`.
A `discordId` in `config.json` turns on a live Discord presence line on that
person's profile (and on the home page), fetched from Lanyard.

## CLI

`profile.js` and `upload.js` both commit and push as they run, so a codespace
needs no extra steps. Use `--no-push` to stage a few changes into one commit.

```
node profile.js "<Name>" ["<bio>"] [--handle <h>] [--pfp <path>]
                    [--links "<Label|url,...>"] [--bio-link "<Label|url>"]
                    [--slug <slug>]                                   # add or update a person

node upload.js "<name>" "<description>" "<file.html>" "<author>"    # share a project
```
