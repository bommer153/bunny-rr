export const RANK_TABS = [
  { id: "wins", label: "Most win" },
  { id: "played", label: "Most game played" },
  { id: "losses", label: "Most lose" },
];

export function sortByRank(players, tab) {
  return [...players].sort((a, b) => {
    if (tab === "played" && b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    if (tab === "losses" && b.losses !== a.losses) return b.losses - a.losses;
    if (tab === "wins" && b.wins !== a.wins) return b.wins - a.wins;
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aPct = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
    const bPct = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
    if (bPct !== aPct) return bPct - aPct;
    return a.name.localeCompare(b.name);
  });
}

export default function RankingTabs({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-pink-200 bg-white p-1">
      {RANK_TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`min-h-12 rounded-xl px-2 py-2 text-center text-[11px] font-extrabold leading-tight sm:text-sm ${
              active ? "bg-pink-500 text-white shadow" : "text-[#5c4450] hover:bg-pink-50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
