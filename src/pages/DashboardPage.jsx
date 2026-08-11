import { Link } from "react-router-dom";
import { Card } from "@heroui/react";
import { useBunny } from "../store";

export default function DashboardPage() {
  const store = useBunny();
  const top = store.leaderboard[0];

  let next = { title: "Add players", to: "/players", cta: "Players" };
  if (store.players.length >= 2 && !store.matches.length) {
    next = { title: "Create matches", to: "/matches", cta: "Matches" };
  } else if (store.matchesLeft > 0) {
    next = { title: `${store.matchesLeft} left to score`, to: "/matches", cta: "Score" };
  } else if (store.matches.length) {
    next = { title: "View standings", to: "/leaderboard", cta: "Board" };
  }

  const stats = [
    { label: "Players", value: store.players.length, color: "text-pink-500" },
    { label: "Matches", value: store.matches.length, color: "text-emerald-600" },
    { label: "Pending", value: store.matchesLeft, color: "text-amber-600" },
    { label: "Done", value: store.gamesPlayed, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[11px] font-bold text-[#8d7380]">{s.label}</div>
            <div className={`font-display text-2xl font-semibold ${s.color}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-row items-center justify-between gap-3 p-3">
        <div className="font-display text-base font-semibold text-pink-600">{next.title}</div>
        <Link
          to={next.to}
          className="inline-flex h-8 items-center rounded-full bg-pink-500 px-3 text-xs font-extrabold text-white"
        >
          {next.cta}
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Players", "/players"],
          ["Matches", "/matches"],
          ["Board", "/leaderboard"],
          ["Settings", "/settings"],
        ].map(([label, to]) => (
          <Link key={to} to={to}>
            <Card className="p-3 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-display text-sm font-semibold">{label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="space-y-2 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#8d7380]">Leader</span>
          <strong>
            {top ? `${top.name} · ${top.wins}-${top.losses}` : "—"}
          </strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8d7380]">Sync</span>
          <strong>
            {store.syncing ? "Syncing…" : store.dirty ? "Pending…" : "Synced"}
          </strong>
        </div>
      </Card>
    </div>
  );
}
