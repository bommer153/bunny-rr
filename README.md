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

## Discord slash commands

The same JSONBin data is available from Discord via `/bunny` on Vercel.

1. Create an app at [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy **Public Key**, **Application ID**, and create a bot token.
3. Invite the bot to your server (applications.commands scope).
4. Add env vars on Vercel (see `.env.example`), including `JSONBIN_BIN_ID` so Discord and the web app share one bin.
5. Redeploy, then set **Interactions Endpoint URL** to:

   `https://YOUR-PROJECT.vercel.app/api/discord`

6. Register commands from production env (after deploy) by opening:

   `https://YOUR-PROJECT.vercel.app/api/discord?sync=1`

   Production needs `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`, and preferably `DISCORD_GUILD_ID` (guild register is instant). Or locally:

```bash
$env:DISCORD_APP_ID="..."
$env:DISCORD_BOT_TOKEN="..."
$env:DISCORD_GUILD_ID="..."
npm run discord:register
```

### Commands

| Command | What it does |
|---------|----------------|
| `/bunny status` | Snapshot |
| `/bunny leaderboard` | Standings |
| `/bunny players` | Roster |
| `/bunny add-player name:` | Add player |
| `/bunny remove-player name:` | Remove player |
| `/bunny create-match player1: player2:` | Create match (`rematch:true` to force) |
| `/bunny score winner: loser:` | Score a pending match |
| `/bunny matches` | List matches (`player:` to filter, `filter:` pending/done/all) |
| `/bunny facilitator name:` | Set facilitator |

The app entry is Vite `index.html` → `src/`. Routes are `/`, `/players`, `/matches`, `/leaderboard`.
