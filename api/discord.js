import { createRequire } from "node:module";
import { registerDiscordCommands } from "./lib/discord-commands.js";
import {
  addPlayer,
  createMatch,
  listMatches,
  listPlayers,
  removePlayer,
  scoreMatch,
  setFacilitator,
  showLeaderboard,
  showStatus,
  suggestPlayers,
} from "./lib/rr.js";

const require = createRequire(import.meta.url);
const {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} = require("discord-interactions");

export const config = {
  api: { bodyParser: false },
};

const PONG = InteractionResponseType?.PONG ?? 1;
const MESSAGE = InteractionResponseType?.CHANNEL_MESSAGE_WITH_SOURCE ?? 4;
const AUTOCOMPLETE_RESULT = InteractionResponseType?.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT ?? 8;
const PING = InteractionType?.PING ?? 1;
const COMMAND = InteractionType?.APPLICATION_COMMAND ?? 2;
const AUTOCOMPLETE = InteractionType?.APPLICATION_COMMAND_AUTOCOMPLETE ?? 4;

function envStatus() {
  return {
    DISCORD_PUBLIC_KEY: Boolean(process.env.DISCORD_PUBLIC_KEY),
    DISCORD_APP_ID: Boolean(process.env.DISCORD_APP_ID),
    DISCORD_BOT_TOKEN: Boolean(process.env.DISCORD_BOT_TOKEN),
    DISCORD_GUILD_ID: Boolean(process.env.DISCORD_GUILD_ID),
    JSONBIN_BIN_ID: Boolean(process.env.JSONBIN_BIN_ID || process.env.VITE_JSONBIN_BIN_ID),
    JSONBIN_MASTER_KEY: Boolean(process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY),
    JSONBIN_ACCESS_KEY: Boolean(process.env.JSONBIN_ACCESS_KEY || process.env.VITE_JSONBIN_ACCESS_KEY),
    verifyKey: typeof verifyKey === "function",
  };
}

function queryParam(req, name) {
  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.searchParams.has(name)) return url.searchParams.get(name);
    } catch {
      // fall through
    }
  }
  const value = req?.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function header(req, name) {
  const headers = req.headers || {};
  if (typeof headers.get === "function") return headers.get(name) || "";
  const value = headers[name] || headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

async function readRawBody(req) {
  if (typeof req.text === "function") return Buffer.from(await req.text(), "utf8");
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody), "utf8");
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function getOpt(interaction, name) {
  const opts = interaction.data?.options || [];
  const sub = opts.find((o) => o.type === 1);
  const list = sub?.options || opts;
  return list.find((o) => o.name === name)?.value;
}

function subcommand(interaction) {
  return interaction.data?.options?.find((o) => o.type === 1)?.name || "";
}

async function handleCommand(interaction) {
  if (interaction.data?.name !== "bunny") return { ok: false, error: "Unknown command." };
  const sub = subcommand(interaction);
  try {
    if (sub === "status") return await showStatus();
    if (sub === "leaderboard") return await showLeaderboard();
    if (sub === "players") return await listPlayers();
    if (sub === "add-player") return await addPlayer(getOpt(interaction, "name"));
    if (sub === "remove-player") return await removePlayer(getOpt(interaction, "name"));
    if (sub === "facilitator") return await setFacilitator(getOpt(interaction, "name") || "");
    if (sub === "matches") {
      return await listMatches(getOpt(interaction, "filter") || "", getOpt(interaction, "player") || "");
    }
    if (sub === "create-match") {
      return await createMatch(
        getOpt(interaction, "player1"),
        getOpt(interaction, "player2"),
        { force: Boolean(getOpt(interaction, "rematch")) }
      );
    }
    if (sub === "score") {
      return await scoreMatch(getOpt(interaction, "winner"), getOpt(interaction, "loser"));
    }
    return { ok: false, error: "Unknown subcommand." };
  } catch (err) {
    return { ok: false, error: err.message || "Command failed." };
  }
}

function json(res, body, status = 200) {
  if (res && typeof res.status === "function") {
    return res.status(status).json(body);
  }
  return Response.json(body, { status });
}

let commandSyncStarted = false;

async function processPost(req, res) {
  if (!commandSyncStarted) {
    commandSyncStarted = true;
    void registerDiscordCommands();
  }

  const publicKey = String(process.env.DISCORD_PUBLIC_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!publicKey) {
    if (res?.status) return res.status(500).send("Missing DISCORD_PUBLIC_KEY");
    return new Response("Missing DISCORD_PUBLIC_KEY", { status: 500 });
  }

  const signature = header(req, "x-signature-ed25519");
  const timestamp = header(req, "x-signature-timestamp");
  const rawBody = await readRawBody(req);

  const valid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!valid) {
    if (res?.status) return res.status(401).send("Bad request signature");
    return new Response("Bad request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody.toString("utf8"));

  if (interaction.type === PING) {
    return json(res, { type: PONG });
  }

  if (interaction.type === AUTOCOMPLETE) {
    const focused = (interaction.data?.options || [])
      .flatMap((opt) => (opt.type === 1 ? opt.options || [] : [opt]))
      .find((opt) => opt.focused);
    const choices = await suggestPlayers(focused?.value || "");
    return json(res, { type: AUTOCOMPLETE_RESULT, data: { choices } });
  }

  if (interaction.type === COMMAND) {
    const result = await handleCommand(interaction);
    const content = !result.ok && result.error ? `⚠️ ${result.error}` : result.message || "Done.";
    return json(res, {
      type: MESSAGE,
      data: { content },
    });
  }

  if (res?.status) return res.status(400).send("Unknown interaction");
  return new Response("Unknown interaction", { status: 400 });
}

async function handleGet(req, res) {
  if (queryParam(req, "sync") === "1" || queryParam(req, "sync") === "commands") {
    const result = await registerDiscordCommands();
    return json(res, result, result.ok ? 200 : 500);
  }
  return json(res, {
    ok: true,
    message: "Bunny Discord interactions endpoint. Add ?sync=1 to register slash commands from production env.",
    env: envStatus(),
  });
}

export async function GET(request) {
  return handleGet(request, null);
}

export async function POST(request) {
  return processPost(request, null);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method not allowed");
  }
  return processPost(req, res);
}
