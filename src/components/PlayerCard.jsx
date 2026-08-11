import { Button, Card } from "@heroui/react";
import { useBunny } from "../store";

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function PlayerCard({ player }) {
  const store = useBunny();
  const pct = player.gamesPlayed
    ? Math.round((player.wins / player.gamesPlayed) * 100)
    : 0;

  return (
    <Card className="relative overflow-visible pt-3">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg bg-[#2a2430] px-3 py-1 font-mono text-xs font-bold tracking-wide text-white shadow">
        {player.wins} <span className="opacity-70">:</span> {player.losses}
      </div>

      <div className="overflow-hidden rounded-xl bg-[#f3eef1]">
        <div className="bg-[#e8e1e6] px-3 pb-1.5 pt-4 text-center text-[10px] font-bold uppercase tracking-wide text-[#8d7380]">
          Player
        </div>
        <div className="flex flex-col items-center gap-2 px-3 py-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-pink-500 font-display text-sm font-bold text-white shadow-sm">
            {initials(player.name)}
          </span>
          <div className="truncate text-center text-sm font-extrabold">{player.name}</div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] font-semibold italic text-[#8d7380]">
        {player.gamesPlayed} played · {pct}% win
      </p>

      <Card.Footer className="mt-2 grid grid-cols-3 gap-1.5 p-0 text-center">
        <div className="rounded-lg bg-pink-50 px-1 py-1.5">
          <div className="font-display text-sm text-pink-600">{player.wins}</div>
          <div className="text-[10px] font-bold uppercase text-[#8d7380]">Win</div>
        </div>
        <div className="rounded-lg bg-pink-50 px-1 py-1.5">
          <div className="font-display text-sm text-[#2b1a24]">{player.losses}</div>
          <div className="text-[10px] font-bold uppercase text-[#8d7380]">Lose</div>
        </div>
        <div className="rounded-lg bg-pink-50 px-1 py-1.5">
          <div className="font-display text-sm text-[#2b1a24]">{player.gamesPlayed}</div>
          <div className="text-[10px] font-bold uppercase text-[#8d7380]">GP</div>
        </div>
      </Card.Footer>

      <Button
        size="sm"
        variant="danger"
        className="mt-2 w-full"
        onPress={() => {
          if (confirm(`Remove ${player.name}?`)) {
            store.removePlayer(player.id);
            store.showToast("Removed", "ok");
          }
        }}
      >
        Remove
      </Button>
    </Card>
  );
}
