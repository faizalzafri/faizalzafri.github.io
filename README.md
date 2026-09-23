# portfolio-api

A minimalist portfolio that looks like Swagger / OpenAPI docs. Each endpoint is a real static JSON file, so visitors can hit **Execute** in the page or `curl` it directly.

No build step, no dependencies — just HTML, CSS and JS.

## Edit your content

Everything lives in `api/`:

| Endpoint | File |
|---|---|
| `GET /api/bio.json` | `api/bio.json` |
| `GET /api/experience.json` | `api/experience.json` |
| `GET /api/stack.json` | `api/stack.json` |
| `GET /api/projects.json` | `api/projects.json` |
| `GET /api/contact.json` | `api/contact.json` |

Also replace `faizalzafri` in `index.html` (footer GitHub link).

To add an endpoint, create `api/whatever.json` and add one line to the `ENDPOINTS` array at the top of `app.js`.

## Preview locally

Browsers block `fetch()` on `file://`, so run a tiny server:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repo named **`faizalzafri.github.io`** (public).
2. Push these files to the `main` branch root:
   ```bash
   git init && git add . && git commit -m "Portfolio API"
   git branch -M main
   git remote add origin https://github.com/faizalzafri/faizalzafri.github.io.git
   git push -u origin main
   ```
3. Repo **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main` / `(root)`.
4. Live at `https://faizalzafri.github.io` within a minute or two.

The `.nojekyll` file tells GitHub Pages to serve files as-is.
