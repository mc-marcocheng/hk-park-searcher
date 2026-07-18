# Contributing to Park Searcher

Thank you for your interest in contributing to Park Searcher! You can help by submitting park data, adding images, improving the codebase, or improving the documentation.

## 1. Submitting Park Data

### Recommended: web contribution form

The easiest way to submit a park is the new contribution page:

👉 **[Submit park data](https://mc-marcocheng.github.io/hk-park-searcher/contribute.html)**

The form lets you:

- Add a missing street workout park.
- **Improve an existing park** — switch to "改善現有公園資料" to load the current
  park, then update its details and photos.
- **Use your device's current location** — tap "使用目前位置" to drop the marker
  at your live position (must be within Hong Kong).
- **Take a photo with your camera** — use "開啟相機拍攝" to capture a photo
  directly, or "選擇相片" to upload from your gallery. Both options remain
  available for every photo slot.
- **Upload park environment photos** and **equipment-specific photos**.
- **Keep or remove existing photos** when improving a park — retained photos are
  reused, removed photos are deleted from the repository.
- Select the park location on a map.
- Create a public GitHub Pull Request for maintainer review.

Submissions are not published immediately. A maintainer will review and merge the generated Pull Request before the park appears on the public map.

### How park ids and photo names are chosen

You do not need to name anything. The backend assigns permanent, human-readable
identifiers:

- **Park ids** are generated from the park name/address (for example
  `cornwall-street-park`); collisions get a numeric suffix.
- **Photo files** are named semantically — environment photos become
  `overview_1`, `overview_2`, … and equipment photos become
  `high_pull_up_bar_1`, … . These names are stable, so improving a park later
  keeps the same file references.

### Google Form fallback

The original Google Form is still available:

👉 **[Hong Kong Street Workout Park Data Submission Form](https://forms.gle/tBqyQ5meYqtdXcja7)**

Use either form if:

- You know a park that is missing from our map.
- You found incorrect information, such as a wrong equipment list or location.
- You have photos of a park that you are allowed to share publicly.

## 2. Contributing Code, Data, or Images

If you are comfortable with Git, you can contribute directly by opening a Pull Request.

### Adding or editing park data

Park source files live in:

```text
data/parks/{parkId}.json
```

After editing source data, rebuild the generated aggregate file:

```bash
npm run validate:data
npm run build:data
```

The generated public data file is:

```text
assets/data/parks.json
```

Please commit both the source JSON change and the rebuilt aggregate file when needed.

### Adding photos for a park

1. Create a raw image folder:

   ```text
   _originals/{parkId}/
   ```

2. Drop raw photos into that folder.

3. Add the image base names, without extensions, to the relevant park JSON fields:

   - `park_images`
   - `equipment[].images`

4. Run:

   ```bash
   npm run images
   ```

5. Commit the generated WebP files under:

   ```text
   assets/images/parks/{parkId}/thumb/
   assets/images/parks/{parkId}/med/
   ```

Raw files in `_originals/` are intentionally gitignored.

### Development setup

Install project dependencies:

```bash
npm install
```

Build and validate data:

```bash
npm run validate:data
npm run build:data
```

Start a local static server:

```bash
npx serve .
# or
python -m http.server
```

Run linting and formatting:

```bash
npm run lint
npm run format
```

Backend development lives in `backend/`:

```bash
cd backend
npm install
npm run test
npm run start
```

See the documentation in [`docs/`](docs/index.md) for full setup, Vercel deployment, GitHub App configuration, Turnstile, Upstash Redis, and security notes.

## 3. Submission Guidelines

- Keep Pull Requests focused on a single change or a single park addition.
- Use clear commit messages, for example:
  - `feat: add Causeway Bay Sports Ground`
  - `fix: update pull-up bar count at Victoria Park`
  - `docs: add backend deployment guide`
- Do not include private personal information in park data or comments.
- Only upload photos that you took yourself or are authorised to share publicly.

---

係一個幫你搵香港街頭健身公園嘅網頁。如果你想幫手，可以透過以上方式提交資料或代碼。多謝支持！
