(() => {
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function toast(message, tone = "ok") {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    const item = document.createElement("div");
    item.className = `toast toast-${tone}`;
    item.setAttribute("role", "status");
    item.textContent = message;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add("show"));
    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 280);
    }, 2800);
  }

  function confirmDialog({
    title = "Are you sure?",
    message = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "warn",
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-icon modal-icon-${tone}" aria-hidden="true"></div>
          <h2 id="modal-title">${escapeHtml(title)}</h2>
          <p class="modal-message">${escapeHtml(message)}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-cancel>${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn ${tone === "danger" ? "btn-danger-solid" : "btn-primary"}" data-confirm>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("show"));

      const finish = (value) => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 180);
        resolve(value);
      };

      overlay.querySelector("[data-cancel]")?.addEventListener("click", () => finish(false));
      overlay.querySelector("[data-confirm]")?.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) finish(false);
      });
      const onKey = (e) => {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", onKey);
          finish(false);
        }
      };
      document.addEventListener("keydown", onKey);
      overlay.querySelector("[data-confirm]")?.focus();
    });
  }

  const NAV = [
    { href: "index.html", id: "dashboard", label: "Home", short: "Home", icon: "home" },
    { href: "players.html", id: "players", label: "Players", short: "Players", icon: "players" },
    { href: "matches.html", id: "matches", label: "Matches", short: "Matches", icon: "matches" },
    { href: "leaderboard.html", id: "leaderboard", label: "Leaderboard", short: "Board", icon: "board" },
  ];

  const TABS = [
    { href: "index.html", id: "dashboard", label: "Overview" },
    { href: "players.html", id: "players", label: "Players" },
    { href: "matches.html", id: "matches", label: "Matches" },
    { href: "leaderboard.html", id: "leaderboard", label: "Board" },
  ];

  function navItems(active) {
    return NAV.map(
      (item) => `
        <a class="nav-link ${active === item.id ? "active" : ""}" href="${item.href}" ${active === item.id ? 'aria-current="page"' : ""}>
          <span class="nav-icon nav-icon-${item.icon}" aria-hidden="true"></span>
          <span>${item.label}</span>
        </a>`
    ).join("");
  }

  function pageTabs(active) {
    return TABS.map(
      (tab) => `
        <a class="page-tab ${active === tab.id ? "active" : ""}" href="${tab.href}">${tab.label}</a>`
    ).join("");
  }

  function playerOptions(players, selectedId, placeholder) {
    const opts = players
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === selectedId ? "selected" : ""}>${escapeHtml(p.name)}</option>`
      )
      .join("");
    return `<option value="">${escapeHtml(placeholder)}</option>${opts}`;
  }

  function initials(name) {
    const parts = String(name || "B").trim().split(/\s+/);
    return ((parts[0]?.[0] || "B") + (parts[1]?.[0] || "")).toUpperCase();
  }

  function eventStatus(snap) {
    if (!snap.players.length) return { label: "Setup", done: false };
    if (!snap.matches.length) return { label: "Ready", done: false };
    if (snap.matchesLeft === 0 && snap.matches.length) return { label: "Completed", done: true };
    return { label: "In Progress", done: false };
  }

  function mountShell({ page }) {
    const root = document.getElementById("app");
    if (!root) return;

    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" aria-label="Main navigation">
          <div class="sidebar-brand">
            <div class="bunny-badge" aria-hidden="true"><span class="bunny-face">bunny</span></div>
            <div>
              <div class="sidebar-title">Bunny Anniv</div>
              <div class="sidebar-sub">Round Robin Organizer</div>
            </div>
          </div>
          <nav class="side-nav">${navItems(page)}</nav>
          <div class="sidebar-foot">
            <p class="sidebar-tip">Changes auto-sync to JSONBin when you edit.</p>
            <button id="btn-refresh" class="btn btn-ghost btn-block" type="button">Refresh from cloud</button>
          </div>
        </aside>

        <div class="main-wrap">
          <header class="topbar">
            <div class="topbar-copy">
              <div class="title-row">
                <h1>Bunny Anniv Round Robin</h1>
                <span id="event-status" class="status-badge">In Progress</span>
              </div>
              <p class="page-sub" id="event-subtitle">Tournament details</p>
            </div>
            <div class="topbar-meta">
              <div id="sync-chip" class="chip" role="status">Syncing…</div>
              <div class="user-chip" title="Facilitator">
                <span class="user-avatar" id="fac-avatar">B</span>
                <strong id="fac-name">Facilitator</strong>
              </div>
            </div>
          </header>

          <nav class="page-tabs" aria-label="Section tabs">${pageTabs(page)}</nav>
          <main id="page-content" class="page-content"></main>
        </div>
      </div>

      <nav class="bottom-nav" aria-label="Mobile navigation">
        ${NAV.map(
          (item) => `
          <a class="bottom-link ${page === item.id ? "active" : ""}" href="${item.href}">
            <span class="nav-icon nav-icon-${item.icon}" aria-hidden="true"></span>
            <span>${item.short || item.label}</span>
          </a>`
        ).join("")}
      </nav>
    `;

    document.getElementById("btn-refresh")?.addEventListener("click", async () => {
      const snap = window.BunnyStore.getSnapshot();
      if (snap.dirty || snap.syncing) {
        const ok = await confirmDialog({
          title: "Refresh from cloud?",
          message: "Local changes may still be syncing. Refreshing can overwrite them.",
          confirmLabel: "Refresh anyway",
          tone: "danger",
        });
        if (!ok) return;
      }
      try {
        updateSyncChip({ loading: true });
        await window.BunnyStore.load();
        toast("Refreshed from cloud", "ok");
      } catch (err) {
        toast(err.message, "error");
        updateSyncChip({ error: true });
      }
    });
  }

  function updateHeaderMeta(snap) {
    const status = eventStatus(snap);
    const badge = document.getElementById("event-status");
    if (badge) {
      badge.textContent = status.label;
      badge.classList.toggle("done", status.done);
    }
    const sub = document.getElementById("event-subtitle");
    if (sub) {
      sub.textContent = snap.facilitator
        ? `Hosted by ${snap.facilitator}`
        : "Tournament details";
    }
    const facName = document.getElementById("fac-name");
    const facAvatar = document.getElementById("fac-avatar");
    const name = snap.facilitator || "Facilitator";
    if (facName) facName.textContent = name;
    if (facAvatar) facAvatar.textContent = initials(name);
  }

  function updateSyncChip(snap) {
    const chip = document.getElementById("sync-chip");
    if (!chip) return;
    if (snap?.saving || snap?.syncing) {
      chip.textContent = "Auto-syncing…";
      chip.dataset.tone = "warn";
      return;
    }
    if (snap?.loading) {
      chip.textContent = "Loading…";
      chip.dataset.tone = "warn";
      return;
    }
    if (snap?.error || snap?.syncError) {
      chip.textContent = snap.syncError ? "Sync failed" : "Sync error";
      chip.dataset.tone = "error";
      chip.title = snap.syncError || "";
      return;
    }
    if (snap?.dirty) {
      chip.textContent = "Pending sync…";
      chip.dataset.tone = "warn";
      return;
    }
    const when = snap?.updatedAt
      ? new Date(snap.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "ready";
    chip.textContent = `Auto-synced · ${when}`;
    chip.dataset.tone = "ok";
    chip.title = "";
  }

  function content() {
    return document.getElementById("page-content");
  }

  async function boot(pageConfig, render) {
    mountShell(pageConfig);
    window.BunnyStore.subscribe((snap) => {
      updateSyncChip(snap);
      updateHeaderMeta(snap);
      render(snap);
    });
    try {
      updateSyncChip({ loading: true });
      await window.BunnyStore.load();
    } catch (err) {
      toast(err.message, "error");
      updateSyncChip({ error: true });
      const snap = window.BunnyStore.getSnapshot();
      updateHeaderMeta(snap);
      render(snap);
    }
  }

  window.BunnyUI = {
    escapeHtml,
    toast,
    confirmDialog,
    playerOptions,
    mountShell,
    updateSyncChip,
    content,
    boot,
  };
})();
