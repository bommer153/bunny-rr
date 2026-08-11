import { Button, Card, Chip } from "@heroui/react";
import { useBunny } from "../store";

function WinCheck({ checked, label, align = "left", onToggle }) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-center gap-1.5 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onToggle}
        aria-label={`${label} wins`}
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-pink-500 bg-pink-500 text-white"
            : "border-pink-300 bg-white"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="truncate text-sm font-extrabold">{label}</span>
    </label>
  );
}

export default function MatchCard({ match }) {
  const store = useBunny();
  const p1 = store.playerName(match.player1Id);
  const p2 = store.playerName(match.player2Id);
  const done = match.status === "completed";
  const p1Won = done && match.winnerId === match.player1Id;
  const p2Won = done && match.winnerId === match.player2Id;
  const winnerName = p1Won ? p1 : p2Won ? p2 : "";
  const isRematch = store.pairCount(match.player1Id, match.player2Id) > 1 || match.rematch;
  const scoreL = p1Won ? "1" : "0";
  const scoreR = p2Won ? "1" : "0";
  const foot = [done ? `Winner · ${winnerName}` : "Pending", isRematch ? "Rematch" : null]
    .filter(Boolean)
    .join(" · ");

  const pick = (playerId, alreadyWon) => {
    if (alreadyWon) store.clearMatch(match.id);
    else store.setWinner(match.id, playerId);
  };

  return (
    <Card className={`relative overflow-visible pt-3 ${isRematch ? "ring-1 ring-amber-300" : ""}`}>
      <div
        className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg px-3 py-1 font-mono text-xs font-bold tracking-wide text-white shadow ${
          done ? "bg-pink-600" : "bg-[#2a2430]"
        }`}
      >
        {scoreL} <span className="opacity-70">:</span> {scoreR}
      </div>

      <div className="overflow-hidden rounded-xl bg-[#f3eef1]">
        <div className="grid grid-cols-2 bg-[#e8e1e6] px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-wide text-[#8d7380]">
          <span className={p1Won ? "text-pink-600" : p2Won ? "opacity-50" : ""}>
            {p1Won ? "Winner" : p2Won ? "Lost" : "Player 1"}
          </span>
          <span className={`text-right ${p2Won ? "text-pink-600" : p1Won ? "opacity-50" : ""}`}>
            {p2Won ? "Winner" : p1Won ? "Lost" : "Player 2"}
          </span>
        </div>

        <div className="relative grid grid-cols-2">
          <div className="absolute bottom-[10%] left-1/2 top-[10%] w-px -translate-x-1/2 bg-white/80" />
          <div
            className={`flex items-center px-3 py-2.5 pr-5 ${
              p1Won
                ? "bg-pink-100/90 text-pink-600"
                : p2Won
                  ? "bg-[#ece6ea] text-[#8d7380]"
                  : "text-[#2b1a24]"
            }`}
          >
            <WinCheck checked={p1Won} label={p1} onToggle={() => pick(match.player1Id, p1Won)} />
          </div>
          <div className="absolute left-1/2 top-1/2 z-[1] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white text-[10px] font-extrabold text-[#8d7380] shadow-sm">
            vs
          </div>
          <div
            className={`flex items-center justify-end px-3 py-2.5 pl-5 text-right ${
              p2Won
                ? "bg-pink-100/90 text-pink-600"
                : p1Won
                  ? "bg-[#ece6ea] text-[#8d7380]"
                  : "text-[#2b1a24]"
            }`}
          >
            <WinCheck
              checked={p2Won}
              label={p2}
              align="right"
              onToggle={() => pick(match.player2Id, p2Won)}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {match.facilitator ? (
            <Chip size="sm" className="max-w-full bg-pink-100 text-[10px] font-extrabold text-pink-600">
              {match.facilitator}
            </Chip>
          ) : null}
          <p className={`min-w-0 truncate text-[11px] font-semibold italic ${done ? "text-pink-600" : "text-[#8d7380]"}`}>
            {foot}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 px-2 text-[11px] text-red-500"
          onPress={() => {
            if (confirm("Delete this match?")) {
              store.deleteMatch(match.id);
              store.showToast("Match deleted", "ok");
            }
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
