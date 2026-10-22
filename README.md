# CF Ladder

A personal Codeforces practice tracker. Compare target profiles with `milangarg901`, discover unsolved problems around your rating, and organize your practice.

## Features

- Add and switch between target profiles; load all publicly available submission pages.
- See target problems you have not solved, with default recommendations within ±200 of your current rating.
- Filter by exact rating, rating range, tags, or text. Recommendations use 100-point rating increments.
- Sort by date, rating, name, submission count, or recent bookmarks. Optionally put bookmarks first.
- Save bookmarks across profiles. Checked questions appear only in the Checked tab; unchecking restores them.
- Inspect submission history and attempt to view source code, with a direct Codeforces link when access is restricted.
- Switch between light and dark themes. Profiles, bookmarks, checked questions, and theme are stored in your browser.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

## Project structure

```text
App.jsx          Interface and interaction state
codeforces.js    Public API requests and source access
model.js         Problem grouping, filtering and recommendation logic
storage.js       Browser-local IndexedDB storage
styles.css       Responsive light and dark themes
main.jsx         Application entry point
model.test.js    Comparison, recommendation and filtering tests
```

## Deployment

GitHub Actions builds and deploys the site to GitHub Pages on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the publishing source.

The site is entirely browser-based. No backend server, database account, or secret key is needed. Codeforces controls API availability and source-code access. In-site code viewing works only when Codeforces permits the browser to retrieve the submission page; otherwise use the original submission link.

Browser storage is separate for each browser and site address. Clearing site data removes saved progress. Export progress before clearing it.
