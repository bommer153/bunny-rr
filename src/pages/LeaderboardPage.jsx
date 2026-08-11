import { Card } from "@heroui/react";
import { useBunny } from "../store";

export default function LeaderboardPage() {
  const store = useBunny();
  const board = store.leaderboard;
  const top3 = board.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Players", store.players.length, "text-pink-500"],
          ["Played", store.gamesPlayed, "text-emerald-600"],
          ["Pending", store.matchesLeft, "text-amber-600"],
          ["Top W", board[0]?.wins ?? 0, "text-pink-400"],
        ].map(([label, value, color]) => (
          <Card key={label} className="p-3">
            <div className="text-[11px] font-bold text-[#8d7380]">{label}</div>
            <div className={`font-display text-2xl ${color}`}>{value}</div>
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-3">
        <div className="font-display text-base font-semibold">Podium</div>
        {!top3.length ? (
          <p className="text-sm text-[#8d7380]">No standings yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {top3.map((p, idx) => (
              <div
                key={p.id}
                className={`rounded-xl border border-pink-100 p-3 text-center ${
                  idx === 0 ? "bg-gradient-to-b from-pink-100 to-white sm:order-2" : idx === 1 ? "sm:order-1" : "sm:order-3"
                }`}
              >
                <div className="font-display text-lg text-pink-600">
                  {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}
                </div>
                <div className="font-bold">{p.name}</div>
                <div className="text-xs text-[#8d7380]">
                  {p.wins}W · {p.losses}L
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-3">
        <div className="font-display text-base font-semibold">Standings</div>
        <div className="space-y-2">
          {board.map((p, i) => {
            const pct = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-pink-100 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-pink-500">{i + 1}</span>
                  <div>
                    <div className="text-sm font-extrabold">{p.name}</div>
                    <div className="text-xs text-[#8d7380]">
                      {p.wins}-{p.losses} · {p.gamesPlayed} gp · {pct}%
                    </div>
                  </div>
                </div>
                <span className="font-display text-pink-600">{p.wins}W</span>
              </div>
            );
          })}
          {!board.length && <p className="text-sm text-[#8d7380]">No players yet.</p>}
        </div>
      </Card>
    </div>
  );
}
