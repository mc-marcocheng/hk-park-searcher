<section class="docs-hero">
  <div class="docs-hero__copy">
    <p class="docs-hero__eyebrow">HK calisthenics directory</p>

    <h1>
      Find and improve <span class="text-highlight">street workout</span> park data.
    </h1>

    <p class="docs-hero__lead">
      Hong Kong Park Searcher is a static map application with a serverless
      contribution backend. Community submissions become public GitHub Pull
      Requests for maintainer review.
    </p>

    <div class="docs-hero__actions">
      <a class="docs-button" href="getting-started/">
        Get started <span aria-hidden="true">→</span>
      </a>

      <a class="docs-button docs-button--secondary" href="contribution-system/">
        Understand submissions
      </a>
    </div>
  </div>

  <div class="docs-hero__pipeline">
    <p class="docs-hero__pipeline-title">Contribution flow</p>

    <ol aria-label="Park contribution flow">
      <li>Open the contribution form</li>
      <li>Enter park details and map location</li>
      <li>Process photos in the browser</li>
      <li>Submit to the Vercel backend</li>
      <li>Create a GitHub Pull Request</li>
      <li>Review, merge, and rebuild public data</li>
    </ol>
  </div>
</section>

<section class="docs-section">
  <div class="docs-section__heading">
    <p class="docs-section__eyebrow">Project overview</p>
    <h2>Main components</h2>
    <p>
      The app is intentionally simple: static frontend files, JSON park data,
      optimized WebP images, and a small serverless backend for community
      submissions.
    </p>
  </div>

  <div class="docs-card-grid">
    <article class="docs-card">
      <h3>Static map frontend</h3>
      <p>
        The public app uses Leaflet, static JSON data, optimized WebP photos,
        search, filters, geolocation, and a responsive UI.
      </p>
      <span class="docs-card__label">HTML · CSS · Leaflet</span>
    </article>

    <article class="docs-card">
      <h3>Source park data</h3>
      <p>
        Individual park files live in <code>data/parks/</code> and are built
        into <code>assets/data/parks.json</code> for the browser.
      </p>
      <span class="docs-card__label">JSON · build script</span>
    </article>

    <article class="docs-card">
      <h3>Image workflow</h3>
      <p>
        Raw photos are processed into committed medium and thumbnail WebP
        variants under <code>assets/images/parks/</code>.
      </p>
      <span class="docs-card__label">Sharp · WebP</span>
    </article>

    <article class="docs-card">
      <h3>Contribution backend</h3>
      <p>
        A Vercel serverless function validates submissions, verifies Turnstile,
        rate limits requests, re-encodes images, and creates Pull Requests.
      </p>
      <span class="docs-card__label">Vercel · Octokit · Zod</span>
    </article>

    <article class="docs-card">
      <h3>GitHub review model</h3>
      <p>
        Community submissions are public Pull Requests, giving maintainers a
        normal code-review workflow before data is published.
      </p>
      <span class="docs-card__label">GitHub App · PRs</span>
    </article>

    <article class="docs-card">
      <h3>Abuse controls</h3>
      <p>
        Origin allow-listing, Cloudflare Turnstile, Upstash rate limiting,
        strict schemas, payload limits, and server-side image re-encoding.
      </p>
      <span class="docs-card__label">Security · validation</span>
    </article>
  </div>
</section>

## Architecture

```mermaid
flowchart TD
    user["Contributor"]
    ghpages["GitHub Pages static site"]
    form["contribute.html"]
    api["Vercel API<br/>/api/submissions"]
    turnstile["Cloudflare Turnstile"]
    redis["Upstash Redis<br/>rate limit + idempotency"]
    github["GitHub App"]
    pr["Contribution Pull Request"]
    maintainer["Maintainer review"]
    data["data/parks/*.json"]
    build["build-parks.mjs"]
    publicData["assets/data/parks.json"]
    app["Public map"]

    user --> ghpages
    ghpages --> form
    form --> api
    api --> turnstile
    api --> redis
    api --> github
    github --> pr
    pr --> maintainer
    maintainer --> data
    data --> build
    build --> publicData
    publicData --> app
```

## Start here

- [Getting started](getting-started.md)
- [Data and images](data-and-images.md)
- [Contribution system](contribution-system.md)
- [Backend deployment](backend-deployment.md)
- [Security](security.md)
