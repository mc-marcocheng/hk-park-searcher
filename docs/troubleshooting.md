# Troubleshooting

## Contribution form says human verification failed

Check:

- `TURNSTILE_SECRET_KEY` is set in Vercel.
- The frontend site key in `js/contribution-config.js` matches the Turnstile widget.
- The Turnstile widget allows the GitHub Pages hostname.
- The request is sent from an allowed origin.

## Browser request is rejected with 403 Origin not allowed

Check `ALLOWED_ORIGINS`.

For GitHub Pages, the origin is only:

```text
https://mc-marcocheng.github.io
```

It does not include the path `/hk-park-searcher`.

For local development, add the exact local origin, for example:

```text
http://localhost:3000
```

## Backend returns 429 Too many requests

The Upstash rate limiter has rejected the request.

Wait for the rate-limit window to reset, or adjust the limiter in:

```text
backend/lib/security.js
```

## Backend returns duplicate submission detected

The same `submissionKey` was already submitted recently.

This usually happens when:

- The user double-clicked submit.
- The browser retried the request.
- A previous attempt succeeded but the response was interrupted.

## Pull Request creation fails

Check GitHub App configuration:

- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_BASE_BRANCH`

Also check that the app is installed on the target repository and has:

- Contents: read/write
- Pull requests: read/write

## Sharp image processing fails locally

Install backend dependencies from `backend/`:

```bash
cd backend
npm install
```

If native package installation fails, check your Node.js version. Node.js 22 is
recommended for this project.

## `npm run images` cannot find `_originals`

Create the raw image folder:

```bash
mkdir -p _originals/{parkId}
```

Then add raw images and rerun:

```bash
npm run images
```

## Public map does not show a newly added park

Check:

1. The park source file exists in `data/parks/`.
2. Validation passes:

   ```bash
   npm run validate:data
   ```

3. The aggregate data file was rebuilt:

   ```bash
   npm run build:data
   ```

4. `assets/data/parks.json` was committed.
5. The static site deployment has updated.

## Image appears broken

Check:

- The image basename in JSON has no extension.
- Both `med` and `thumb` WebP files exist.
- The image path matches the park ID.

Expected paths:

```text
assets/images/parks/{parkId}/med/{imageName}.webp
assets/images/parks/{parkId}/thumb/{imageName}.webp
```

## MkDocs build fails in strict mode

`mkdocs.yml` has:

```yaml
strict: true
```

This means warnings can fail the build.

Common causes:

- A page listed in `nav` does not exist.
- A Markdown link points to a missing file.
- Mermaid or Markdown syntax is invalid.

Run:

```bash
mkdocs serve
```

and fix the reported warning or error.
