# Contribution system

The contribution system lets non-technical users submit park data through a web
form while keeping maintainers in control through GitHub Pull Request review.

## Public contribution links

Recommended form:

```text
https://mc-marcocheng.github.io/hk-park-searcher/contribute.html
```

Google Form fallback:

```text
https://forms.gle/tBqyQ5meYqtdXcja7
```

## End-to-end flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Turnstile
    participant API as Vercel API
    participant Redis as Upstash Redis
    participant GitHub

    User->>Browser: Fill contribution form
    Browser->>Browser: Resize and encode photos to WebP
    Browser->>Turnstile: Complete challenge
    Browser->>API: POST /api/submissions
    API->>API: Check CORS origin
    API->>Redis: Rate limit by anonymized IP
    API->>API: Validate Zod schema
    API->>Turnstile: Verify token
    API->>Redis: Acquire idempotency lock
    API->>API: Re-encode images with Sharp
    API->>GitHub: Create branch, files, Pull Request
    API-->>Browser: Pull Request URL
```

## Frontend responsibilities

The contribution page is implemented by:

```text
contribute.html
js/contribution.js
js/contribution-catalog.js
js/contribution-config.js
css/contribution.css
```

It performs:

- Form rendering
- District and equipment catalogue rendering
- Leaflet map coordinate selection
- Browser-side image resizing
- Browser-side WebP encoding
- Basic validation
- Cloudflare Turnstile rendering
- Payload submission to the backend

The frontend config lives in:

```javascript
window.PARK_CONTRIBUTION_CONFIG = Object.freeze({
  apiUrl: "https://hk-park-searcher.vercel.app/api/submissions",
  turnstileSiteKey: "..."
});
```

## Backend responsibilities

The backend endpoint is:

```text
backend/api/submissions.js
```

It performs:

- Origin allow-list check
- CORS headers
- Method check
- Payload size check
- IP-based rate limiting
- JSON parsing
- Zod validation
- Honeypot rejection
- Turnstile verification
- Idempotency lock
- GitHub Pull Request creation

## Submission validation

The main schema lives in:

```text
backend/lib/schema.js
```

Validation includes:

- Submission version
- UUID submission key
- Hong Kong coordinate bounds
- District code
- Equipment codes
- Required environment photo
- Required equipment photo for each listed equipment type
- Maximum 8 images
- Maximum combined processed image size
- Required attestations
- Base64 byte length checks

## Image handling

Images are processed twice:

1. **Browser-side** for better user experience and smaller payloads.
2. **Server-side** with Sharp before committing to the repository.

Server-side image handling lives in:

```text
backend/lib/images.js
```

The backend creates:

```text
assets/images/parks/{parkId}/med/{clientId}.webp
assets/images/parks/{parkId}/thumb/{clientId}.webp
```

## Pull Request output

For each accepted submission, the GitHub App creates a branch like:

```text
contribution/park-YYYYMMDD-xxxxxxxx
```

The Pull Request contains:

```text
data/parks/{generatedParkId}.json
assets/images/parks/{generatedParkId}/med/*.webp
assets/images/parks/{generatedParkId}/thumb/*.webp
```

The generated park JSON includes:

- Park name
- Coordinates
- District object
- Address
- Equipment entries
- Image references
- Quality rating
- Comment
- Contribution timestamp

## Review model

Community submissions are public Pull Requests. Maintainers should review:

- Whether the park exists and is public
- Whether coordinates are correct
- Whether the district and address are correct
- Whether photos are appropriate and usable
- Whether equipment labels are accurate
- Whether comments contain private or unsafe content

After approval and merge, rebuild data if needed:

```bash
npm run validate:data
npm run build:data
```
