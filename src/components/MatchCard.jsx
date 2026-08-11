import { Button, Card, Chip } from "@heroui/react";
import { useBunny } from "../store";

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
  const foot = [
    done ? `Winner · ${winnerName}` : "Pending",
    isRematch ? "Rematch" : null,
    match.facilitator || null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            className={`flex min-h-[4.25rem] flex-col justify-center gap-1 px-3 py-3 pr-5 ${
              p1Won
                ? "bg-pink-100/90 text-pink-600"
                : p2Won
                  ? "bg-[#ece6ea] text-[#8d7380]"
                  : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-4 shrink-0 rounded-full ${
                  p1Won
                    ? "bg-pink-500 ring-2 ring-pink-200"
                    : "bg-gradient-to-br from-pink-200 to-pink-500"
                }`}
              />
              <span className={`truncate text-sm font-extrabold ${p2Won ? "line-through opacity-70" : ""}`}>
                {p1}
              </span>
            </div>
            {p1Won && (
              <Chip size="sm" className="w-fit bg-pink-500 text-[10px] font-extrabold text-white">
                WIN
              </Chip>
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 z-[1] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white text-[10px] font-extrabold text-[#8d7380] shadow-sm">
            vs
          </div>
          <div
            className={`flex min-h-[4.25rem] flex-col items-end justify-center gap-1 px-3 py-3 pl-5 text-right ${
              p2Won
                ? "bg-pink-100/90 text-pink-600"
                : p1Won
                  ? "bg-[#ece6ea] text-[#8d7380]"
                  : ""
            }`}
          >
            <div className="flex items-center justify-end gap-2">
              <span className={`truncate text-sm font-extrabold ${p1Won ? "line-through opacity-70" : ""}`}>
                {p2}
              </span>
              <span
                className={`h-4 w-4 shrink-0 rounded-full ${
                  p2Won
                    ? "bg-pink-500 ring-2 ring-pink-200"
                    : "bg-gradient-to-br from-pink-200 to-pink-500"
                }`}
              />
            </div>
            {p2Won && (
              <Chip size="sm" className="w-fit bg-pink-500 text-[10px] font-extrabold text-white">
                WIN
              </Chip>
            )}
          </div>
        </div>
      </div>

      <p className={`mt-2 text-center text-[11px] font-semibold italic ${done ? "text-pink-600" : "text-[#8d7380]"}`}>
        {foot}
      </p>

      <Card.Footer className="mt-2 grid grid-cols-2 gap-2 p-0">
        <Button size="sm" variant="secondary" onPress={() => store.setWinner(match.id, match.player1Id)}>
          {p1} wins
        </Button>
        <Button size="sm" className="bg-pink-500 text-white" onPress={() => store.setWinner(match.id, match.player2Id)}>
          {p2} wins
        </Button>
        {done && (
          <Button size="sm" variant="ghost" onPress={() => store.clearMatch(match.id)}>
            Undo
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          className={done ? "" : "col-span-2"}
          onPress={() => {
            if (confirm("Delete this match?")) {
              store.deleteMatch(match.id);
              store.showToast("Match deleted", "ok");
            }
          }}
        >
          Delete
        </Button>
      </Card.Footer>
    </Card>
  );
}
