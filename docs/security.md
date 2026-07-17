# Security

The project accepts public community submissions, so the contribution backend
uses several layers of validation and abuse control.

## Current controls

### Origin allow-list

The backend rejects requests whose `Origin` header is not in:

```bash
ALLOWED_ORIGINS
```

Implementation:

```text
backend/lib/security.js
```

### CORS restrictions

Only allowed origins receive CORS headers.

Supported methods:

```text
POST, OPTIONS
```

### Payload size limit

The backend rejects large request bodies before parsing:

```text
4.2 MiB maximum content length
```

The frontend also checks serialized payload size before submitting.

### Rate limiting

When Upstash Redis is configured, requests are limited by anonymized IP hash.

Current limit:

```text
5 requests per 10 minutes
```

The backend avoids storing raw IP addresses by hashing them first.

### Honeypot field

The form contains a visually hidden `website` field. Normal users should not
fill it. Submissions with a non-empty value are rejected.

### Cloudflare Turnstile

The contribution form requires Turnstile. The backend verifies submitted tokens
using the Cloudflare verification endpoint.

### Zod schema validation

All submission fields are validated with Zod:

```text
backend/lib/schema.js
```

Validation includes:

- Required fields
- UUIDs
- Hong Kong coordinate bounds
- Known district codes
- Known equipment codes
- Required attestations
- Image count and byte limits
- Matching base64 byte lengths
- Required park environment image
- Equipment images matching listed equipment

### Server-side image re-encoding

The backend does not trust browser-generated image data. It decodes and
re-encodes images with Sharp before committing them.

Controls include:

- Input pixel limit
- Maximum dimensions
- Output size limits
- WebP conversion
- EXIF orientation handling via `rotate()`

### Idempotency lock

When Upstash Redis is configured, each `submissionKey` gets a temporary lock.
Duplicate submissions are rejected while the lock exists.

### GitHub App permissions

The backend should use a GitHub App with minimal repository permissions:

- Metadata: read-only
- Contents: read and write
- Pull requests: read and write

Avoid personal access tokens for production.

## Public Pull Request model

Submissions are public because they become GitHub Pull Requests. The form asks
users to confirm that they understand this.

Maintainers should remove or edit:

- Personal information
- Inappropriate comments
- Inappropriate photos
- Incorrect or misleading data

## Recommended production settings

- Set a strict `ALLOWED_ORIGINS` value.
- Configure Turnstile secret key.
- Configure Upstash Redis.
- Keep GitHub App permissions minimal.
- Review every generated Pull Request manually.
- Consider adding CI checks using `scripts/check-contribution-diff.mjs`.
- Do not commit raw private photos.
- Do not publish secrets in frontend files.

## Known limitations

- The static frontend is public by design.
- The contribution endpoint is public by design.
- Reviewers remain responsible for final data quality.
- The project does not currently moderate image content automatically.
