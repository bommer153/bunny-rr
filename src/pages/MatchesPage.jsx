import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input, Chip } from "@heroui/react";
import MatchCard from "../components/MatchCard";
import { sortMatchesByEncode, useBunny } from "../store";

export default function MatchesPage() {
  const store = useBunny();
  const [filter, setFilter] = useState("pending");
  const [playerFilter, setPlayerFilter] = useState("");
  const [view, setView] = useState("matches");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [fac, setFac] = useState(null);

  const facilitator = fac === null ? store.facilitator : fac;

  const rematchCount = store.matches.filter(
    (m) => store.pairCount(m.player1Id, m.player2Id) > 1 || m.rematch
  ).length;

  const encodeOrder = useMemo(() => {
    const map = new Map();
    sortMatchesByEncode(store.matches).forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [store.matches]);

  const filtered = useMemo(() => {
    return sortMatchesByEncode(store.matches, { newestFirst: filter === "done" }).filter((m) => {
      if (playerFilter && m.player1Id !== playerFilter && m.player2Id !== playerFilter) {
        return false;
      }
      if (filter === "pending") return m.status !== "completed";
      if (filter === "done") return m.status === "completed";
      if (filter === "rematch") {
        return store.pairCount(m.player1Id, m.player2Id) > 1 || m.rematch;
      }
      return true;
    });
  }, [store.matches, filter, playerFilter, store]);

  const pairWarning = (() => {
    if (!p1 || !p2) return null;
    if (p1 === p2) {
      return { tone: "error", title: "Same player", body: "Pick two different players." };
    }
    const existing = store.findPairMatches(p1, p2);
    if (!existing.length) {
      return { tone: "ok", title: "Fresh pairing", body: "These players have not faced each other yet." };
    }
    const done = existing.filter((m) => m.status === "completed").length;
    return {
      tone: "warn",
      title: "Already matched",
      body: `${store.playerName(p1)} vs ${store.playerName(p2)} have ${existing.length} match(es) (${done} done).`,
    };
  })();

  const create = () => {
    const value = String(facilitator || "").trim();
    if (value !== store.facilitator) store.setFacilitator(value);

    let result = store.createMatch(p1, p2, { facilitator: value });
    if (!result.ok && result.code === "DUPLICATE_PAIR") {
      const ok = confirm(`${result.error}\n\nCreate rematch anyway?`);
      if (!ok) return;
      result = store.createMatch(p1, p2, { force: true, facilitator: value });
    }
    if (!result.ok) {
      store.showToast(result.error, "error");
      return;
    }
    setP1("");
    setP2("");
    store.showToast(result.rematch ? "Rematch created" : "Match created", result.rematch ? "warn" : "ok");
  };

  const playerOptions = [...store.players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Total", store.matches.length, "text-pink-500"],
          ["Players", store.players.length, "text-emerald-600"],
          ["Pending", store.matchesLeft, "text-amber-600"],
          ["Done", store.gamesPlayed, "text-pink-400"],
        ].map(([label, value, color]) => (
          <Card key={label} className="p-3">
            <div className="text-[11px] font-bold text-[#8d7380]">{label}</div>
            <div className={`font-display text-2xl ${color}`}>{value}</div>
          </Card>
        ))}
      </div>

      

      <Card className="space-y-3 p-3">
        <div className="font-display text-base font-semibold">Create match</div>
        {store.players.length < 2 ? (
          <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50 p-4 text-center">
            <p className="mb-2 text-sm text-[#8d7380]">Need at least 2 players.</p>
            <Link
              to="/players"
              className="inline-flex h-8 items-center rounded-full bg-pink-100 px-3 text-xs font-extrabold text-pink-600"
            >
              Go to Players
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="grid gap-1 text-xs font-bold uppercase text-[#8d7380]">
                Player 1
                <select
                  className="h-10 rounded-xl border border-pink-200 bg-white px-3 text-sm font-semibold text-[#2b1a24]"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                >
                  <option value="">Select</option>
                  {playerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase text-[#8d7380]">
                Player 2
                <select
                  className="h-10 rounded-xl border border-pink-200 bg-white px-3 text-sm font-semibold text-[#2b1a24]"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                >
                  <option value="">Select</option>
                  {playerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase text-[#8d7380]">
                <span className="flex items-center gap-1.5">
                  Facilitator
                  {String(facilitator || "").trim() ? (
                    <Chip size="sm" className="bg-pink-100 normal-case text-[10px] font-extrabold text-pink-600">
                      {String(facilitator).trim()}
                    </Chip>
                  ) : null}
                </span>
                <Input
                  aria-label="Match facilitator"
                  value={facilitator}
                  onChange={(e) => setFac(e.target.value)}
                />
              </label>
            </div>
            {pairWarning && (
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  pairWarning.tone === "error"
                    ? "bg-red-50 text-red-700"
                    : pairWarning.tone === "warn"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <strong>{pairWarning.title}</strong>
                <div>{pairWarning.body}</div>
              </div>
            )}
            <Button className="bg-pink-500 text-white" onPress={create}>
              Create match
            </Button>
          </>
        )}
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full bg-pink-100/80 p-1">
          {["matches", "table"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                view === v ? "bg-[#2b1a24] text-white" : "text-[#5c4450]"
              }`}
            >
              {v === "matches" ? "Matches" : "League Table"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              const value = String(facilitator || "").trim();
              if (store.matches.length && !confirm("Replace all matches with full round robin?")) {
                return;
              }
              const r = store.generateRoundRobin({ append: false, facilitator: value });
              if (!r.ok) store.showToast(r.error, "error");
              else store.showToast(`Generated ${r.count}`, "ok");
            }}
          >
            Generate RR
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              const r = store.generateRoundRobin({
                append: true,
                facilitator: String(facilitator || "").trim(),
              });
              if (!r.ok) store.showToast(r.error, "error");
              else store.showToast(`Added ${r.count}`, "ok");
            }}
          >
            Add missing
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              if (!store.matches.length) return;
              if (!confirm("Reset all scores?")) return;
              store.resetScores();
              store.showToast("Scores reset", "ok");
            }}
          >
            Reset scores
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <Card className="space-y-2 p-3">
          <div className="font-display text-base font-semibold">League table</div>
          <div className="space-y-2 md:hidden">
            {store.leaderboard.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-pink-100 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-pink-500">{i + 1}</span>
                  <div>
                    <div className="text-sm font-extrabold">{p.name}</div>
                    <div className="text-xs text-[#8d7380]">
                      {p.wins}-{p.losses} · {p.gamesPlayed} gp
                    </div>
                  </div>
                </div>
                <span className="font-display text-pink-600">{p.wins}W</span>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[#8d7380]">
                <tr>
                  <th className="py-2">#</th>
                  <th>Player</th>
                  <th>W-L</th>
                  <th>GP</th>
                  <th>Win %</th>
                </tr>
              </thead>
              <tbody>
                {store.leaderboard.map((p, i) => {
                  const pct = p.gamesPlayed
                    ? Math.round((p.wins / p.gamesPlayed) * 100)
                    : 0;
                  return (
                    <tr key={p.id} className="border-t border-pink-100">
                      <td className="py-2 font-display text-pink-500">{i + 1}</td>
                      <td>{p.name}</td>
                      <td>
                        {p.wins}-{p.losses}
                      </td>
                      <td>{p.gamesPlayed}</td>
                      <td>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase text-[#8d7380]">
                  Status filter
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "pending", "done", "rematch"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                        filter === f ? "bg-[#2b1a24] text-white" : "bg-pink-100 text-[#5c4450]"
                      }`}
                    >
                      {f === "all" ? "All" : f === "done" ? "Completed" : f[0].toUpperCase() + f.slice(1)}
                      {f === "rematch" ? ` (${rematchCount})` : ""}
                    </button>
                  ))}
                </div>
              </div>
              <label className="grid gap-1 text-[11px] font-bold uppercase text-[#8d7380]">
                Player
                <select
                  aria-label="Filter matches by player"
                  className="h-9 min-w-[11rem] rounded-xl border border-pink-200 bg-white px-3 text-sm font-semibold text-[#2b1a24]"
                  value={playerFilter}
                  onChange={(e) => setPlayerFilter(e.target.value)}
                >
                  <option value="">All players</option>
                  {playerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <div>
            <div className="mb-2 font-display text-base font-semibold">
              Match list · {filtered.length}
            </div>
            {!filtered.length ? (
              <Card className="p-6 text-center text-sm text-[#8d7380]">
                {playerFilter || filter !== "all"
                  ? "No matches for this filter."
                  : "No matches yet. Create one or generate a round robin."}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((m) => (
                  <MatchCard key={m.id} match={m} number={encodeOrder.get(m.id)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
