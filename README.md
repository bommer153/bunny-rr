# Bunny Anniv Round Robin

React + Vite + Tailwind CSS v4 + HeroUI redesign.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Features

- Players, matches, facilitator, leaderboard
- Manual match create with rematch warning
- Round robin generate / apply facilitator to all
- Auto-sync to JSONBin on changes
- Match cards in a **3-column** responsive grid
- Mobile bottom nav

Legacy static HTML/JS lives under `js/`, `css/`, and `*.html` page files if you still need them. The app entry is now Vite `index.html` → `src/`.
