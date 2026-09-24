# portfolio-api

A minimalist portfolio that looks like Swagger / OpenAPI docs. Each endpoint is a real static JSON file, so visitors can hit **Execute** in the page or `curl` it directly.

No build step, no dependencies — just HTML, CSS and JS.

## Edit your content

The page is generated in the browser from **`openapi.yaml`** — edit that file to add endpoints, parameters, tags or schemas. No code changes needed.

Response data lives in `api/` as static JSON files:

| Endpoint | File |
|---|---|
| `GET /api/bio.json` | `api/bio.json` |
| `GET /api/stack.json` | `api/stack.json` |
| `GET /api/projects.json` | `api/projects.json` |
| `GET /api/experience.json` | `api/experience.json` |
| `GET /api/experience/{company}.json` | `api/experience/<company>.json` |
| `GET /api/contact.json` | `api/contact.json` |

To add an endpoint: create the JSON file, then describe it under `paths:` in `openapi.yaml`.
For a path parameter, add one file per allowed value and list the values in the parameter's `enum`.

`vendor/js-yaml.min.js` is js-yaml (MIT), bundled so there is no CDN dependency.

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
