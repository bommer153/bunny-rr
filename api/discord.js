import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { waitUntil } from "@vercel/functions";
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
} from "./lib/rr.js";

export const runtime = "nodejs";
export const maxDuration = 15;

function envStatus() {
  return {
    DISCORD_PUBLIC_KEY: Boolean(process.env.DISCORD_PUBLIC_KEY),
    JSONBIN_BIN_ID: Boolean(process.env.JSONBIN_BIN_ID || process.env.VITE_JSONBIN_BIN_ID),
    JSONBIN_MASTER_KEY: Boolean(process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY),
    JSONBIN_ACCESS_KEY: Boolean(process.env.JSONBIN_ACCESS_KEY || process.env.VITE_JSONBIN_ACCESS_KEY),
  };
}

function readHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  const value = headers[name] || headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

async function readRawBody(request) {
  if (request && typeof request.text === "function") {
    return request.text();
  }
  if (typeof request?.body === "string") return request.body;
  if (Buffer.isBuffer(request?.body)) return request.body.toString("utf8");
  if (request?.rawBody) {
    return Buffer.isBuffer(request.rawBody) ? request.rawBody.toString("utf8") : String(request.rawBody);
  }
  if (request?.readableEnded || request?.complete) {
    return typeof request.body === "object" && request.body ? JSON.stringify(request.body) : "";
  }
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
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
  const name = interaction.data?.name;
  if (name !== "bunny") return { ok: false, error: "Unknown command." };

  const sub = subcommand(interaction);
  try {
    if (sub === "status") return await showStatus();
    if (sub === "leaderboard") return await showLeaderboard();
    if (sub === "players") return await listPlayers();
    if (sub === "add-player") return await addPlayer(getOpt(interaction, "name"));
    if (sub === "remove-player") return await removePlayer(getOpt(interaction, "name"));
    if (sub === "facilitator") return await setFacilitator(getOpt(interaction, "name") || "");
    if (sub === "matches") return await listMatches(getOpt(interaction, "filter") || "pending");
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

async function editOriginal(interaction, content) {
  const url = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    console.error("Discord follow-up failed", res.status, await res.text());
  }
}

async function runCommand(interaction) {
  const result = await handleCommand(interaction);
  const content = !result.ok && result.error ? `⚠️ ${result.error}` : result.message || "Done.";
  await editOriginal(interaction, content);
}

export function GET() {
  return Response.json({
    ok: true,
    message: "Bunny Discord interactions endpoint. Discord will POST here.",
    env: envStatus(),
  });
}

export async function POST(request) {
  const publicKey = String(process.env.DISCORD_PUBLIC_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!publicKey) {
    return new Response("Missing DISCORD_PUBLIC_KEY", { status: 500 });
  }

  const signature = readHeader(request.headers, "x-signature-ed25519");
  const timestamp = readHeader(request.headers, "x-signature-timestamp");
  const rawBody = await readRawBody(request);

  let valid = false;
  try {
    valid = await verifyKey(rawBody, signature, timestamp, publicKey);
  } catch (err) {
    console.error("verifyKey threw", err);
  }
  if (!valid) {
    return new Response("Bad request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    waitUntil(runCommand(interaction));
    return Response.json({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE ?? 5,
    });
  }

  return new Response("Unknown interaction", { status: 400 });
}
