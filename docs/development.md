# Development

## Repository layout

```text
.
├── assets/
│   ├── data/parks.json
│   └── images/parks/
├── backend/
│   ├── api/submissions.js
│   ├── lib/
│   └── test/
├── css/
├── data/parks/
├── docs/
├── js/
├── scripts/
├── contribute.html
├── index.html
├── package.json
└── mkdocs.yml
```

## Root npm scripts

| Script | Purpose |
|---|---|
| `npm run build` | Validate data, build aggregate data, copy static output to `dist/` |
| `npm run build:data` | Build `assets/data/parks.json` from `data/parks/*.json` |
| `npm run validate:data` | Validate source park data |
| `npm run migrate:data` | Migrate old aggregate data into per-park files |
| `npm run lint` | Lint frontend and scripts |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format files with Prettier |
| `npm run images` | Optimize new or changed raw images |
| `npm run images:clean` | Rebuild all optimized images |

## Backend scripts

From `backend/`:

| Script | Purpose |
|---|---|
| `npm run start` | Run `vercel dev` |
| `npm run test` | Run Node test suite |

## Linting

Run from the repository root:

```bash
npm run lint
```

The current ESLint config covers:

```text
js/**/*.js
scripts/**/*.mjs
```

## Formatting

```bash
npm run format
```

## Backend tests

```bash
cd backend
npm run test
```

Test files:

```text
backend/test/images.test.js
backend/test/schema.test.js
backend/test/github.test.js
```

## Local backend testing

The API functions need GitHub App credentials to talk to the repository.
`vercel dev` injects env vars into the function runtime from the Vercel
project's **Development** environment, so the simplest setup is to store those
secrets there once. (Vercel only allows *non-sensitive* variables in
Development, so the private key is stored as non-sensitive there — keep the
sensitive copy in Preview/Production.)

### 1. Add the env vars to the Vercel Development environment

From `backend/`, run these once (the values are the same ones you would put in
`.env.local`):

```bash
vercel env add ALLOWED_ORIGINS development --value "http://localhost:3000,http://localhost:8000,https://mc-marcocheng.github.io"
vercel env add GITHUB_REPO_OWNER development --value "mc-marcocheng"
vercel env add GITHUB_REPO_NAME development --value "hk-park-searcher"
vercel env add GITHUB_APP_ID development --value "..."
vercel env add GITHUB_APP_INSTALLATION_ID development --value "..."
```

For the multiline `GITHUB_APP_PRIVATE_KEY`, pipe the key (with real newlines) via
stdin — `--value` cannot carry newlines:

```bash
# write the key (with real newlines) to a temp file, then:
vercel env add GITHUB_APP_PRIVATE_KEY development --no-sensitive < private-key.pem
```

After adding, confirm with `vercel env ls` that all six appear under
`Development`.

> **Note:** `vercel dev` also writes a `.env.local` in the directory it is
> launched from. Run it from `backend/` (not the repo root) and delete any stray
> root-level `.env.local` so the right project is linked.

### 2. Start the backend

```bash
cd backend
npm run start -- --yes --listen=3000
# => Ready! Available at http://localhost:3000
```

`npm run start` runs `vercel dev`, which now pulls the Development env vars and
injects them into the functions automatically — no extra launcher needed.

### 3. Serve the frontend

```bash
# from the repo root
npx serve . -l 8000
# or
python -m http.server 8000
```

Then open `http://localhost:8000/contribute.html`.

### 4. Skip Turnstile locally

Cloudflare Turnstile is not configured for local development. The backend
already accepts any non-empty `turnstileToken` when `TURNSTILE_SECRET_KEY` is
unset. To stop the frontend from rendering the widget, set in
`js/contribution-config.js`:

```javascript
disableTurnstile: true,
```

The frontend then sends a dummy `local-dev` token, which the backend accepts.

### 5. Point the frontend at the local backend (optional)

The frontend auto-detects local development: when served from `localhost`,
`127.0.0.1`, or `[::1]` it calls the local backend at
`http://localhost:3000/...` instead of the deployed endpoints, so requests are
not blocked by the deployed API's CORS allow-list. Make sure `localhost:8000`
(the frontend's origin) is in the backend's `ALLOWED_ORIGINS` (it is, by the
value added in step 1). No manual config edit is needed.

## Documentation development

Install docs dependencies:

```bash
pip install mkdocs-material pymdown-extensions
```

Serve locally:

```bash
mkdocs serve
```

Build:

```bash
mkdocs build
```

## Contribution branch diff checker

The repository includes:

```text
scripts/check-contribution-diff.mjs
```

It validates generated contribution branches. It expects:

- Branch name like `contribution/park-YYYYMMDD-xxxxxxxx`
- Exactly one added park JSON file
- Only added files
- Images only under the generated park image folders
- Matching `med` and `thumb` WebP image pairs
- No unreferenced images
- Park JSON ID matching its filename

It is intended for CI usage with environment variables:

```bash
BASE_SHA="..."
HEAD_SHA="..."
HEAD_REF="contribution/park-20260101-abcdef12"
node scripts/check-contribution-diff.mjs
```

## Adding new equipment types

If a new equipment type is added, update all relevant catalogues:

- `js/dict.js`
- `js/contribution-catalog.js`
- `backend/lib/catalog.js`
- `scripts/validate-parks.mjs`
- Documentation tables in `docs/data-and-images.md`

Also update any UI copy and examples as needed.
