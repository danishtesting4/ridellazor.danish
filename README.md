# about-me site

Static, config-driven personal site. No build step — edit `config.json`, push, done.

## Structure

```
index.html      — page shell
style.css       — terminal-themed styling
script.js       — reads config.json and renders name/desc/pfp/links
config.json     — YOUR CONTENT: name, description, links, pfp path
pfp/            — put your profile picture here (avatar.jpg)
cdn/            — drop images here to get free jsDelivr CDN links (see cdn/README.md)
```

## Edit your info

Open `config.json`:

```json
{
  "name": "RidelL",
  "handle": "RidelLazor",
  "description": "your one-line description",
  "pfp": "pfp/avatar.jpg",
  "links": [
    { "label": "GitHub", "url": "https://github.com/RidelLazor", "icon": "https://www.google.com/s2/favicons?domain=github.com&sz=64" }
  ]
}
```

To add a link, add another object to `links`. The `icon` field uses Google's
free favicon service — just swap `domain=` for the site you're linking to and
it'll fetch that site's favicon automatically. No need to source icons yourself.

## Deploy on GitHub Pages

1. Create a repo named exactly `RidelLazor.github.io` (must match your GitHub username for the root domain)
2. Push everything in this folder to the `main` branch
3. Repo → **Settings → Pages** — it should auto-detect and deploy from `main`
4. Live at `https://RidelLazor.github.io` within a minute or two

## Optional: custom subdomain via is-a.dev

Once the site is live on GitHub Pages, you can point an `is-a.dev` subdomain
at it by submitting a PR to `is-a-dev/register` with a CNAME record pointing
to `RidelLazor.github.io`.

## Free CDN for images

See `cdn/README.md` — drop any image in `cdn/`, push, and you get a permanent
jsDelivr CDN link to share anywhere.
