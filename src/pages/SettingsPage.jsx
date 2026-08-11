import { useState } from "react";
import { Button, Card, Chip, Input } from "@heroui/react";
import { useBunny } from "../store";

export default function SettingsPage() {
  const store = useBunny();
  const [name, setName] = useState(store.facilitator);

  const syncLabel = store.syncing
    ? "Syncing…"
    : store.dirty
      ? "Pending…"
      : store.syncError
        ? "Failed"
        : "Synced";

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-3">
        <div className="font-display text-base font-semibold">Facilitator</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Facilitator"
            placeholder="Facilitator name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button
            className="bg-pink-500 text-white"
            onPress={() => {
              store.setFacilitator(name);
              store.showToast(name.trim() ? "Saved" : "Cleared", "ok");
            }}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-base font-semibold">Sync</div>
          <Chip size="sm" className="bg-emerald-50 text-emerald-700">
            {syncLabel}
          </Chip>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2 rounded-xl bg-pink-50 px-3 py-2">
            <span className="text-[#8d7380]">Updated</span>
            <strong>
              {store.updatedAt ? new Date(store.updatedAt).toLocaleString() : "—"}
            </strong>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-pink-50 px-3 py-2">
            <span className="text-[#8d7380]">Bin</span>
            <code className="break-all text-[11px]">{store.binId || "—"}</code>
          </div>
          {store.syncError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
              {store.syncError}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onPress={() =>
              store
                .load()
                .then(() => store.showToast("Refreshed", "ok"))
                .catch((e) => store.showToast(e.message, "error"))
            }
          >
            Refresh
          </Button>
          {(store.syncError || store.dirty) && (
            <Button
              className="bg-pink-500 text-white"
              onPress={() =>
                store
                  .save()
                  .then(() => store.showToast("Synced", "ok"))
                  .catch((e) => store.showToast(e.message, "error"))
              }
            >
              Retry
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
