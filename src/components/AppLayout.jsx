import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button, Chip } from "@heroui/react";
import { useBunny } from "../store";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/players", label: "Players" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Board" },
];

function initials(name) {
  const parts = String(name || "B").trim().split(/\s+/);
  return ((parts[0]?.[0] || "B") + (parts[1]?.[0] || "")).toUpperCase();
}

function statusLabel(store) {
  if (!store.players.length) return "Setup";
  if (!store.matches.length) return "Ready";
  if (store.matchesLeft === 0) return "Completed";
  return "In Progress";
}

export default function AppLayout() {
  const store = useBunny();

  useEffect(() => {
    if (!store.toast) return;
    const t = setTimeout(() => store.clearToast(), 2600);
    return () => clearTimeout(t);
  }, [store.toast, store.clearToast]);

  const syncTone = store.syncError
    ? "danger"
    : store.syncing || store.dirty
      ? "warning"
      : "success";

  const syncText = store.syncError
    ? "Sync failed"
    : store.syncing
      ? "Auto-syncing…"
      : store.dirty
        ? "Pending sync…"
        : store.updatedAt
          ? `Synced · ${new Date(store.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Synced";

  return (
    <div className="min-h-screen bg-[#f7f0f3] text-[#2b1a24]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-pink-100 bg-white p-3 md:flex">
          <div className="mb-4 flex items-center gap-2 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-200 to-pink-500 text-sm text-white shadow-md shadow-pink-500/30">
              ✦
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">Bunny Anniv</div>
              <div className="text-[11px] font-semibold text-[#8d7380]">Round Robin</div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "bg-pink-100 text-pink-600"
                      : "text-[#5c4450] hover:bg-pink-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onPress={() =>
              store.load().then(() => store.showToast("Refreshed", "ok")).catch((e) =>
                store.showToast(e.message, "error")
              )
            }
          >
            Refresh
          </Button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-4">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-pink-100/80 bg-white/70 px-4 py-3 backdrop-blur md:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-semibold tracking-tight md:text-xl">
                  Bunny Anniv Round Robin
                </h1>
                <Chip size="sm" className="bg-pink-100 text-pink-600">
                  {statusLabel(store)}
                </Chip>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#8d7380]">
                {store.facilitator ? `Hosted by ${store.facilitator}` : "Tournament details"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="soft" color={syncTone}>
                {syncText}
              </Chip>
              <div className="flex items-center gap-2 rounded-full border border-pink-100 bg-white px-2 py-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-pink-500 text-[10px] font-bold text-white">
                  {initials(store.facilitator || "B")}
                </span>
                <span className="max-w-[7rem] truncate text-xs font-bold">
                  {store.facilitator || "Facilitator"}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 md:px-6">
            {!store.ready ? (
              <div className="text-sm font-semibold text-[#8d7380]">Loading…</div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-pink-100 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] font-extrabold ${
                isActive ? "bg-pink-100 text-pink-600" : "text-[#8d7380]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {store.toast && (
        <div
          className={`fixed bottom-20 left-3 right-3 z-50 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80 ${
            store.toast.tone === "error"
              ? "bg-red-500"
              : store.toast.tone === "warn"
                ? "bg-amber-600"
                : "bg-emerald-600"
          }`}
        >
          {store.toast.message}
        </div>
      )}
    </div>
  );
}
