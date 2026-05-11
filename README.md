# Park Searcher

![Park Searcher Preview](assets/preview.png)

係一個幫你搵香港街頭健身公園嘅網頁。如果你想搵附近邊度有單槓、雙槓或者其他健身設施，呢度就啱晒你。

A web application to find street workout parks in Hong Kong.

## 提交資料 Contribute

如果你發現有公園漏咗或者資料有錯，歡迎填寫以下 Google Form 話比我哋知：
**[香港街健公園資料提交](https://forms.gle/tBqyQ5meYqtdXcja7)**

Help us keep the data up to date! If you know a park that's missing or has incorrect information, please let us know via the form above.

## Setup

1. Install dependencies for linting and formatting:
   ```bash
   npm install
   ```

2. Start a local server:
   ```bash
   npx serve
   # or
   python -m http.server
   ```

## Development

- `npm run format`: Formats code with Prettier.
- `npm run lint`: Lints JavaScript files using ESLint.

## Image optimisation workflow

Raw photos are kept outside the repo and processed into committed WebP assets.

```
_originals/          ← gitignored, drop raw photos here
  {parkId}/
    overview_1.jpg
    other_1.jpg
    ...

assets/images/parks/ ← committed, generated output
  {parkId}/
    thumb/           ← 200 px wide, WebP q75  (used in list cards)
      overview_1.webp
    med/             ← 800 px wide, WebP q80  (used in modal gallery)
      overview_1.webp
```

### Adding photos for a park

1. Create `_originals/{parkId}/` and drop the raw files in.
2. Add the base names (no extension) to `assets/data/parks.json` under `park_images` or `equipment[].images`.
3. Run `npm run images` — only new or changed files are processed.
4. Commit the generated files under `assets/images/parks/`.

### Rebuilding everything from scratch

```bash
npm run images:clean
```
