# C-Wags Score Sheet Studio

A standalone browser app for Rally, Obedience Levels 1–5, and Scent score sheets. No Games, accounts, database, server uploads or trial-management services.

## Local setup

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The dev server binds to 127.0.0.1. Enter event and participant details, arrange the obedience course, resolve validation messages, then choose **Preview score sheets**. Inspect the PDF before downloading. Rally maps accept PDF (first page), JPG and PNG, up to 10 MB.

## Save your work

All editing state exists in memory in the browser tab. Reloading or closing the tab discards unsaved work. **Save project JSON** writes a local file to your downloads folder; **Open project JSON** restores it. These files contain participant details, event metadata and course plans. They are not synced or backed up by this app. Keep files in an appropriate folder and follow your club's data handling practices.

Course maps exist temporarily in browser memory and are embedded in exported Rally PDFs. Maps are intentionally excluded from JSON; reattach them after opening a saved project. PDFs and JSON downloads persist only where the user saves them. Hosting the static application does not add permanent storage. No API keys or environment variables are needed.

## Verification

```sh
npm test
npm run lint
npm run build
```

Tests cover points, exercise minimums, Honor, mandatory orders, split Heeling, Level 3 required elements, Level 5 Figure 8 and combinations, JSON validation, PDF page counts and Letter sizing, and Scent blank alignment/pagination. `lint` performs strict TypeScript checking. PDF test samples are generated in ignored `work/pdfs/`. `npm run format:check` checks source formatting.

Obedience has one scoring page per team plus one or more exercise reference pages. Split Heeling appears multiple times in the course order but only once in the score table. Course reorder controls work with drag and drop or labeled up/down buttons. Invalid mandatory orders block export. Level 4 Heeling remains incorporated in its three exercises.

Scent supports one round (20 teams/page) or two rounds (eight teams/page). A paired-round dog missing an entry has a blank alignment row. Round checkboxes refer to the starting round and next round. Pairing uses C-Wags number, falling back to team identity if blank.

## Production and GitHub

`npm run build` creates `dist/`, suitable for a static host. Test locally with `npx vite preview --host 127.0.0.1`. The app expects deployment at the domain root because its public assets use root-relative paths.

- **GitHub + Netlify / Cloudflare Pages:** connect a newly approved repository, build command `npm run build`, output `dist`.
- **GitHub + Vercel:** choose Vite, build `npm run build`, output `dist`.
- **GitHub Pages:** use a custom domain or root user/organization site. For a repository subpath, first update Vite's base and all public asset URLs to honor `import.meta.env.BASE_URL`.

This directory has its own Git repository. No remote is configured and nothing is pushed or publicly deployed. After approval of a new destination, add that repository as the remote and push. Do not use an existing unrelated repository.

## Rules and branding

Independently produced for trial hosts and judges; not an official C-Wags product. Users must verify current official rules and forms at https://c-wags.org. The imported obedience ruleset is September 2020, verified by the source reference on October 16, 2026. That provenance does not guarantee rules are current. This app is a sheet creator; judges record scores on printed sheets.

See `docs/reference-audit.md` for the precise read-only reference and minimal imported modules. The supplied C-Wags logo and Rally template are retained under the user's existing authorization. Their inclusion grants no new trademark or redistribution rights. No open-source license is asserted for those assets.
