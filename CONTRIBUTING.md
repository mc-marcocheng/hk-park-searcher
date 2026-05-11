# Contributing to Park Searcher

Thank you for your interest in contributing to Park Searcher! There are two ways you can help: by submitting park data or by contributing to the codebase.

## 1. Submitting Park Data (Non-Technical)

The easiest way to help is by providing information about street workout parks in Hong Kong. We use a Google Form to collect this data:

👉 **[Hong Kong Street Workout Park Data Submission Form](https://forms.gle/tBqyQ5meYqtdXcja7)**

Use this form if:
- You know a park that is missing from our map.
- You found incorrect information (e.g., wrong equipment list, incorrect location).
- You have photos of a park that you'd like to share.

## 2. Contributing Code or Images (Technical)

If you are a developer or comfortable with Git, you can contribute directly to this repository.

### Adding New Parks via Pull Request

1. **Park Data**: Update `assets/data/parks.json` with the new park details.
2. **Images**: 
   - Follow the [Image Optimisation Workflow](README.md#image-optimisation-workflow) described in the README.
   - Drop raw images into `_originals/{parkId}/`.
   - Run `npm run images` to generate the WebP assets.
   - Commit the generated files under `assets/images/parks/`.

### Development Setup

1. Fork and clone the repository.
2. Install dependencies: `npm install`.
3. Start a local server: `npx serve`.
4. Ensure your code follows our linting and formatting rules:
   - `npm run lint`
   - `npm run format`

### Submission Guidelines

- **Pull Requests**: Keep your PRs focused on a single change or a single park addition.
- **Commit Messages**: Use clear and descriptive commit messages (e.g., `feat: add Causeway Bay Sports Ground`, `fix: update pull-up bar count at Victoria Park`).

---

係一個幫你搵香港街頭健身公園嘅網頁。如果你想幫手，可以透過以上方式提交資料或代碼。多謝支持！
