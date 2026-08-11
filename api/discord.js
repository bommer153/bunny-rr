import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
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

function envStatus() {
  return {
    DISCORD_PUBLIC_KEY: Boolean(process.env.DISCORD_PUBLIC_KEY),
    JSONBIN_BIN_ID: Boolean(process.env.JSONBIN_BIN_ID || process.env.VITE_JSONBIN_BIN_ID),
    JSONBIN_MASTER_KEY: Boolean(process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY),
    JSONBIN_ACCESS_KEY: Boolean(process.env.JSONBIN_ACCESS_KEY || process.env.VITE_JSONBIN_ACCESS_KEY),
  };
}

function header(request, name) {
  const value = request.headers.get(name);
  return Array.isArray(value) ? value[0] : value || "";
}

function messageResponse(content, ephemeral = false) {
  return Response.json(
    {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content,
        flags: ephemeral ? 64 : 0,
      },
    },
    { status: 200 }
  );
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
  if (name !== "bunny") {
    return { ok: false, error: "Unknown command." };
  }

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

export function GET() {
  return Response.json({
    ok: true,
    message: "Bunny Discord interactions endpoint. Discord will POST here.",
    env: envStatus(),
  });
}

export async function POST(request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return new Response("Missing DISCORD_PUBLIC_KEY", { status: 500 });
  }

  const signature = header(request, "x-signature-ed25519");
  const timestamp = header(request, "x-signature-timestamp");
  const rawBody = await request.text();

  const valid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!valid) {
    return new Response("Bad request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const result = await handleCommand(interaction);
    if (!result.ok && result.error) {
      return messageResponse(`⚠️ ${result.error}`, true);
    }
    return messageResponse(result.message || "Done.");
  }

  return new Response("Unknown interaction", { status: 400 });
}
