# Show Log

A personal, searchable record of every concert and sporting event I can remember.
Static site, no build step. An editorial-index layout (one line per show, big names,
ghosted year) with a most-seen leaderboard, top venues/cities, a by-year recap, and
YouTube + Setlist.fm links per event.

Same zero-build stack as Wine Life: vanilla HTML/CSS/JS, data in `data/events.json`,
a built-in `editor.html`, and `noindex` so it stays out of search.

## Add or edit events
Open `editor.html` (over a local server, see below). It edits a working copy in your
browser, then `Export events.json` and drop the file into `data/`, then commit. You can
also hand-edit `data/events.json` directly. Missing fields render as a dash.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000 (the editor is at http://localhost:8000/editor.html).
Opening the file directly with `file://` will not work, since the data loads via `fetch`.

## Hosting
Public-but-unlisted on GitHub Pages: the `noindex` meta tag plus `robots.txt` keep it
out of search results, though the repo itself is still public. Keep anything private out
of `events.json` (the `notes` field especially).

## Files
- `index.html` — the journal (controls + the three layouts)
- `editor.html` — add/edit form (localStorage working copy, exports JSON)
- `css/styles.css` — theme, layouts, and editor styles
- `js/data.js` — shared helpers (`window.SL`): search, links, formatting, data load
- `js/app.js` — journal: search, filters, stats, renderers
- `js/editor.js` — the editor
- `data/events.json` — the data (hand-editable)
