(() => {
  const draft = {
    filter: "all",
    view: "matches",
    player1Id: "",
    player2Id: "",
    facilitator: null, // null = follow store default until user edits
  };

  function currentFacilitator(snap) {
    return draft.facilitator === null ? snap.facilitator || "" : draft.facilitator;
  }

  function pairWarningHtml() {
    const { escapeHtml } = BunnyUI;
    if (!draft.player1Id || !draft.player2Id) return "";
    if (draft.player1Id === draft.player2Id) {
      return `
        <div class="alert alert-error" role="alert">
          <strong>Same player selected</strong>
          <span>Pick two different players to create a match.</span>
        </div>`;
    }
    const existing = BunnyStore.findPairMatches(draft.player1Id, draft.player2Id);
    if (!existing.length) {
      return `
        <div class="alert alert-ok" role="status">
          <strong>Fresh pairing</strong>
          <span>These players have not faced each other yet.</span>
        </div>`;
    }
    const done = existing.filter((m) => m.status === "completed").length;
    const pending = existing.length - done;
    return `
      <div class="alert alert-warn" role="alert">
        <strong>These players already matched</strong>
        <span>
          ${escapeHtml(BunnyStore.playerName(draft.player1Id))} vs
          ${escapeHtml(BunnyStore.playerName(draft.player2Id))} already have
          <strong>${existing.length}</strong> match${existing.length > 1 ? "es" : ""}
          (${done} done, ${pending} pending). Creating another will be a rematch.
        </span>
      </div>`;
  }

  function matchRow(m) {
    const { escapeHtml } = BunnyUI;
    const p1 = BunnyStore.playerName(m.player1Id);
    const p2 = BunnyStore.playerName(m.player2Id);
    const done = m.status === "completed";
    const rematchCount = BunnyStore.pairCount(m.player1Id, m.player2Id);
    const isRematch = rematchCount > 1 || m.rematch;
    const fac = m.facilitator || "";
    const scoreLeft = done ? (m.winnerId === m.player1Id ? "1" : "0") : "0";
    const scoreRight = done ? (m.winnerId === m.player2Id ? "1" : "0") : "0";
    const footBits = [
      done ? "Completed" : "Pending",
      isRematch ? "Rematch" : null,
      fac ? fac : null,
    ].filter(Boolean);

    return `
      <article class="match-box ${done ? "is-done" : ""} ${isRematch ? "is-rematch" : ""}">
        <div class="match-box-score" aria-label="Score ${scoreLeft} to ${scoreRight}">
          <span>${scoreLeft}</span>
          <span class="score-colon">:</span>
          <span>${scoreRight}</span>
        </div>
        <div class="match-box-card">
          <div class="match-box-head">
            <span>Player 1</span>
            <span>Player 2</span>
          </div>
          <div class="match-box-body">
            <div class="match-side match-side-left ${done && m.winnerId === m.player1Id ? "is-winner" : ""}">
              <span class="match-avatar" aria-hidden="true"></span>
              <span class="match-name">${escapeHtml(p1)}</span>
            </div>
            <div class="match-vs-badge" aria-hidden="true">vs</div>
            <div class="match-side match-side-right ${done && m.winnerId === m.player2Id ? "is-winner" : ""}">
              <span class="match-name">${escapeHtml(p2)}</span>
              <span class="match-avatar" aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <p class="match-box-foot">${escapeHtml(footBits.join(" · "))}</p>
        <div class="match-actions">
          <button class="btn btn-mint btn-sm" type="button" data-win="${m.id}" data-player="${m.player1Id}">${escapeHtml(p1)} wins</button>
          <button class="btn btn-primary btn-sm" type="button" data-win="${m.id}" data-player="${m.player2Id}">${escapeHtml(p2)} wins</button>
          ${done ? `<button class="btn btn-ghost btn-sm" type="button" data-clear="${m.id}">Undo</button>` : ""}
          <button class="btn btn-danger btn-sm" type="button" data-delete="${m.id}">Delete</button>
        </div>
      </article>`;
  }

  function leaderboardView(snap) {
    const { escapeHtml } = BunnyUI;
    const board = BunnyStore.leaderboard();
    if (!board.length) {
      return `<div class="empty-state"><h3>No standings yet</h3><p>Add players and score matches to fill the table.</p></div>`;
    }
    return `
      <table class="leaderboard">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>W-L</th>
            <th>GP</th>
            <th>Win %</th>
          </tr>
        </thead>
        <tbody>
          ${board
            .map((p, i) => {
              const pct = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
              const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
              return `
                <tr>
                  <td class="rank ${rankClass}">${i + 1}</td>
                  <td>${escapeHtml(p.name)}</td>
                  <td>${p.wins}-${p.losses}</td>
                  <td>${p.gamesPlayed}</td>
                  <td>${pct}%</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function bind(snap) {
    const p1 = document.getElementById("match-p1");
    const p2 = document.getElementById("match-p2");
    const facInput = document.getElementById("match-facilitator");
    const adminFac = document.getElementById("admin-facilitator");
    const warningHost = document.getElementById("pair-warning");

    const refreshWarning = () => {
      draft.player1Id = p1?.value || "";
      draft.player2Id = p2?.value || "";
      if (warningHost) warningHost.innerHTML = pairWarningHtml();
    };

    p1?.addEventListener("change", refreshWarning);
    p2?.addEventListener("change", refreshWarning);

    facInput?.addEventListener("input", () => {
      draft.facilitator = facInput.value;
      if (adminFac && adminFac !== facInput) adminFac.value = facInput.value;
    });

    adminFac?.addEventListener("input", () => {
      draft.facilitator = adminFac.value;
      if (facInput) facInput.value = adminFac.value;
    });

    document.getElementById("btn-save-facilitator")?.addEventListener("click", () => {
      const value = (adminFac?.value || facInput?.value || "").trim();
      draft.facilitator = value;
      BunnyStore.setFacilitator(value);
      BunnyUI.toast(value ? "Admin facilitator saved" : "Facilitator cleared", "ok");
    });

    document.getElementById("btn-apply-facilitator-all")?.addEventListener("click", async () => {
      const value = (adminFac?.value || facInput?.value || "").trim();
      if (!snap.matches.length) {
        BunnyStore.setFacilitator(value);
        draft.facilitator = value;
        BunnyUI.toast("Facilitator saved. No matches to update yet.", "ok");
        return;
      }
      const ok = await BunnyUI.confirmDialog({
        title: "Apply facilitator to all matches?",
        message: value
          ? `Set “${value}” as facilitator on every match and as the admin default.`
          : "Clear facilitator on every match and the admin default.",
        confirmLabel: "Apply to all",
        tone: "warn",
      });
      if (!ok) return;
      draft.facilitator = value;
      const result = BunnyStore.applyFacilitatorToAll(value);
      BunnyUI.toast(`Facilitator applied to ${result.count} matches`, "ok");
    });

    document.getElementById("btn-create-match")?.addEventListener("click", async () => {
      draft.player1Id = p1?.value || "";
      draft.player2Id = p2?.value || "";
      const facilitator = currentFacilitator(snap).trim();
      if (facilitator !== (snap.facilitator || "")) {
        BunnyStore.setFacilitator(facilitator);
      }

      let result = BunnyStore.createMatch(draft.player1Id, draft.player2Id, {
        facilitator,
      });
      if (!result.ok && result.code === "DUPLICATE_PAIR") {
        const ok = await BunnyUI.confirmDialog({
          title: "Players already matched",
          message: `${result.error} Create a rematch anyway?`,
          confirmLabel: "Create rematch",
          tone: "warn",
        });
        if (!ok) return;
        result = BunnyStore.createMatch(draft.player1Id, draft.player2Id, {
          force: true,
          facilitator,
        });
      }
      if (!result.ok) {
        BunnyUI.toast(result.error, "error");
        return;
      }
      draft.player1Id = "";
      draft.player2Id = "";
      BunnyUI.toast(result.rematch ? "Rematch created" : "Match created", result.rematch ? "warn" : "ok");
    });

    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft.filter = btn.dataset.filter;
        render(BunnyStore.getSnapshot());
      });
    });

    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft.view = btn.dataset.view;
        render(BunnyStore.getSnapshot());
      });
    });

    document.getElementById("btn-generate")?.addEventListener("click", async () => {
      const facilitator = currentFacilitator(snap).trim();
      if (facilitator !== (snap.facilitator || "")) {
        BunnyStore.setFacilitator(facilitator);
      }
      if (snap.matches.length) {
        const ok = await BunnyUI.confirmDialog({
          title: "Replace all matches?",
          message:
            "This deletes the current match list and builds a fresh full round robin with the admin facilitator on every match.",
          confirmLabel: "Replace all",
          tone: "danger",
        });
        if (!ok) return;
      }
      const result = BunnyStore.generateRoundRobin({ append: false, facilitator });
      if (!result.ok) {
        BunnyUI.toast(result.error, "error");
        return;
      }
      BunnyUI.toast(`Generated ${result.count} matches`, "ok");
    });

    document.getElementById("btn-fill-missing")?.addEventListener("click", () => {
      const facilitator = currentFacilitator(snap).trim();
      if (facilitator !== (snap.facilitator || "")) {
        BunnyStore.setFacilitator(facilitator);
      }
      const result = BunnyStore.generateRoundRobin({ append: true, facilitator });
      if (!result.ok) {
        BunnyUI.toast(result.error, "error");
        return;
      }
      BunnyUI.toast(`Added ${result.count} missing pairs`, "ok");
    });

    document.getElementById("btn-reset")?.addEventListener("click", async () => {
      if (!snap.matches.length) return;
      const ok = await BunnyUI.confirmDialog({
        title: "Reset all scores?",
        message: "Pairings stay the same. All winners will be cleared.",
        confirmLabel: "Reset scores",
        tone: "danger",
      });
      if (!ok) return;
      BunnyStore.resetScores();
      BunnyUI.toast("Scores reset", "ok");
    });

    document.getElementById("match-list")?.addEventListener("click", async (e) => {
      const winBtn = e.target.closest("[data-win]");
      if (winBtn) {
        BunnyStore.setWinner(winBtn.dataset.win, winBtn.dataset.player);
        BunnyUI.toast("Result recorded", "ok");
        return;
      }
      const clearBtn = e.target.closest("[data-clear]");
      if (clearBtn) {
        BunnyStore.clearMatch(clearBtn.dataset.clear);
        BunnyUI.toast("Result cleared", "ok");
        return;
      }
      const deleteBtn = e.target.closest("[data-delete]");
      if (deleteBtn) {
        const ok = await BunnyUI.confirmDialog({
          title: "Delete this match?",
          message: "This removes the pairing from the list.",
          confirmLabel: "Delete match",
          tone: "danger",
        });
        if (!ok) return;
        BunnyStore.deleteMatch(deleteBtn.dataset.delete);
        BunnyUI.toast("Match deleted", "ok");
      }
    });
  }

  function render(snap) {
    const { escapeHtml, playerOptions } = BunnyUI;
    const canCreate = snap.players.length >= 2;
    const facValue = currentFacilitator(snap);
    const rematchCount = snap.matches.filter(
      (m) => BunnyStore.pairCount(m.player1Id, m.player2Id) > 1 || m.rematch
    ).length;

    const filtered = snap.matches.filter((m) => {
      if (draft.filter === "pending") return m.status !== "completed";
      if (draft.filter === "done") return m.status === "completed";
      if (draft.filter === "rematch") {
        return BunnyStore.pairCount(m.player1Id, m.player2Id) > 1 || m.rematch;
      }
      return true;
    });

    BunnyUI.content().innerHTML = `
      <section class="pill-row">
        <button type="button" class="pill-btn active">Round Robin</button>
        <span class="item-sub">Everyone can face everyone · rematches warned</span>
      </section>

      <section class="grid grid-4">
        <article class="stat-card pink">
          <span class="stat-label">Total Matches</span>
          <div class="stat-value">${snap.matches.length}</div>
        </article>
        <article class="stat-card mint">
          <span class="stat-label">Players</span>
          <div class="stat-value">${snap.players.length}</div>
        </article>
        <article class="stat-card sun">
          <span class="stat-label">Pending</span>
          <div class="stat-value">${snap.matchesLeft}</div>
        </article>
        <article class="stat-card rose">
          <span class="stat-label">Completed</span>
          <div class="stat-value">${snap.gamesPlayed}</div>
        </article>
      </section>


      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Create match</h3>
            <p class="hint">Manual pairing · facilitator is attached automatically</p>
          </div>
        </div>
        ${
          canCreate
            ? `
          <div class="form-grid create-match-grid">
            <label class="field">
              <span class="field-label">Player 1</span>
              <select id="match-p1" class="select">${playerOptions(snap.players, draft.player1Id, "Select player")}</select>
            </label>
            <div class="form-vs" aria-hidden="true">vs</div>
            <label class="field">
              <span class="field-label">Player 2</span>
              <select id="match-p2" class="select">${playerOptions(snap.players, draft.player2Id, "Select player")}</select>
            </label>
            <label class="field">
              <span class="field-label">Facilitator</span>
              <input id="match-facilitator" type="text" placeholder="Facilitator" value="${escapeHtml(facValue)}" />
            </label>
            <div class="form-submit">
              <button id="btn-create-match" class="btn btn-primary" type="button">Create match</button>
            </div>
          </div>
          <div id="pair-warning">${pairWarningHtml()}</div>`
            : `<div class="empty-state compact"><h3>Need more players</h3><p>Add at least two players first.</p><a class="btn btn-secondary" href="players.html">Go to Players</a></div>`
        }
      </section>

      <section class="toolbar between">
        <div class="seg" role="tablist" aria-label="View">
          <button type="button" class="seg-btn ${draft.view === "matches" ? "active" : ""}" data-view="matches">Matches</button>
          <button type="button" class="seg-btn ${draft.view === "table" ? "active" : ""}" data-view="table">League Table</button>
        </div>
        <div class="toolbar">
          <button id="btn-generate" class="btn btn-secondary" type="button">Generate round robin</button>
          <button id="btn-fill-missing" class="btn btn-mint" type="button">Add missing pairs</button>
          <button id="btn-reset" class="btn btn-ghost" type="button">Reset scores</button>
        </div>
      </section>

      ${
        draft.view === "table"
          ? `<section class="panel"><div class="panel-head"><div><h3>League table</h3><p class="hint">Sorted by wins, then win %</p></div></div>${leaderboardView(snap)}</section>`
          : `
        <section class="filter-card">
          <div class="filter-block">
            <div class="filter-label">Status filter</div>
            <div class="pill-row">
              ${["all", "pending", "done", "rematch"]
                .map(
                  (f) => `
                <button type="button" class="pill-btn ${draft.filter === f ? "active" : ""}" data-filter="${f}">
                  ${f === "all" ? "All" : f === "done" ? "Completed" : f[0].toUpperCase() + f.slice(1)}
                  ${f === "rematch" ? `(${rematchCount})` : ""}
                </button>`
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="match-day-head">
            <div class="match-day-icon" aria-hidden="true"></div>
            <div>
              <h3>Match list</h3>
              <p class="hint">${filtered.length} shown · ${snap.matches.length} total · auto-sync on</p>
            </div>
          </div>
          <div id="match-list" class="match-list">
            ${
              filtered.length
                ? filtered.map(matchRow).join("")
                : `<div class="empty-state"><h3>No matches here</h3><p>Create a match above or generate a round robin.</p></div>`
            }
          </div>
        </section>`
      }
    `;

    bind(snap);
  }

  BunnyUI.boot({ page: "matches" }, render);
})();
