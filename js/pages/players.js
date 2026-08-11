(() => {
  const draft = { name: "" };

  function render(snap) {
    const { escapeHtml } = BunnyUI;
    const list = snap.players.length
      ? snap.players
          .map(
            (p) => `
          <li class="list-item">
            <div>
              <div class="item-title">${escapeHtml(p.name)}</div>
              <div class="item-sub">${p.wins}W · ${p.losses}L · ${p.gamesPlayed} games played</div>
            </div>
            <button class="btn btn-danger btn-sm" type="button" data-remove="${p.id}">Remove</button>
          </li>`
          )
          .join("")
      : `<div class="empty-state compact"><h3>No players yet</h3><p>Add the first bunny to start the roster.</p></div>`;

    BunnyUI.content().innerHTML = `
      <section class="grid grid-4">
        <article class="stat-card pink">
          <span class="stat-label">Players</span>
          <div class="stat-value">${snap.players.length}</div>
        </article>
        <article class="stat-card mint">
          <span class="stat-label">Ready to pair</span>
          <div class="stat-value">${snap.players.length >= 2 ? "Yes" : "No"}</div>
        </article>
        <article class="stat-card sun">
          <span class="stat-label">Matches</span>
          <div class="stat-value">${snap.matches.length}</div>
        </article>
        <article class="stat-card rose">
          <span class="stat-label">Completed</span>
          <div class="stat-value">${snap.gamesPlayed}</div>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Add player</h3>
            <p class="hint">Names should be unique for tonight’s event</p>
          </div>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Player name</span>
            <input id="player-input" type="text" placeholder="e.g. Alex" value="${escapeHtml(draft.name)}" autocomplete="off" />
          </label>
          <button id="btn-add-player" class="btn btn-primary" type="button">Add player</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Interested players · ${snap.players.length}</h3>
            <p class="hint">Removing a player also removes their matches</p>
          </div>
          ${snap.players.length >= 2 ? `<a class="btn btn-secondary" href="matches.html">Create matches</a>` : ""}
        </div>
        <ul class="list" id="player-list">${list}</ul>
      </section>
    `;

    const input = document.getElementById("player-input");
    input?.addEventListener("input", () => {
      draft.name = input.value;
    });

    const add = () => {
      const result = BunnyStore.addPlayer(draft.name);
      if (!result.ok) {
        BunnyUI.toast(result.error, "error");
        return;
      }
      draft.name = "";
      BunnyUI.toast("Player added", "ok");
    };

    document.getElementById("btn-add-player")?.addEventListener("click", add);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });

    document.getElementById("player-list")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      const name = BunnyStore.playerName(btn.dataset.remove);
      const ok = await BunnyUI.confirmDialog({
        title: `Remove ${name}?`,
        message: "Their matches will be removed from the list too.",
        confirmLabel: "Remove player",
        tone: "danger",
      });
      if (!ok) return;
      BunnyStore.removePlayer(btn.dataset.remove);
      BunnyUI.toast("Player removed", "ok");
    });
  }

  BunnyUI.boot({ page: "players" }, render);
})();
