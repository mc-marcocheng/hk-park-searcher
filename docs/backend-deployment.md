# Backend deployment

The contribution backend is designed for Vercel Serverless Functions.

The backend directory is:

```text
backend/
  api/submissions.js
  lib/
  package.json
  vercel.json
```

## Vercel project

Create a Vercel project with the project root set to:

```text
backend
```

Install command:

```bash
npm install
```

The function configuration is in:

```json
{
  "functions": {
    "api/submissions.js": {
      "maxDuration": 30
    }
  }
}
```

The deployed endpoint should look like:

```text
https://your-vercel-project.vercel.app/api/submissions
```

Update the frontend config in:

```text
js/contribution-config.js
```

Example:

```javascript
window.PARK_CONTRIBUTION_CONFIG = Object.freeze({
  apiUrl: "https://your-vercel-project.vercel.app/api/submissions",
  turnstileSiteKey: "0x..."
});
```

## Environment variables

Set these in Vercel.

| Variable | Required | Purpose |
|---|---:|---|
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed browser origins |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile server-side secret |
| `UPSTASH_REDIS_REST_URL` | Strongly recommended | Redis REST URL for rate limits and locks |
| `UPSTASH_REDIS_REST_TOKEN` | Strongly recommended | Redis REST token |
| `GITHUB_REPO_OWNER` | Yes | Repository owner |
| `GITHUB_REPO_NAME` | Yes | Repository name |
| `GITHUB_BASE_BRANCH` | Yes | Base branch, usually `master` |
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_APP_INSTALLATION_ID` | Yes | GitHub App installation ID |
| `GITHUB_APP_PRIVATE_KEY` | Yes | GitHub App private key |

Example:

```bash
ALLOWED_ORIGINS="https://mc-marcocheng.github.io"
GITHUB_REPO_OWNER="mc-marcocheng"
GITHUB_REPO_NAME="hk-park-searcher"
GITHUB_BASE_BRANCH="master"
```

For local testing you may include local origins:

```bash
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:5500,https://mc-marcocheng.github.io"
```

!!! warning

    Do not set `ALLOWED_ORIGINS="*"` in production unless you intentionally want
    any website to submit requests to the backend.

## Cloudflare Turnstile setup

1. Create a Cloudflare Turnstile widget.
2. Add allowed hostnames, for example:
   - `mc-marcocheng.github.io`
   - local development hostname if needed
3. Copy the **site key** to `js/contribution-config.js`.
4. Copy the **secret key** to Vercel as `TURNSTILE_SECRET_KEY`.

The frontend renders Turnstile explicitly and sends the token as:

```json
{
  "turnstileToken": "..."
}
```

The backend verifies it with:

```text
https://challenges.cloudflare.com/turnstile/v0/siteverify
```

## Upstash Redis setup

Upstash is used for:

- Rate limiting
- Idempotency lock per `submissionKey`

Create an Upstash Redis database and set:

```bash
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

Current rate limit:

```text
5 submissions per 10 minutes per anonymized IP hash
```

If Upstash is not configured, the backend skips these controls. That is useful
for development but not recommended for production.

## GitHub App setup

The backend uses a GitHub App instead of a personal access token.

### 1. Create the app

In GitHub:

```text
Settings → Developer settings → GitHub Apps → New GitHub App
```

Suggested settings:

| Setting | Value |
|---|---|
| App name | `Park Searcher Contributions` |
| Homepage URL | Repository or site URL |
| Webhook | Disabled, unless you need it separately |

### 2. Repository permissions

Grant only the permissions needed to create branches, commit files, and open
Pull Requests.

| Permission | Access |
|---|---|
| Metadata | Read-only |
| Contents | Read and write |
| Pull requests | Read and write |

### 3. Install the app

Install the app on the repository:

```text
mc-marcocheng/hk-park-searcher
```

### 4. Generate a private key

Generate and download a private key from the GitHub App settings.

Set it in Vercel as:

```bash
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

The code replaces escaped `\n` with real newlines:

```javascript
process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n")
```

### 5. Find the installation ID

You can find the installation ID from the app installation URL, or query GitHub's
API.

Set:

```bash
GITHUB_APP_ID="..."
GITHUB_APP_INSTALLATION_ID="..."
```

## Deployment checklist

Before enabling the public form:

- [ ] Vercel backend is deployed.
- [ ] `ALLOWED_ORIGINS` contains the GitHub Pages origin.
- [ ] Turnstile site key is in `js/contribution-config.js`.
- [ ] Turnstile secret key is in Vercel.
- [ ] Upstash Redis credentials are configured.
- [ ] GitHub App is installed on the repository.
- [ ] GitHub App has Contents and Pull Requests write permissions.
- [ ] Test submission creates a Pull Request.
- [ ] Maintainer can review and merge the Pull Request.
