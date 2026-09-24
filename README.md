# Soumya Krishnaraj portfolio

This is a static site built from the root-level `.dc.html` pages. It uses the
included Claude design runtime (`support.js`) and locally installed React 18.
No API keys or environment variables are needed.

## Run in GitHub Codespaces

```bash
npm ci
npm run dev
```

Open forwarded port 3000. The root URL redirects to `Portfolio.dc.html`.
Codespaces may need you to make port 3000 visible in the Ports panel. The
server listens on `0.0.0.0` for port forwarding. `PORT` can override 3000.

## Production build

```bash
npm run build
npm run preview
```

The static output is in `dist/`; preview uses port 3001. Deploy the contents
of `dist/` to any static host, including Render. Keep the files and
directories together because page links and image paths are relative. The
root `index.html` redirects to the portfolio page. Google Fonts are loaded
from Google and require an internet connection; system fallbacks are present.
The build copies filled image data to `image-slots.state.json` so static hosts
can serve it without special dotfile handling.

## Render Dashboard

Create a **Static Site** from `SiddharthPh/soumya-portfolio` on branch `main`.
Leave **Root Directory** empty (the repository root). Set **Build Command** to
`npm ci && npm run build` and **Publish Directory** to `dist`. No start command,
environment variables, or redirect/rewrite rules are required. A Static Site
has no running Node server or instance plan; use Render's free static hosting
subject to your workspace's included bandwidth and build minutes.

After the deploy finishes, open the site's Render URL and check the landing
page, the Design/Research switch, About, each linked case study, page refreshes,
images, and the browser console/network panel. In particular, confirm that
`image-slots.state.json` and both `/vendor/*.js` files load successfully.

The large `Soumya Krishnaraj Portfolio*.html` files are older generated exports.
The build uses the editable `.dc.html` pages instead. `Research branch/` is
an alternate copy of those pages and is not part of the production site.
