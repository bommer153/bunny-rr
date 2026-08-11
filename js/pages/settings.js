BunnyUI.boot({ page: "settings" }, (snap) => {
  const { escapeHtml } = BunnyUI;
  const binId = snap.binId || "—";
  const syncLabel = snap.syncing
    ? "Syncing…"
    : snap.dirty
      ? "Pending…"
      : snap.syncError
        ? "Failed"
        : "Synced";

  BunnyUI.content().innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><h3>Facilitator</h3></div>
      </div>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Name</span>
          <input id="facilitator-input" type="text" placeholder="Facilitator name" value="${escapeHtml(snap.facilitator || "")}" />
        </label>
        <button id="btn-set-facilitator" class="btn btn-primary" type="button">Save</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div><h3>Sync</h3></div>
        <span class="badge badge-done">${escapeHtml(syncLabel)}</span>
      </div>
      <div class="kv">
        <div class="kv-row"><span>Updated</span><strong>${snap.updatedAt ? new Date(snap.updatedAt).toLocaleString() : "—"}</strong></div>
        <div class="kv-row"><span>Bin</span><code style="font-size:0.68rem;word-break:break-all">${escapeHtml(binId)}</code></div>
        ${snap.syncError ? `<div class="kv-row"><span>Error</span><strong>${escapeHtml(snap.syncError)}</strong></div>` : ""}
      </div>
      <div class="toolbar" style="margin-top:0.65rem">
        <button id="btn-settings-refresh" class="btn btn-ghost" type="button">Refresh</button>
        ${snap.syncError || snap.dirty ? `<button id="btn-settings-retry" class="btn btn-primary" type="button">Retry</button>` : ""}
      </div>
    </section>
  `;

  document.getElementById("btn-set-facilitator")?.addEventListener("click", () => {
    const value = document.getElementById("facilitator-input")?.value || "";
    BunnyStore.setFacilitator(value);
    BunnyUI.toast(value.trim() ? "Facilitator saved" : "Cleared", "ok");
  });

  document.getElementById("btn-settings-retry")?.addEventListener("click", async () => {
    try {
      await BunnyStore.save();
      BunnyUI.toast("Synced", "ok");
    } catch (err) {
      BunnyUI.toast(err.message, "error");
    }
  });

  document.getElementById("btn-settings-refresh")?.addEventListener("click", async () => {
    const current = BunnyStore.getSnapshot();
    if (current.dirty || current.syncing) {
      const ok = await BunnyUI.confirmDialog({
        title: "Refresh?",
        message: "Local changes may still be syncing.",
        confirmLabel: "Refresh",
        tone: "danger",
      });
      if (!ok) return;
    }
    try {
      await BunnyStore.load();
      BunnyUI.toast("Refreshed", "ok");
    } catch (err) {
      BunnyUI.toast(err.message, "error");
    }
  });
});
