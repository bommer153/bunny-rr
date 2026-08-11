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

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function reply(res, content, ephemeral = false) {
  return res.status(200).json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: ephemeral ? 64 : 0,
    },
  });
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
    return { content: "Unknown command.", ephemeral: true };
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return res.status(500).send("Missing DISCORD_PUBLIC_KEY");

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const rawBody = await readRawBody(req);

  const valid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!valid) return res.status(401).send("Bad request signature");

  const interaction = JSON.parse(rawBody.toString("utf8"));

  if (interaction.type === InteractionType.PING) {
    return res.status(200).json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const result = await handleCommand(interaction);
    if (!result.ok && result.error) {
      return reply(res, `⚠️ ${result.error}`, true);
    }
    return reply(res, result.message || "Done.");
  }

  return res.status(400).send("Unknown interaction");
}
