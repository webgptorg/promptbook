/**
 * HTML source for the coder server kanban UI.
 *
 * The canonical source lives in `apps/coder-server/index.html`.
 * Keep both files in sync when updating the frontend.
 *
 * @private internal constant of `ptbk coder server`
 */
export const CODER_SERVER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ptbk Coder Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f6f7f9;
      color: #1f2933;
      min-height: 100vh;
    }

    header {
      background: #22313f;
      color: white;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 2px 10px rgba(15,23,42,0.22);
    }
    header h1 { font-size: 17px; font-weight: 700; flex-shrink: 0; letter-spacing: 0; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .status-RUNNING { background: #0b875b; color: white; }
    .status-PAUSING { background: #d97904; color: white; }
    .status-PAUSED { background: #b42318; color: white; }

    #pause-label {
      font-size: 12px;
      color: rgba(255,255,255,0.75);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn {
      padding: 6px 12px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      transition: background 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }
    .btn:disabled { opacity: 0.55; cursor: default; }
    .btn-pause { background: #ffd166; color: #1f2933; }
    .btn-resume { background: #0b875b; color: white; }
    .btn-save { background: #2563eb; color: white; }
    .btn-cancel { background: #edf0f4; color: #1f2933; }

    .run-strip {
      background: white;
      border-bottom: 1px solid #d8dee8;
      padding: 12px 18px;
      display: grid;
      grid-template-columns: minmax(220px, 1.2fr) minmax(240px, 1fr) minmax(260px, 1.4fr);
      gap: 14px;
      align-items: center;
    }
    .run-title {
      font-size: 14px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .run-subtitle,
    .run-current,
    .run-output {
      color: #64748b;
      font-size: 12px;
      line-height: 1.45;
      overflow: hidden;
    }
    .run-current,
    .run-output {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .progress-shell {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .progress-track {
      height: 10px;
      background: #e4e9f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-fill {
      display: block;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #0b875b, #2563eb);
      transition: width 0.2s;
    }
    .progress-label {
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      min-width: 72px;
      text-align: right;
    }

    .board {
      display: flex;
      gap: 14px;
      padding: 16px;
      overflow-x: auto;
      min-height: calc(100vh - 119px);
      align-items: flex-start;
    }

    .column {
      background: #e9edf3;
      border-top: 4px solid #94a3b8;
      border-radius: 6px;
      padding: 10px;
      min-width: 250px;
      width: 270px;
      flex-shrink: 0;
    }
    .column-backlog { border-top-color: #64748b; }
    .column-low-priority { border-top-color: #d97904; }
    .column-todo { border-top-color: #2563eb; }
    .column-in-progress { border-top-color: #7c3aed; }
    .column-done { border-top-color: #0b875b; }
    .column-errors { border-top-color: #b42318; }
    .column-finished { border-top-color: #0891b2; }

    .column-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .column-count {
      background: rgba(255,255,255,0.72);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      color: #475569;
    }
    .column-cards { min-height: 40px; }

    .card {
      background: white;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(15,23,42,0.12);
      cursor: pointer;
      border-left: 3px solid #94a3b8;
    }
    .card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.16); }
    .card-backlog { border-left-color: #64748b; }
    .card-low-priority { border-left-color: #d97904; }
    .card-todo { border-left-color: #2563eb; }
    .card-in-progress { border-left-color: #7c3aed; }
    .card-done { border-left-color: #0b875b; }
    .card-errors { border-left-color: #b42318; }
    .card-finished { border-left-color: #0891b2; }

    .card-file {
      font-size: 10px;
      color: #7b8794;
      margin-bottom: 6px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-summary {
      font-size: 13px;
      line-height: 1.45;
      color: #1f2933;
      word-break: break-word;
      white-space: pre-wrap;
      max-height: 76px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .card-tag {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 800;
      line-height: 1.35;
    }
    .tag-not-ready { background: #e2e8f0; color: #475569; }
    .tag-unwritten { background: #fff4cc; color: #8a5a00; }
    .tag-implementing { background: #ede9fe; color: #5b21b6; }
    .tag-verifying { background: #fae8ff; color: #86198f; }
    .tag-priority { background: #ffedd5; color: #9a3412; }

    .empty-column {
      color: #94a3b8;
      font-size: 12px;
      padding: 10px 4px;
      text-align: center;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.58);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 56px 16px 16px;
      z-index: 100;
    }
    .modal-overlay.hidden { display: none; }

    .modal {
      background: white;
      border-radius: 8px;
      width: 100%;
      max-width: 720px;
      padding: 18px;
      box-shadow: 0 14px 40px rgba(15,23,42,0.28);
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 12px;
    }
    .modal-meta { flex: 1; min-width: 0; }
    .modal-file {
      font-size: 11px;
      color: #7b8794;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .modal-section-label { font-size: 14px; font-weight: 700; color: #1f2933; }
    .modal-status {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .status-backlog { background: #e2e8f0; color: #475569; }
    .status-low-priority { background: #ffedd5; color: #9a3412; }
    .status-todo { background: #dbeafe; color: #1d4ed8; }
    .status-in-progress { background: #ede9fe; color: #5b21b6; }
    .status-done { background: #dcfce7; color: #166534; }
    .status-errors { background: #fee2e2; color: #991b1b; }
    .status-finished { background: #cffafe; color: #155e75; }
    .modal-close {
      background: transparent;
      border: 0;
      color: #64748b;
      cursor: pointer;
      font-size: 20px;
      padding: 0 4px;
      line-height: 1;
    }
    .modal-close:hover { color: #1f2933; }

    textarea {
      width: 100%;
      min-height: 300px;
      font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
      font-size: 13px;
      border: 2px solid #d8dee8;
      border-radius: 4px;
      padding: 10px 12px;
      resize: vertical;
      line-height: 1.6;
      color: #1f2933;
    }
    textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      justify-content: flex-end;
    }

    .error-banner {
      background: #fee2e2;
      border-bottom: 2px solid #b42318;
      color: #991b1b;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
    }
    .error-banner.hidden { display: none; }

    @media (max-width: 860px) {
      header { flex-wrap: wrap; }
      #pause-label { order: 4; flex-basis: 100%; }
      .run-strip { grid-template-columns: 1fr; }
      .board { min-height: calc(100vh - 212px); }
    }
  </style>
</head>
<body>
  <div id="error-banner" class="error-banner hidden"></div>

  <header>
    <h1>Ptbk Coder Server</h1>
    <span id="status-badge" class="status-badge status-RUNNING">RUNNING</span>
    <span id="pause-label"></span>
    <button id="toggle-btn" class="btn btn-pause">Pause</button>
  </header>

  <section class="run-strip">
    <div>
      <div class="run-title" id="run-title">Initializing...</div>
      <div class="run-subtitle" id="run-subtitle">Loading runner state</div>
    </div>
    <div class="progress-shell">
      <div class="progress-track"><span class="progress-fill" id="progress-fill"></span></div>
      <div class="progress-label" id="progress-label">0%</div>
    </div>
    <div>
      <div class="run-current" id="run-current">No active prompt</div>
      <div class="run-output" id="run-output"></div>
    </div>
  </section>

  <div class="board" id="board"></div>

  <div class="modal-overlay hidden" id="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-meta">
          <div class="modal-file" id="modal-file"></div>
          <div class="modal-section-label" id="modal-section-label"></div>
        </div>
        <span class="modal-status" id="modal-status-badge"></span>
        <button class="modal-close" id="modal-close" title="Close">&times;</button>
      </div>

      <textarea id="modal-content" placeholder="Prompt content"></textarea>

      <div class="modal-actions">
        <button class="btn btn-cancel" id="cancel-button">Cancel</button>
        <button class="btn btn-save" id="save-button">Save</button>
      </div>
    </div>
  </div>

  <script>
    "use strict";

    const BOARD_COLUMNS = [
      { id: "backlog", title: "Backlog" },
      { id: "low-priority", title: "Outside priority" },
      { id: "todo", title: "To do" },
      { id: "in-progress", title: "In progress" },
      { id: "done", title: "Done" },
      { id: "errors", title: "Errors" },
      { id: "finished", title: "Finished" },
    ];

    let modalState = null;
    let lastPauseState = "RUNNING";

    function getColumnTitle(columnId) {
      const column = BOARD_COLUMNS.find((columnCandidate) => columnCandidate.id === columnId);
      return column ? column.title : columnId;
    }

    function showError(message) {
      const banner = document.getElementById("error-banner");
      banner.textContent = message;
      banner.classList.remove("hidden");
      clearTimeout(banner.timer);
      banner.timer = setTimeout(() => banner.classList.add("hidden"), 6000);
    }

    function escapeHtml(value) {
      const element = document.createElement("div");
      element.textContent = String(value);
      return element.innerHTML;
    }

    function renderBoardSkeleton() {
      const board = document.getElementById("board");
      board.innerHTML = "";

      for (const column of BOARD_COLUMNS) {
        const columnElement = document.createElement("section");
        columnElement.className = "column column-" + column.id;
        columnElement.innerHTML =
          '<div class="column-header">' +
            '<span>' + escapeHtml(column.title) + '</span>' +
            '<span class="column-count" id="count-' + column.id + '">0</span>' +
          '</div>' +
          '<div class="column-cards" id="cards-' + column.id + '">' +
            '<div class="empty-column">Loading</div>' +
          '</div>';
        board.appendChild(columnElement);
      }
    }

    async function fetchStatus() {
      try {
        const response = await fetch("/api/status");
        if (!response.ok) {
          showError("Status API error: " + response.status);
          return;
        }

        const status = await response.json();
        renderPauseState(status);
        renderRunState(status.runState);
      } catch (error) {
        showError("Could not reach coder server: " + error.message);
      }
    }

    function renderPauseState(status) {
      lastPauseState = status.pauseState;

      const badge = document.getElementById("status-badge");
      badge.textContent = status.pauseState;
      badge.className = "status-badge status-" + status.pauseState;

      const toggleButton = document.getElementById("toggle-btn");
      const pauseLabel = document.getElementById("pause-label");

      if (status.pauseState === "RUNNING") {
        toggleButton.textContent = "Pause";
        toggleButton.className = "btn btn-pause";
        pauseLabel.textContent = "";
        return;
      }

      toggleButton.textContent = "Resume";
      toggleButton.className = "btn btn-resume";
      pauseLabel.textContent =
        (status.pauseState === "PAUSING" ? "Pausing before: " : "Paused before: ") +
        (status.pauseTargetLabel || "next checkpoint");
    }

    function renderRunState(runState) {
      if (!runState) {
        document.getElementById("run-title").textContent = "Waiting for runner state";
        document.getElementById("run-subtitle").textContent = "";
        return;
      }

      const progress = runState.progress || {};
      const percentage = Number(progress.percentage || 0);
      const runnerParts = [runState.config.agentName, runState.config.modelName, runState.config.thinkingLevel]
        .filter(Boolean);

      document.getElementById("run-title").textContent = runState.statusMessage || runState.phase;
      document.getElementById("run-subtitle").textContent = runnerParts.join(" / ");
      document.getElementById("progress-fill").style.width = Math.max(0, Math.min(100, percentage)) + "%";
      document.getElementById("progress-label").textContent =
        percentage + "% " + (progress.sessionDone || 0) + "/" + (progress.sessionTotal || 0);
      document.getElementById("run-current").textContent = runState.currentPromptLabel
        ? runState.currentPromptLabel + " - attempt " + runState.currentAttempt + "/" + runState.maxAttempts
        : "No active prompt";

      renderRunOutput(runState);
    }

    function renderRunOutput(runState) {
      const statusLines = (runState.agentStatusTableRows || []).map((row) =>
        row.status + " - " + row.agentName + (row.url ? " - " + row.url : "")
      );
      const outputLines = [
        ...(runState.agentStatusLines || []),
        ...statusLines,
        ...(runState.agentOutputLines || []),
        ...(runState.errors || []).map((errorLine) => "Error: " + errorLine),
      ].slice(-3);

      document.getElementById("run-output").textContent = outputLines.join("\\n");
    }

    async function fetchPrompts() {
      try {
        const response = await fetch("/api/prompts");
        if (!response.ok) {
          showError("Prompts API error: " + response.status);
          return;
        }

        renderBoard(await response.json());
      } catch (error) {
        showError("Could not load prompts: " + error.message);
      }
    }

    function renderBoard(promptFiles) {
      const columns = Object.fromEntries(BOARD_COLUMNS.map((column) => [column.id, []]));

      for (const file of promptFiles) {
        for (const section of file.sections) {
          if (columns[section.column]) {
            columns[section.column].push({ file, section });
          }
        }
      }

      for (const column of BOARD_COLUMNS) {
        renderColumn(column.id, columns[column.id]);
      }
    }

    function renderColumn(columnId, cards) {
      const container = document.getElementById("cards-" + columnId);
      const countElement = document.getElementById("count-" + columnId);

      countElement.textContent = cards.length;
      container.innerHTML = "";

      if (cards.length === 0) {
        container.innerHTML = '<div class="empty-column">Empty</div>';
        return;
      }

      for (const cardData of cards) {
        container.appendChild(createPromptCard(cardData.file, cardData.section));
      }
    }

    function createPromptCard(file, section) {
      const card = document.createElement("article");
      card.className = "card card-" + section.column;
      card.innerHTML =
        '<div class="card-file">' + escapeHtml(file.relativeFilePath || file.fileName) + " #" + (section.index + 1) + '</div>' +
        '<div class="card-summary">' + escapeHtml(section.summary) + '</div>' +
        renderTags(section);
      card.onclick = () => openModal(file, section);
      return card;
    }

    function renderTags(section) {
      const tags = [...(section.tags || [])];
      if (section.priority > 0) {
        tags.push({ id: "priority", label: "P" + section.priority });
      }

      if (tags.length === 0) {
        return "";
      }

      return '<div class="card-tags">' + tags.map((tag) =>
        '<span class="card-tag tag-' + escapeHtml(tag.id) + '">' + escapeHtml(tag.label) + '</span>'
      ).join("") + '</div>';
    }

    function openModal(file, section) {
      modalState = { filePath: file.filePath, sectionIndex: section.index };

      document.getElementById("modal-file").textContent = file.relativeFilePath || file.fileName;
      document.getElementById("modal-section-label").textContent = "Section " + (section.index + 1);

      const statusBadge = document.getElementById("modal-status-badge");
      statusBadge.textContent = getColumnTitle(section.column);
      statusBadge.className = "modal-status status-" + section.column;

      document.getElementById("modal-content").value = section.content;
      document.getElementById("modal-overlay").classList.remove("hidden");
      setTimeout(() => document.getElementById("modal-content").focus(), 50);
    }

    function closeModal() {
      document.getElementById("modal-overlay").classList.add("hidden");
      modalState = null;
    }

    async function saveModal() {
      if (!modalState) {
        return;
      }

      const content = document.getElementById("modal-content").value;
      const saveButton = document.getElementById("save-button");
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";

      try {
        const response = await fetch("/api/prompts/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: modalState.filePath,
            sectionIndex: modalState.sectionIndex,
            content,
          }),
        });

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        closeModal();
        await fetchPrompts();
      } catch (error) {
        showError("Save failed: " + error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save";
      }
    }

    document.getElementById("toggle-btn").onclick = async () => {
      try {
        const endpoint = lastPauseState === "RUNNING" ? "/api/pause" : "/api/resume";
        await fetch(endpoint, { method: "POST" });
        await fetchStatus();
      } catch (error) {
        showError("Toggle failed: " + error.message);
      }
    };

    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("cancel-button").onclick = closeModal;
    document.getElementById("save-button").onclick = saveModal;

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        saveModal();
      }
    });

    document.getElementById("modal-overlay").addEventListener("click", (event) => {
      if (event.target === document.getElementById("modal-overlay")) {
        closeModal();
      }
    });

    renderBoardSkeleton();
    fetchStatus();
    fetchPrompts();
    setInterval(fetchStatus, 2000);
    setInterval(fetchPrompts, 5000);
  </script>
</body>
</html>
`;

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/coderServerHtml.ts) should never be published outside of `@promptbook/cli`
// Note: Keep in sync with apps/coder-server/index.html
