const API_BASE = process.env.JSONBIN_API_BASE || process.env.VITE_JSONBIN_API_BASE || "https://api.jsonbin.io/v3";
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY || "";
const ACCESS_KEY = process.env.JSONBIN_ACCESS_KEY || process.env.VITE_JSONBIN_ACCESS_KEY || "";
const BIN_ID = process.env.JSONBIN_BIN_ID || process.env.VITE_JSONBIN_BIN_ID || "";

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function isSamePair(match, a, b) {
  return pairKey(match.player1Id, match.player2Id) === pairKey(a, b);
}

function headers(json = false) {
  const h = {};
  if (ACCESS_KEY) h["X-Access-Key"] = ACCESS_KEY;
  if (MASTER_KEY) h["X-Master-Key"] = MASTER_KEY;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function recompute(players, matches) {
  const map = Object.fromEntries(
    players.map((p) => [p.id, { wins: 0, losses: 0, gamesPlayed: 0 }])
  );
  for (const match of matches) {
    if (match.status !== "completed" || !match.winnerId) continue;
    const a = map[match.player1Id];
    const b = map[match.player2Id];
    if (!a || !b) continue;
    a.gamesPlayed += 1;
    b.gamesPlayed += 1;
    if (match.winnerId === match.player1Id) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }
  return players.map((p) => ({ ...p, ...map[p.id] }));
}

function findPlayer(data, name) {
  const q = String(name || "").trim().toLowerCase();
  return data.players.find((p) => p.name.toLowerCase() === q);
}

function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, (_, i) => {
    const row = new Array(cols);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function findPlayerLoose(data, name) {
  const q = String(name || "").trim().toLowerCase();
  if (!q) return null;
  const exact = findPlayer(data, q);
  if (exact) return exact;

  const starts = data.players.filter((p) => p.name.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];

  const contains = data.players.filter((p) => p.name.toLowerCase().includes(q));
  if (contains.length === 1) return contains[0];

  const close = data.players
    .map((p) => ({ p, d: editDistance(q, p.name.toLowerCase()) }))
    .filter(({ d, p }) => d <= Math.max(2, Math.floor(p.name.length / 4)))
    .sort((a, b) => a.d - b.d);
  if (close.length && close[0].d < (close[1]?.d ?? Infinity)) return close[0].p;
  return null;
}

const MATCH_FILTERS = new Set(["pending", "done", "all", "completed"]);

function playerName(data, id) {
  return data.players.find((p) => p.id === id)?.name || "Unknown";
}

function leaderboard(data) {
  return [...data.players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aPct = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
    const bPct = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
    if (bPct !== aPct) return bPct - aPct;
    return a.name.localeCompare(b.name);
  });
}

export async function loadData() {
  if (!BIN_ID) throw new Error("Missing JSONBIN_BIN_ID (or VITE_JSONBIN_BIN_ID).");
  let res = await fetch(`${API_BASE}/b/${BIN_ID}/latest`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`JSONBin load failed (${res.status})`);
  const json = await res.json();
  const record = json.record || json;
  return {
    title: record.title || "Bunny Anniv Round Robin",
    facilitator: record.facilitator || "",
    players: Array.isArray(record.players) ? record.players : [],
    matches: Array.isArray(record.matches) ? record.matches : [],
    updatedAt: record.updatedAt || null,
  };
}

export async function saveData(data) {
  if (!BIN_ID) throw new Error("Missing JSONBIN_BIN_ID.");
  const body = { ...data, updatedAt: new Date().toISOString() };
  const res = await fetch(`${API_BASE}/b/${BIN_ID}`, {
    method: "PUT",
    headers: headers(true),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`JSONBin save failed (${res.status})`);
  return body;
}

export function snapshot(data) {
  const played = data.matches.filter((m) => m.status === "completed").length;
  const left = data.matches.filter((m) => m.status !== "completed").length;
  const top = leaderboard(data)[0];
  return [
    `**${data.title}**`,
    `Facilitator: ${data.facilitator || "—"}`,
    `Players: ${data.players.length} · Matches: ${data.matches.length} · Pending: ${left} · Done: ${played}`,
    `Leader: ${top ? `${top.name} (${top.wins}-${top.losses})` : "—"}`,
  ].join("\n");
}

export async function addPlayer(name) {
  const data = await loadData();
  const trimmed = String(name || "").trim();
  if (!trimmed) return { ok: false, error: "Enter a player name." };
  if (data.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "Player already exists." };
  }
  data.players.push({
    id: uid("p"),
    name: trimmed,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
  });
  await saveData(data);
  return { ok: true, message: `Added **${trimmed}**.` };
}

export async function removePlayer(name) {
  const data = await loadData();
  const player = findPlayer(data, name);
  if (!player) return { ok: false, error: `Player **${name}** not found.` };
  data.players = data.players.filter((p) => p.id !== player.id);
  data.matches = data.matches.filter(
    (m) => m.player1Id !== player.id && m.player2Id !== player.id
  );
  data.players = recompute(data.players, data.matches);
  await saveData(data);
  return { ok: true, message: `Removed **${player.name}** and their matches.` };
}

export async function listPlayers() {
  const data = await loadData();
  if (!data.players.length) return { ok: true, message: "No players yet." };
  const lines = leaderboard(data).map(
    (p, i) => `${i + 1}. **${p.name}** — ${p.wins}-${p.losses} (${p.gamesPlayed} gp)`
  );
  return { ok: true, message: lines.join("\n") };
}

export async function setFacilitator(name) {
  const data = await loadData();
  data.facilitator = String(name || "").trim();
  await saveData(data);
  return {
    ok: true,
    message: data.facilitator
      ? `Facilitator set to **${data.facilitator}**.`
      : "Facilitator cleared.",
  };
}

export async function createMatch(name1, name2, { force = false } = {}) {
  const data = await loadData();
  const p1 = findPlayer(data, name1);
  const p2 = findPlayer(data, name2);
  if (!p1 || !p2) return { ok: false, error: "Both players must exist on the roster." };
  if (p1.id === p2.id) return { ok: false, error: "A player can’t face themselves." };

  const existing = data.matches.filter((m) => isSamePair(m, p1.id, p2.id));
  if (existing.length && !force) {
    return {
      ok: false,
      code: "DUPLICATE_PAIR",
      error: `${p1.name} vs ${p2.name} already have ${existing.length} match(es). Use rematch:true to force.`,
    };
  }

  data.matches.unshift({
    id: uid("m"),
    player1Id: p1.id,
    player2Id: p2.id,
    winnerId: null,
    status: "pending",
    createdAt: new Date().toISOString(),
    rematch: existing.length > 0,
    facilitator: data.facilitator || "",
  });
  data.players = recompute(data.players, data.matches);
  await saveData(data);
  return {
    ok: true,
    message: existing.length
      ? `Rematch created: **${p1.name}** vs **${p2.name}**.`
      : `Match created: **${p1.name}** vs **${p2.name}**.`,
  };
}

export async function scoreMatch(winnerName, loserName) {
  const data = await loadData();
  const winner = findPlayer(data, winnerName);
  const loser = findPlayer(data, loserName);
  if (!winner || !loser) return { ok: false, error: "Both players must exist." };

  const match = data.matches.find(
    (m) =>
      m.status !== "completed" &&
      isSamePair(m, winner.id, loser.id)
  );
  if (!match) {
    return {
      ok: false,
      error: `No pending match for **${winner.name}** vs **${loser.name}**.`,
    };
  }
  match.winnerId = winner.id;
  match.status = "completed";
  data.players = recompute(data.players, data.matches);
  await saveData(data);
  return { ok: true, message: `**${winner.name}** beat **${loser.name}** (1-0).` };
}

export async function listMatches(filter = "pending", playerQuery = "") {
  const data = await loadData();
  const rawFilter = String(filter || "").trim();
  const rawPlayer = String(playerQuery || "").trim();
  const filterKey = rawFilter.toLowerCase();

  let status = "pending";
  let name = rawPlayer;
  if (MATCH_FILTERS.has(filterKey)) {
    status = filterKey === "completed" ? "done" : filterKey;
  } else if (rawFilter) {
    name = rawFilter;
    status = rawPlayer ? "pending" : "all";
  }

  let list = data.matches;
  if (status === "pending") list = list.filter((m) => m.status !== "completed");
  if (status === "done") list = list.filter((m) => m.status === "completed");

  let player = null;
  if (name) {
    player = findPlayerLoose(data, name);
    if (!player) {
      const names = data.players.map((p) => p.name).slice(0, 12).join(", ");
      return {
        ok: false,
        error: names
          ? `Player **${name}** not found. Roster: ${names}`
          : `Player **${name}** not found.`,
      };
    }
    list = list.filter((m) => m.player1Id === player.id || m.player2Id === player.id);
  }

  if (!list.length) {
    return {
      ok: true,
      message: player
        ? `No matches in that filter for **${player.name}**.`
        : "No matches in that filter.",
    };
  }

  const lines = list.slice(0, 20).map((m) => {
    const a = playerName(data, m.player1Id);
    const b = playerName(data, m.player2Id);
    if (m.status === "completed") {
      const w = playerName(data, m.winnerId);
      return `✅ ${a} vs ${b} — **${w}**`;
    }
    return `⏳ ${a} vs ${b}`;
  });
  if (list.length > 20) lines.push(`…and ${list.length - 20} more`);
  return { ok: true, message: lines.join("\n") };
}

export async function showLeaderboard() {
  const data = await loadData();
  if (!data.players.length) return { ok: true, message: "No standings yet." };
  const lines = leaderboard(data).map((p, i) => {
    const pct = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
    return `${i + 1}. **${p.name}** — ${p.wins}-${p.losses} · ${pct}%`;
  });
  return { ok: true, message: lines.join("\n") };
}

export async function showStatus() {
  const data = await loadData();
  return { ok: true, message: snapshot(data) };
}
