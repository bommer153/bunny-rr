import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input } from "@heroui/react";
import PlayerCard from "../components/PlayerCard";
import { useBunny } from "../store";

export default function PlayersPage() {
  const store = useBunny();
  const [name, setName] = useState("");

  const add = () => {
    const result = store.addPlayer(name);
    if (!result.ok) {
      store.showToast(result.error, "error");
      return;
    }
    setName("");
    store.showToast("Player added", "ok");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card className="p-3">
          <div className="text-[11px] font-bold text-[#8d7380]">Players</div>
          <div className="font-display text-2xl text-pink-500">{store.players.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] font-bold text-[#8d7380]">Ready</div>
          <div className="font-display text-2xl text-emerald-600">
            {store.players.length >= 2 ? "Yes" : "No"}
          </div>
        </Card>
      </div>

      <Card className="space-y-3 p-3">
        <Card.Header className="p-0">
          <Card.Title className="font-display text-base">Add player</Card.Title>
        </Card.Header>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Player name"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1"
          />
          <Button className="bg-pink-500 text-white" onPress={add}>
            Add
          </Button>
        </div>
      </Card>

      <Card className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Card.Title className="font-display text-base">
            Roster · {store.players.length}
          </Card.Title>
          {store.players.length >= 2 && (
            <Link
              to="/matches"
              className="inline-flex h-8 items-center rounded-full bg-pink-100 px-3 text-xs font-extrabold text-pink-600"
            >
              Matches
            </Link>
          )}
        </div>
        {!store.players.length ? (
          <p className="text-sm text-[#8d7380]">No players yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {store.players.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
