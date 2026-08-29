# cdn/

This folder doubles as your free image CDN, once this repo is pushed to GitHub.

## How to get a CDN link

1. Drop any image (or file) in this `cdn/` folder — e.g. `cdn/photo.jpg`
2. Commit and push it to GitHub
3. Your CDN link is:

```
https://cdn.jsdelivr.net/gh/RidelLazor/ridellazor.danishl@main/cdn/photo.jpg
```

Replace `<REPO-NAME>` with whatever you name this repo (e.g. `RidelLazor.github.io`
if you're using it as your GitHub Pages root).

## Why jsDelivr

- Free, no signup, no rate-limit headaches for personal use
- Backed by a real CDN (edge-cached, fast worldwide)
- Works for any public GitHub repo file — images, JSON, fonts, whatever
- Updates whenever you push a new commit to `main` (there's also a versioned
  `@<commit-hash>` form if you want a link that never changes)

## Example

If you push `cdn/banner.png`, the shareable link is:

```
https://cdn.jsdelivr.net/gh/RidelLazor/RidelLazor.github.io@main/cdn/banner.png
```

Paste that anywhere — Discord, a README, another site — and it'll load fast
without hotlinking straight from `raw.githubusercontent.com` (which throttles).
