import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "./config";

const STORAGE_BIN_KEY = "bunny-rr-bin-id";
const STORAGE_CACHE_KEY = "bunny-rr-cache";
const AUTO_SAVE_MS = 900;

const BunnyContext = createContext(null);

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function isSamePair(match, player1Id, player2Id) {
  return pairKey(match.player1Id, match.player2Id) === pairKey(player1Id, player2Id);
}

export function sortMatchesByEncode(matches, { newestFirst = false } = {}) {
  const list = matches
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const ta = Date.parse(a.m.createdAt || "") || 0;
      const tb = Date.parse(b.m.createdAt || "") || 0;
      if (ta !== tb) return ta - tb;
      return a.i - b.i;
    })
    .map(({ m }) => m);
  return newestFirst ? list.reverse() : list;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function authHeaders(includeJson = false) {
  const headers = { "X-Access-Key": APP_CONFIG.accessKey };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function masterHeaders(includeJson = false) {
  const headers = { "X-Master-Key": APP_CONFIG.masterKey };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function recompute(players, matches) {
  const map = Object.fromEntries(
    players.map((p) => [p.id, { wins: 0, losses: 0, gamesPlayed: 0 }])
  );
  for (const match of matches) {
    if (match.status !== "completed" || !match.winnerId) continue;
    const a = map[match.player1Id];
    const b = map[match.player2Id];
    if (!a || !b) continue;
    a.gamesPlayed += 1;
    b.gamesPlayed += 1;
    if (match.winnerId === match.player1Id) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }
  return players.map((p) => ({ ...p, ...map[p.id] }));
}

export function BunnyProvider({ children }) {
  const cached = loadCache();
  const [title] = useState(APP_CONFIG.title);
  const [facilitator, setFacilitatorState] = useState(cached?.facilitator || "");
  const [players, setPlayers] = useState(cached?.players || []);
  const [matches, setMatches] = useState(cached?.matches || []);
  const [updatedAt, setUpdatedAt] = useState(cached?.updatedAt || null);
  const [binId, setBinIdState] = useState(
    APP_CONFIG.binId || localStorage.getItem(STORAGE_BIN_KEY) || ""
  );
  const [dirty, setDirty] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  const saveTimer = useRef(null);
  const syncingRef = useRef(false);
  const pendingResave = useRef(false);
  const stateRef = useRef({});

  stateRef.current = { title, facilitator, players, matches, dirty };

  const showToast = useCallback((message, tone = "ok") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  const cacheLocal = useCallback((next) => {
    localStorage.setItem(
      STORAGE_CACHE_KEY,
      JSON.stringify({
        title: next.title,
        facilitator: next.facilitator,
        players: next.players,
        matches: next.matches,
        updatedAt: next.updatedAt,
      })
    );
  }, []);

  const setBinId = useCallback((id) => {
    APP_CONFIG.binId = id;
    localStorage.setItem(STORAGE_BIN_KEY, id);
    setBinIdState(id);
  }, []);

  const persistToCloud = useCallback(async () => {
    const snap = stateRef.current;
    if (!snap.dirty) return;

    let id = APP_CONFIG.binId || localStorage.getItem(STORAGE_BIN_KEY) || "";
    const body = {
      title: snap.title,
      facilitator: snap.facilitator,
      players: snap.players,
      matches: snap.matches,
      updatedAt: new Date().toISOString(),
    };

    if (!id) {
      const res = await fetch(`${APP_CONFIG.apiBase}/b`, {
        method: "POST",
        headers: {
          ...masterHeaders(true),
          "X-Bin-Name": APP_CONFIG.title,
          "X-Bin-Private": "true",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Create bin failed (${res.status})`);
      const json = await res.json();
      id = json?.metadata?.id;
      if (!id) throw new Error("No bin id returned.");
      setBinId(id);
    }

    let res = await fetch(`${APP_CONFIG.apiBase}/b/${id}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      res = await fetch(`${APP_CONFIG.apiBase}/b/${id}`, {
        method: "PUT",
        headers: masterHeaders(true),
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) throw new Error(`Save failed (${res.status})`);

    setUpdatedAt(body.updatedAt);
    if (!pendingResave.current) setDirty(false);
    setSyncError("");
    cacheLocal({ ...snap, updatedAt: body.updatedAt });
  }, [cacheLocal, setBinId]);

  const autoSave = useCallback(async () => {
    if (syncingRef.current) {
      pendingResave.current = true;
      return;
    }
    if (!stateRef.current.dirty) return;

    syncingRef.current = true;
    setSyncing(true);
    setSyncError("");
    try {
      do {
        pendingResave.current = false;
        await persistToCloud();
      } while (pendingResave.current && stateRef.current.dirty);
    } catch (err) {
      setSyncError(err.message || "Auto-sync failed");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (stateRef.current.dirty) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          autoSave();
        }, AUTO_SAVE_MS);
      }
    }
  }, [persistToCloud]);

  const markDirty = useCallback(
    (nextPlayers, nextMatches, nextFacilitator) => {
      if (syncingRef.current) pendingResave.current = true;
      const playersNext = nextPlayers ?? stateRef.current.players;
      const matchesNext = nextMatches ?? stateRef.current.matches;
      const facNext =
        nextFacilitator === undefined ? stateRef.current.facilitator : nextFacilitator;

      setPlayers(playersNext);
      setMatches(matchesNext);
      if (nextFacilitator !== undefined) setFacilitatorState(facNext);
      setDirty(true);
      setSyncError("");
      cacheLocal({
        title: stateRef.current.title,
        facilitator: facNext,
        players: playersNext,
        matches: matchesNext,
        updatedAt,
      });

      if (!syncingRef.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          autoSave();
        }, AUTO_SAVE_MS);
      }
    },
    [autoSave, cacheLocal, updatedAt]
  );

  const load = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    let id = APP_CONFIG.binId || localStorage.getItem(STORAGE_BIN_KEY) || "";
    if (!id) {
      const body = {
        title: APP_CONFIG.title,
        facilitator: "",
        players: [],
        matches: [],
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(`${APP_CONFIG.apiBase}/b`, {
        method: "POST",
        headers: {
          ...masterHeaders(true),
          "X-Bin-Name": APP_CONFIG.title,
          "X-Bin-Private": "true",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Create bin failed (${res.status})`);
      const json = await res.json();
      id = json?.metadata?.id;
      if (!id) throw new Error("No bin id returned.");
      setBinId(id);
      setFacilitatorState("");
      setPlayers([]);
      setMatches([]);
      setUpdatedAt(body.updatedAt);
      setDirty(false);
      setReady(true);
      cacheLocal(body);
      return;
    }

    let res = await fetch(`${APP_CONFIG.apiBase}/b/${id}/latest`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      res = await fetch(`${APP_CONFIG.apiBase}/b/${id}/latest`, {
        headers: masterHeaders(),
      });
    }
    if (!res.ok) throw new Error(`Load failed (${res.status})`);
    const json = await res.json();
    const data = json.record || json;
    setFacilitatorState(data.facilitator || "");
    setPlayers(Array.isArray(data.players) ? data.players : []);
    setMatches(Array.isArray(data.matches) ? data.matches : []);
    setUpdatedAt(data.updatedAt || null);
    setDirty(false);
    setSyncError("");
    setReady(true);
    cacheLocal({
      title: data.title || APP_CONFIG.title,
      facilitator: data.facilitator || "",
      players: data.players || [],
      matches: data.matches || [],
      updatedAt: data.updatedAt || null,
    });
  }, [cacheLocal, setBinId]);

  useEffect(() => {
    load().catch((err) => {
      setSyncError(err.message);
      setReady(true);
    });
  }, [load]);

  useEffect(() => {
    const onHide = () => {
      if (stateRef.current.dirty) autoSave();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });
    window.addEventListener("beforeunload", onHide);
    return () => window.removeEventListener("beforeunload", onHide);
  }, [autoSave]);

  const gamesPlayed = matches.filter((m) => m.status === "completed").length;
  const matchesPending = matches.filter((m) => m.status === "pending").length;
  const matchesOngoing = matches.filter((m) => m.status === "ongoing").length;
  const matchesLeft = matches.filter((m) => m.status !== "completed").length;

  const playerName = useCallback(
    (id) => players.find((p) => p.id === id)?.name || "Unknown",
    [players]
  );

  const findPairMatches = useCallback(
    (a, b) => matches.filter((m) => isSamePair(m, a, b)),
    [matches]
  );

  const pairCount = useCallback(
    (a, b) => findPairMatches(a, b).length,
    [findPairMatches]
  );

  const leaderboard = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aPct = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
      const bPct = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
      if (bPct !== aPct) return bPct - aPct;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  const api = useMemo(
    () => ({
      title,
      facilitator,
      players,
      matches,
      updatedAt,
      binId,
      dirty,
      syncing,
      syncError,
      ready,
      gamesPlayed,
      matchesPending,
      matchesOngoing,
      matchesLeft,
      toast,
      showToast,
      clearToast: () => setToast(null),
      playerName,
      findPairMatches,
      pairCount,
      leaderboard,
      load,
      save: autoSave,
      setFacilitator(name) {
        markDirty(undefined, undefined, String(name || "").trim());
      },
      applyFacilitatorToAll(name) {
        const value = String(name ?? facilitator).trim();
        const nextMatches = matches.map((m) => ({ ...m, facilitator: value }));
        markDirty(undefined, nextMatches, value);
        return { ok: true, count: nextMatches.length };
      },
      addPlayer(name) {
        const trimmed = String(name || "").trim();
        if (!trimmed) return { ok: false, error: "Enter a player name." };
        if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
          return { ok: false, error: "Player already exists." };
        }
        const next = [
          ...players,
          { id: uid("p"), name: trimmed, wins: 0, losses: 0, gamesPlayed: 0 },
        ];
        markDirty(next, undefined, undefined);
        return { ok: true };
      },
      removePlayer(playerId) {
        const nextPlayers = players.filter((p) => p.id !== playerId);
        const nextMatches = matches.filter(
          (m) => m.player1Id !== playerId && m.player2Id !== playerId
        );
        markDirty(recompute(nextPlayers, nextMatches), nextMatches, undefined);
      },
      createMatch(player1Id, player2Id, { force = false, facilitator: fac = null } = {}) {
        if (!player1Id || !player2Id) return { ok: false, error: "Pick both players." };
        if (player1Id === player2Id) {
          return { ok: false, error: "A player can’t face themselves." };
        }
        const p1 = players.find((p) => p.id === player1Id);
        const p2 = players.find((p) => p.id === player2Id);
        if (!p1 || !p2) return { ok: false, error: "One of those players is missing." };
        const existing = findPairMatches(player1Id, player2Id);
        if (existing.length && !force) {
          return {
            ok: false,
            code: "DUPLICATE_PAIR",
            error: `${p1.name} and ${p2.name} already have ${existing.length} match${existing.length > 1 ? "es" : ""}.`,
          };
        }
        const facValue =
          fac === null || fac === undefined ? facilitator : String(fac).trim();
        const match = {
          id: uid("m"),
          player1Id,
          player2Id,
          winnerId: null,
          status: "pending",
          createdAt: new Date().toISOString(),
          rematch: existing.length > 0,
          facilitator: facValue,
        };
        const nextMatches = [match, ...matches];
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
        return { ok: true, rematch: existing.length > 0 };
      },
      deleteMatch(matchId) {
        const nextMatches = matches.filter((m) => m.id !== matchId);
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
      },
      generateRoundRobin({ append = false, facilitator: fac = null } = {}) {
        if (players.length < 2) return { ok: false, error: "Need at least 2 players." };
        const facValue =
          fac === null || fac === undefined ? facilitator : String(fac).trim();
        const pairs = [];
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const a = players[i].id;
            const b = players[j].id;
            if (append && findPairMatches(a, b).length) continue;
            pairs.push({
              id: uid("m"),
              player1Id: a,
              player2Id: b,
              winnerId: null,
              status: "pending",
              createdAt: new Date().toISOString(),
              rematch: false,
              facilitator: facValue,
            });
          }
        }
        if (!pairs.length) return { ok: false, error: "Every pair already has a match." };
        const nextMatches = append ? [...matches, ...pairs] : pairs;
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
        return { ok: true, count: pairs.length };
      },
      resetScores() {
        const nextMatches = matches.map((m) => ({
          ...m,
          winnerId: null,
          status: "pending",
        }));
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
      },
      setWinner(matchId, winnerId) {
        const nextMatches = matches.map((m) =>
          m.id === matchId ? { ...m, winnerId, status: "completed" } : m
        );
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
      },
      setMatchStatus(matchId, status) {
        if (status !== "pending" && status !== "ongoing") {
          return { ok: false, error: "Invalid match status." };
        }
        const nextMatches = matches.map((m) => {
          if (m.id !== matchId) return m;
          return {
            ...m,
            status,
            winnerId: null,
            startedAt: status === "ongoing" ? new Date().toISOString() : null,
          };
        });
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
        return { ok: true };
      },
      clearMatch(matchId) {
        const nextMatches = matches.map((m) =>
          m.id === matchId ? { ...m, winnerId: null, status: "pending", startedAt: null } : m
        );
        markDirty(recompute(players, nextMatches), nextMatches, undefined);
      },
    }),
    [
      title,
      facilitator,
      players,
      matches,
      updatedAt,
      binId,
      dirty,
      syncing,
      syncError,
      ready,
      gamesPlayed,
      matchesPending,
      matchesOngoing,
      matchesLeft,
      toast,
      showToast,
      playerName,
      findPairMatches,
      pairCount,
      leaderboard,
      load,
      autoSave,
      markDirty,
    ]
  );

  return <BunnyContext.Provider value={api}>{children}</BunnyContext.Provider>;
}

export function useBunny() {
  const ctx = useContext(BunnyContext);
  if (!ctx) throw new Error("useBunny must be used within BunnyProvider");
  return ctx;
}
