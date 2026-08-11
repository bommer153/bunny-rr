BunnyUI.boot({ page: "leaderboard" }, (snap) => {
  const { escapeHtml } = BunnyUI;
  const board = BunnyStore.leaderboard();
  const top3 = board.slice(0, 3);

  const podium =
    top3.length >= 1
      ? `
    <div class="podium">
      ${[0, 1, 2]
        .map((idx) => {
          const p = top3[idx];
          if (!p) return "";
          const place = idx === 0 ? "first" : idx === 1 ? "second" : "third";
          const medal = idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd";
          return `
            <div class="podium-card ${place}">
              <div class="podium-place">${medal}</div>
              <strong>${escapeHtml(p.name)}</strong>
              <div class="item-sub">${p.wins}W · ${p.losses}L</div>
            </div>`;
        })
        .join("")}
    </div>`
      : `<p class="empty">No standings yet.</p>`;

  const cards = board.length
    ? board
        .map((p, i) => {
          const pct = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
          const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
          return `
            <article class="standing-card">
              <div class="standing-rank rank ${rankClass}">${i + 1}</div>
              <div class="standing-main">
                <div class="item-title">${escapeHtml(p.name)}</div>
                <div class="item-sub">${p.wins}-${p.losses} · ${p.gamesPlayed} gp · ${pct}%</div>
              </div>
              <div class="standing-wins">${p.wins}W</div>
            </article>`;
        })
        .join("")
    : `<p class="empty">No players yet.</p>`;

  const rows = board.length
    ? board
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
        .join("")
    : `<tr><td colspan="5" class="empty">No players yet.</td></tr>`;

  BunnyUI.content().innerHTML = `
    <section class="grid grid-4">
      <article class="stat-card pink">
        <span class="stat-label">Players</span>
        <div class="stat-value">${snap.players.length}</div>
      </article>
      <article class="stat-card mint">
        <span class="stat-label">Played</span>
        <div class="stat-value">${snap.gamesPlayed}</div>
      </article>
      <article class="stat-card sun">
        <span class="stat-label">Pending</span>
        <div class="stat-value">${snap.matchesLeft}</div>
      </article>
      <article class="stat-card rose">
        <span class="stat-label">Top W</span>
        <div class="stat-value">${board[0]?.wins ?? 0}</div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h3>Podium</h3></div></div>
      ${podium}
    </section>

    <section class="panel">
      <div class="panel-head"><div><h3>Standings</h3></div></div>
      <div class="standing-cards desktop-hide">${cards}</div>
      <div class="leaderboard-wrap mobile-hide">
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
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
});
