import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // .env optional if vars are already in the environment
}

const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.argv.includes("--global") ? "" : process.env.DISCORD_GUILD_ID;

if (!APP_ID || !TOKEN) {
  console.error("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN");
  process.exit(1);
}

const commands = [
  {
    name: "bunny",
    description: "Bunny Anniv Round Robin",
    options: [
      { type: 1, name: "status", description: "Event snapshot" },
      { type: 1, name: "leaderboard", description: "Standings" },
      { type: 1, name: "players", description: "List roster" },
      {
        type: 1,
        name: "add-player",
        description: "Add a player",
        options: [{ type: 3, name: "name", description: "Player name", required: true }],
      },
      {
        type: 1,
        name: "remove-player",
        description: "Remove a player",
        options: [{ type: 3, name: "name", description: "Player name", required: true }],
      },
      {
        type: 1,
        name: "facilitator",
        description: "Set facilitator",
        options: [{ type: 3, name: "name", description: "Facilitator name", required: false }],
      },
      {
        type: 1,
        name: "matches",
        description: "List matches",
        options: [
          {
            type: 3,
            name: "filter",
            description: "pending, done, all, or a player name",
            required: false,
          },
          {
            type: 3,
            name: "player",
            description: "Only matches involving this player",
            required: false,
          },
        ],
      },
      {
        type: 1,
        name: "create-match",
        description: "Create a match",
        options: [
          { type: 3, name: "player1", description: "Player 1", required: true },
          { type: 3, name: "player2", description: "Player 2", required: true },
          { type: 5, name: "rematch", description: "Allow rematch if they already played", required: false },
        ],
      },
      {
        type: 1,
        name: "score",
        description: "Score a pending match",
        options: [
          { type: 3, name: "winner", description: "Winner name", required: true },
          { type: 3, name: "loser", description: "Loser name", required: true },
        ],
      },
    ],
  },
];

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

const body = await res.text();
if (!res.ok) {
  console.error(res.status, body);
  if (res.status === 403 && body.includes("50001")) {
    console.error(`
Missing Access: this bot is not in guild ${GUILD_ID}, or it was invited without the applications.commands scope.

1. Open this invite (bot + slash commands):
   https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=274878024704&scope=bot%20applications.commands
2. Pick the same server as DISCORD_GUILD_ID, then run: npm run discord:register

Or register globally (up to 1 hour to appear) with:
   npm run discord:register:global
`);
  }
  if (res.status === 401) {
    console.error("Unauthorized: reset the bot token in the Discord portal and update DISCORD_BOT_TOKEN in .env");
  }
  process.exitCode = 1;
} else {
  console.log(`Registered /bunny commands ${GUILD_ID ? `on guild ${GUILD_ID}` : "globally"}.`);
}
