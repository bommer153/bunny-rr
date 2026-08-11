BunnyUI.boot({ page: "dashboard" }, (snap) => {
  const { escapeHtml } = BunnyUI;
  const top = BunnyStore.leaderboard()[0];

  let nextStep;
  if (snap.players.length < 2) {
    nextStep = { title: "Add players", href: "players.html", cta: "Players" };
  } else if (!snap.matches.length) {
    nextStep = { title: "Create matches", href: "matches.html", cta: "Matches" };
  } else if (snap.matchesLeft > 0) {
    nextStep = {
      title: `${snap.matchesLeft} left to score`,
      href: "matches.html",
      cta: "Score",
    };
  } else {
    nextStep = { title: "View standings", href: "leaderboard.html", cta: "Board" };
  }

  BunnyUI.content().innerHTML = `
    <section class="grid grid-4">
      <article class="stat-card pink">
        <span class="stat-label">Players</span>
        <div class="stat-value">${snap.players.length}</div>
      </article>
      <article class="stat-card mint">
        <span class="stat-label">Matches</span>
        <div class="stat-value">${snap.matches.length}</div>
      </article>
      <article class="stat-card sun">
        <span class="stat-label">Pending</span>
        <div class="stat-value">${snap.matchesLeft}</div>
      </article>
      <article class="stat-card rose">
        <span class="stat-label">Done</span>
        <div class="stat-value">${snap.gamesPlayed}</div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head" style="margin-bottom:0;align-items:center">
        <strong style="font-family:var(--font-display);color:var(--pink-deep)">${escapeHtml(nextStep.title)}</strong>
        <a class="btn btn-primary btn-sm" href="${nextStep.href}">${escapeHtml(nextStep.cta)}</a>
      </div>
    </section>

    <section class="quick-grid">
      <a class="quick-card" href="players.html"><strong>Players</strong></a>
      <a class="quick-card" href="matches.html"><strong>Matches</strong></a>
      <a class="quick-card" href="leaderboard.html"><strong>Board</strong></a>
      <a class="quick-card" href="settings.html"><strong>Settings</strong></a>
    </section>

    <section class="panel">
      <div class="kv">
        <div class="kv-row"><span>Leader</span><strong>${top ? `${escapeHtml(top.name)} · ${top.wins}-${top.losses}` : "—"}</strong></div>
        <div class="kv-row"><span>Sync</span><strong>${snap.syncing ? "Syncing…" : snap.dirty ? "Pending…" : "Synced"}</strong></div>
      </div>
    </section>
  `;
});
