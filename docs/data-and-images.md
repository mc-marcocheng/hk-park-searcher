# Data and images

## Source data layout

Park source files live in:

```text
data/parks/
  victoria-park.json
  ...
```

The browser reads a generated aggregate file:

```text
assets/data/parks.json
```

Do not manually edit `assets/data/parks.json` as the only source of truth. Edit
or add files in `data/parks/`, then rebuild.

## Build aggregate data

```bash
npm run build:data
```

This runs:

```bash
node scripts/build-parks.mjs
```

It reads all `data/parks/*.json` files, sorts them by `id`, and writes:

```text
assets/data/parks.json
```

## Validate data

```bash
npm run validate:data
```

Validation checks include:

- Safe park IDs
- Duplicate park IDs
- Required names and coordinates
- Known district and equipment codes
- Safe image names
- Duplicate-name warnings
- Near-duplicate coordinate warnings

## Park JSON shape

A typical park file looks like:

```json
{
  "id": "example-park",
  "name": {
    "zh": "示例公園",
    "en": "Example Park"
  },
  "coords": {
    "lat": 22.316,
    "lng": 114.17
  },
  "district": {
    "zh": "油尖旺區",
    "en": "Yau Tsim Mong"
  },
  "address": {
    "zh": "示例路1號",
    "en": "1 Example Road"
  },
  "equipment": [
    {
      "type": "high_pull_up_bar",
      "images": ["pull_up_bar_1"]
    }
  ],
  "park_images": ["overview_1"],
  "metrics": {
    "quality": 4
  },
  "comment": "Optional comment",
  "comment_format": "plain"
}
```

## Equipment codes

Current supported equipment codes:

| Code | Label |
|---|---|
| `high_pull_up_bar` | 高單槓 |
| `low_bar` | 低單槓 |
| `parallel_bars` | 雙槓 |
| `monkey_bars` | 攀爬架 |
| `sit_up_bench` | 仰臥板 |
| `others` | 其他器材 |

Keep these catalogues in sync:

- `js/dict.js`
- `js/contribution-catalog.js`
- `backend/lib/catalog.js`
- `scripts/validate-parks.mjs`

## Image workflow

Raw photos are kept outside the committed repository tree and converted into
committed WebP assets.

```text
_originals/               ← gitignored raw files
  {parkId}/
    overview_1.jpg
    pull_up_bar_1.jpg

assets/images/parks/      ← committed optimized output
  {parkId}/
    thumb/
      overview_1.webp
      pull_up_bar_1.webp
    med/
      overview_1.webp
      pull_up_bar_1.webp
```

## Add photos

1. Create the raw folder:

   ```bash
   mkdir -p _originals/{parkId}
   ```

2. Add raw photos to that folder.

3. Reference the image base names in the park JSON:

   ```json
   {
     "park_images": ["overview_1"],
     "equipment": [
       {
         "type": "high_pull_up_bar",
         "images": ["pull_up_bar_1"]
       }
     ]
   }
   ```

4. Generate optimized assets:

   ```bash
   npm run images
   ```

5. Commit the generated files under `assets/images/parks/`.

## Rebuild all images

```bash
npm run images:clean
```

This removes generated image output and rebuilds from `_originals/`.
