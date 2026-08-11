export const BUNNY_COMMANDS = [
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
            name: "player",
            description: "Only matches involving this player",
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: "filter",
            description: "Match status",
            required: false,
            choices: [
              { name: "All", value: "all" },
              { name: "Pending", value: "pending" },
              { name: "Completed", value: "done" },
            ],
          },
        ],
      },
      {
        type: 1,
        name: "create-match",
        description: "Create a match",
        options: [
          { type: 3, name: "player1", description: "Player 1", required: true, autocomplete: true },
          { type: 3, name: "player2", description: "Player 2", required: true, autocomplete: true },
          { type: 5, name: "rematch", description: "Allow rematch if they already played", required: false },
        ],
      },
      {
        type: 1,
        name: "score",
        description: "Score a pending match",
        options: [
          { type: 3, name: "winner", description: "Winner name", required: true, autocomplete: true },
          { type: 3, name: "loser", description: "Loser name", required: true, autocomplete: true },
        ],
      },
    ],
  },
];

export async function registerDiscordCommands() {
  const APP_ID = String(process.env.DISCORD_APP_ID || "").trim();
  const TOKEN = String(process.env.DISCORD_BOT_TOKEN || "").trim();
  const GUILD_ID = String(process.env.DISCORD_GUILD_ID || "").trim();

  if (!APP_ID || !TOKEN) {
    return {
      ok: false,
      error: "Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in production env.",
    };
  }

  const urls = [];
  if (GUILD_ID) {
    urls.push(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`);
  }
  urls.push(`https://discord.com/api/v10/applications/${APP_ID}/commands`);

  const results = [];
  for (const url of urls) {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(BUNNY_COMMANDS),
    });
    const text = await res.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw
    }
    results.push({
      ok: res.ok,
      status: res.status,
      scope: url.includes("/guilds/") ? "guild" : "global",
      body: res.ok ? (Array.isArray(parsed) ? `${parsed.length} command(s)` : "ok") : parsed,
    });
  }

  const failed = results.find((r) => !r.ok);
  return {
    ok: !failed,
    error: failed ? `Discord ${failed.scope} register failed (${failed.status})` : undefined,
    results,
  };
}
