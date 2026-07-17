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
```

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
