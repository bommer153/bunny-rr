(() => {
  const STORAGE_BIN_KEY = "bunny-rr-bin-id";
  const STORAGE_CACHE_KEY = "bunny-rr-cache";
  const AUTO_SAVE_MS = 900;
  const cfg = window.APP_CONFIG;

  const state = {
    title: cfg.title,
    facilitator: "",
    players: [],
    matches: [],
    updatedAt: null,
    ready: false,
    dirty: false,
    syncing: false,
    syncError: "",
  };

  let saveTimer = null;
  let saveQueue = Promise.resolve();
  let pendingResave = false;

  const listeners = new Set();

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getBinId() {
    return cfg.binId || localStorage.getItem(STORAGE_BIN_KEY) || "";
  }

  function setBinId(id) {
    cfg.binId = id;
    localStorage.setItem(STORAGE_BIN_KEY, id);
  }

  function notify() {
    for (const fn of listeners) fn(getSnapshot());
  }

  function getSnapshot() {
    return {
      ...state,
      binId: getBinId(),
      gamesPlayed: state.matches.filter((m) => m.status === "completed").length,
      matchesLeft: state.matches.filter((m) => m.status !== "completed").length,
    };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function scheduleAutoSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      autoSave().catch(() => {});
    }, AUTO_SAVE_MS);
  }

  function markDirty() {
    if (state.syncing) pendingResave = true;
    state.dirty = true;
    state.syncError = "";
    cacheLocal();
    notify();
    if (!state.syncing) scheduleAutoSave();
  }

  function cacheLocal() {
    localStorage.setItem(
      STORAGE_CACHE_KEY,
      JSON.stringify({
        title: state.title,
        facilitator: state.facilitator,
        players: state.players,
        matches: state.matches,
        updatedAt: state.updatedAt,
      })
    );
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (!raw) return false;
      applyPayload(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }

  function authHeaders(includeJson = false) {
    const headers = { "X-Access-Key": cfg.accessKey };
    if (includeJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  function masterHeaders(includeJson = false) {
    const headers = { "X-Master-Key": cfg.masterKey };
    if (includeJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  function payloadFromState() {
    return {
      title: state.title,
      facilitator: state.facilitator,
      players: state.players,
      matches: state.matches,
      updatedAt: new Date().toISOString(),
    };
  }

  function applyPayload(data) {
    state.title = data.title || cfg.title;
    state.facilitator = data.facilitator || "";
    state.players = Array.isArray(data.players) ? data.players : [];
    state.matches = Array.isArray(data.matches) ? data.matches : [];
    state.updatedAt = data.updatedAt || null;
  }

  async function createBin() {
    const res = await fetch(`${cfg.apiBase}/b`, {
      method: "POST",
      headers: {
        ...masterHeaders(true),
        "X-Bin-Name": cfg.title,
        "X-Bin-Private": "true",
      },
      body: JSON.stringify(payloadFromState()),
    });
    if (!res.ok) throw new Error(`Create bin failed (${res.status})`);
    const json = await res.json();
    const id = json?.metadata?.id;
    if (!id) throw new Error("No bin id returned.");
    setBinId(id);
    return id;
  }

  async function load() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    loadCache();
    state.ready = true;
    notify();

    let binId = getBinId();
    if (!binId) {
      binId = await createBin();
      state.dirty = false;
      state.syncing = false;
      state.syncError = "";
      cacheLocal();
      notify();
      return getSnapshot();
    }

    let res = await fetch(`${cfg.apiBase}/b/${binId}/latest`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      res = await fetch(`${cfg.apiBase}/b/${binId}/latest`, {
        headers: masterHeaders(),
      });
    }
    if (res.status === 404) {
      await createBin();
      state.dirty = false;
      state.syncing = false;
      state.syncError = "";
      cacheLocal();
      notify();
      return getSnapshot();
    }
    if (!res.ok) throw new Error(`Load failed (${res.status})`);

    const json = await res.json();
    applyPayload(json.record || json);
    state.dirty = false;
    state.syncing = false;
    state.syncError = "";
    cacheLocal();
    notify();
    return getSnapshot();
  }

  async function persistToCloud() {
    if (!state.dirty) return getSnapshot();

    let binId = getBinId();
    if (!binId) binId = await createBin();

    const body = payloadFromState();
    let res = await fetch(`${cfg.apiBase}/b/${binId}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      res = await fetch(`${cfg.apiBase}/b/${binId}`, {
        method: "PUT",
        headers: masterHeaders(true),
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) throw new Error(`Save failed (${res.status})`);

    state.updatedAt = body.updatedAt;
    if (!pendingResave) state.dirty = false;
    state.syncError = "";
    cacheLocal();
    notify();
    return getSnapshot();
  }

  async function autoSave() {
    saveQueue = saveQueue.then(async () => {
      if (!state.dirty) return getSnapshot();

      state.syncing = true;
      state.syncError = "";
      notify();

      try {
        do {
          pendingResave = false;
          await persistToCloud();
        } while (pendingResave && state.dirty);
        return getSnapshot();
      } catch (err) {
        state.syncError = err.message || "Auto-sync failed";
        throw err;
      } finally {
        state.syncing = false;
        notify();
        if (state.dirty) scheduleAutoSave();
      }
    });

    return saveQueue;
  }

  async function save() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (state.syncing) pendingResave = true;
    return autoSave();
  }

  function flushSync() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (state.dirty || state.syncing) {
      return save();
    }
    return Promise.resolve(getSnapshot());
  }

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.dirty) {
      flushSync().catch(() => {});
    }
  });

  window.addEventListener("beforeunload", () => {
    if (!state.dirty) return;
    // Best-effort: kick a final save; browsers may cancel in-flight requests.
    flushSync().catch(() => {});
  });

  function recomputePlayerRecords() {
    const map = Object.fromEntries(
      state.players.map((p) => [p.id, { wins: 0, losses: 0, gamesPlayed: 0 }])
    );

    for (const match of state.matches) {
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

    state.players = state.players.map((p) => ({
      ...p,
      wins: map[p.id].wins,
      losses: map[p.id].losses,
      gamesPlayed: map[p.id].gamesPlayed,
    }));
  }

  function setFacilitator(name) {
    state.facilitator = name.trim();
    markDirty();
  }

  function applyFacilitatorToAll(name) {
    const value = (name ?? state.facilitator).trim();
    state.facilitator = value;
    state.matches = state.matches.map((m) => ({
      ...m,
      facilitator: value,
    }));
    markDirty();
    return { ok: true, count: state.matches.length, facilitator: value };
  }

  function setMatchFacilitator(matchId, name) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: "Match not found." };
    match.facilitator = String(name || "").trim();
    markDirty();
    return { ok: true };
  }

  function addPlayer(name) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Enter a player name." };
    if (state.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "Player already exists." };
    }
    state.players.push({
      id: uid("p"),
      name: trimmed,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    });
    markDirty();
    return { ok: true };
  }

  function removePlayer(playerId) {
    state.players = state.players.filter((p) => p.id !== playerId);
    state.matches = state.matches.filter(
      (m) => m.player1Id !== playerId && m.player2Id !== playerId
    );
    recomputePlayerRecords();
    markDirty();
  }

  function pairKey(a, b) {
    return [a, b].sort().join("::");
  }

  function isSamePair(match, player1Id, player2Id) {
    return pairKey(match.player1Id, match.player2Id) === pairKey(player1Id, player2Id);
  }

  function findPairMatches(player1Id, player2Id) {
    return state.matches.filter((m) => isSamePair(m, player1Id, player2Id));
  }

  function pairCount(player1Id, player2Id) {
    return findPairMatches(player1Id, player2Id).length;
  }

  function createMatch(player1Id, player2Id, { force = false, facilitator = null } = {}) {
    if (!player1Id || !player2Id) {
      return { ok: false, error: "Pick both players." };
    }
    if (player1Id === player2Id) {
      return { ok: false, error: "A player can’t face themselves." };
    }
    const p1 = state.players.find((p) => p.id === player1Id);
    const p2 = state.players.find((p) => p.id === player2Id);
    if (!p1 || !p2) {
      return { ok: false, error: "One of those players is missing." };
    }

    const existing = findPairMatches(player1Id, player2Id);
    if (existing.length && !force) {
      return {
        ok: false,
        code: "DUPLICATE_PAIR",
        error: `${p1.name} and ${p2.name} already have ${existing.length} match${existing.length > 1 ? "es" : ""}.`,
        existingCount: existing.length,
        player1Name: p1.name,
        player2Name: p2.name,
      };
    }

    const fac =
      facilitator === null || facilitator === undefined
        ? state.facilitator
        : String(facilitator).trim();

    const match = {
      id: uid("m"),
      player1Id,
      player2Id,
      winnerId: null,
      status: "pending",
      createdAt: new Date().toISOString(),
      rematch: existing.length > 0,
      facilitator: fac,
    };
    state.matches.unshift(match);
    recomputePlayerRecords();
    markDirty();
    return { ok: true, match, rematch: existing.length > 0, existingCount: existing.length };
  }

  function deleteMatch(matchId) {
    const before = state.matches.length;
    state.matches = state.matches.filter((m) => m.id !== matchId);
    if (state.matches.length === before) return { ok: false, error: "Match not found." };
    recomputePlayerRecords();
    markDirty();
    return { ok: true };
  }

  function generateRoundRobin({ append = false, facilitator = null } = {}) {
    if (state.players.length < 2) {
      return { ok: false, error: "Need at least 2 players." };
    }
    const fac =
      facilitator === null || facilitator === undefined
        ? state.facilitator
        : String(facilitator).trim();

    const pairs = [];
    for (let i = 0; i < state.players.length; i++) {
      for (let j = i + 1; j < state.players.length; j++) {
        const a = state.players[i].id;
        const b = state.players[j].id;
        if (append && findPairMatches(a, b).length) continue;
        pairs.push({
          id: uid("m"),
          player1Id: a,
          player2Id: b,
          winnerId: null,
          status: "pending",
          createdAt: new Date().toISOString(),
          rematch: false,
          facilitator: fac,
        });
      }
    }
    if (!pairs.length) {
      return { ok: false, error: "Every pair already has a match." };
    }
    state.matches = append ? [...state.matches, ...pairs] : pairs;
    recomputePlayerRecords();
    markDirty();
    return { ok: true, count: pairs.length };
  }

  function resetScores() {
    state.matches = state.matches.map((m) => ({
      ...m,
      winnerId: null,
      status: "pending",
    }));
    recomputePlayerRecords();
    markDirty();
  }

  function setWinner(matchId, winnerId) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    match.winnerId = winnerId;
    match.status = "completed";
    recomputePlayerRecords();
    markDirty();
  }

  function clearMatch(matchId) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    match.winnerId = null;
    match.status = "pending";
    recomputePlayerRecords();
    markDirty();
  }

  function playerName(id) {
    return state.players.find((p) => p.id === id)?.name || "Unknown";
  }

  function leaderboard() {
    return [...state.players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aPct = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
      const bPct = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
      if (bPct !== aPct) return bPct - aPct;
      return a.name.localeCompare(b.name);
    });
  }

  window.BunnyStore = {
    load,
    save,
    flushSync,
    subscribe,
    getSnapshot,
    getBinId,
    setFacilitator,
    applyFacilitatorToAll,
    setMatchFacilitator,
    addPlayer,
    removePlayer,
    createMatch,
    deleteMatch,
    findPairMatches,
    pairCount,
    generateRoundRobin,
    resetScores,
    setWinner,
    clearMatch,
    playerName,
    leaderboard,
  };
})();
