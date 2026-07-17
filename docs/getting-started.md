# Getting started

This project has two main parts:

1. A **static frontend** served from the repository root.
2. A **serverless contribution backend** in `backend/`, intended for Vercel.

The public map can run without the backend. The backend is only required for
the contribution form to create GitHub Pull Requests automatically.

## Prerequisites

For frontend and data work:

- Node.js 22 or newer recommended
- npm

For documentation:

- Python 3.10+
- MkDocs Material

For backend work:

- Vercel CLI
- Cloudflare Turnstile account
- GitHub App installed on the repository
- Upstash Redis database for production rate limiting and idempotency

## Frontend setup

Install dependencies from the repository root:

```bash
npm install
```

Validate source park data:

```bash
npm run validate:data
```

Build the browser data file:

```bash
npm run build:data
```

Start a static file server:

```bash
npx serve .
# or
python -m http.server
```

Open the served `index.html`.

## Build the static site output

The project has a build script that validates data, rebuilds the aggregate park
JSON, and copies the deployable static assets into `dist/`:

```bash
npm run build
```

## Backend setup

The backend is in `backend/`.

```bash
cd backend
npm install
npm run test
```

Run locally with Vercel:

```bash
npm run start
```

The backend exposes:

```text
POST /api/submissions
OPTIONS /api/submissions
```

## Backend environment variables

For local development you can create environment variables through Vercel CLI or
a local environment file supported by your Vercel workflow.

Required for production:

```bash
ALLOWED_ORIGINS="https://mc-marcocheng.github.io"
TURNSTILE_SECRET_KEY="..."

UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

GITHUB_REPO_OWNER="mc-marcocheng"
GITHUB_REPO_NAME="hk-park-searcher"
GITHUB_BASE_BRANCH="master"

GITHUB_APP_ID="..."
GITHUB_APP_INSTALLATION_ID="..."
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

For local-only development, some services have fallbacks:

- Missing Upstash credentials disables rate limiting and idempotency locks.
- Missing Turnstile secret accepts any non-empty Turnstile token.
- GitHub App credentials are still required to create real Pull Requests.

## Documentation site

Install MkDocs Material:

```bash
uv sync --dev
```

Serve docs locally:

```bash
uv run mkdocs serve
```

Build docs:

```bash
uv run mkdocs build
```

## Common workflow

```bash
npm install
npm run validate:data
npm run build:data
npm run lint

cd backend
npm install
npm run test
```
