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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f5f7;
      color: #172b4d;
      min-height: 100vh;
    }

    header {
      background: #0052cc;
      color: white;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    header h1 { font-size: 17px; font-weight: 700; flex-shrink: 0; }

    .status-badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .status-RUNNING  { background: #00875a; color: white; }
    .status-PAUSING  { background: #ff8b00; color: white; }
    .status-PAUSED   { background: #bf2600; color: white; }

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
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.15s;
      flex-shrink: 0;
    }
    .btn:hover { opacity: 0.85; }
    .btn-pause  { background: #ffc400; color: #172b4d; }
    .btn-resume { background: #00875a; color: white; }

    .board {
      display: flex;
      gap: 14px;
      padding: 16px;
      overflow-x: auto;
      min-height: calc(100vh - 52px);
      align-items: flex-start;
    }

    .column {
      background: #ebecf0;
      border-radius: 8px;
      padding: 10px;
      min-width: 250px;
      width: 270px;
      flex-shrink: 0;
    }

    .column-header {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #5e6c84;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .column-count {
      background: #dfe1e6;
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 11px;
      color: #5e6c84;
    }

    .column-cards { min-height: 40px; }

    .card {
      background: white;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: box-shadow 0.15s, transform 0.1s;
      border-left: 3px solid transparent;
    }
    .card:hover {
      box-shadow: 0 4px 10px rgba(0,0,0,0.14);
      transform: translateY(-1px);
    }
    .card-todo      { border-left-color: #0052cc; }
    .card-not-ready { border-left-color: #8993a4; }
    .card-done      { border-left-color: #00875a; }
    .card-failed    { border-left-color: #bf2600; }

    .card-file {
      font-size: 10px;
      color: #8993a4;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .card-summary {
      font-size: 13px;
      line-height: 1.5;
      color: #172b4d;
      word-break: break-word;
      white-space: pre-wrap;
      max-height: 78px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    .card-priority {
      margin-top: 6px;
      color: #ff8b00;
      font-size: 11px;
      font-weight: 700;
    }

    .card-edit-hint {
      font-size: 10px;
      color: #c1c7d0;
      margin-top: 6px;
      display: none;
    }
    .card:hover .card-edit-hint { display: block; }

    .empty-column {
      color: #b3bac5;
      font-size: 12px;
      padding: 10px 4px;
      text-align: center;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(9,30,66,0.54);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 60px 16px 16px;
      z-index: 100;
      animation: fadeIn 0.1s ease;
    }
    .modal-overlay.hidden { display: none; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal {
      background: white;
      border-radius: 8px;
      width: 100%;
      max-width: 620px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      animation: slideIn 0.15s ease;
    }
    @keyframes slideIn { from { transform: translateY(-8px); opacity: 0; } to { transform: none; opacity: 1; } }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 12px;
    }

    .modal-meta { flex: 1; min-width: 0; }
    .modal-file { font-size: 11px; color: #8993a4; margin-bottom: 4px; }
    .modal-section-label { font-size: 13px; font-weight: 600; color: #172b4d; }

    .modal-status {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      flex-shrink: 0;
    }
    .status-todo      { background: #deebff; color: #0052cc; }
    .status-not-ready { background: #f4f5f7; color: #5e6c84; }
    .status-done      { background: #e3fcef; color: #006644; }
    .status-failed    { background: #ffebe6; color: #bf2600; }

    .modal-close {
      background: none;
      border: none;
      color: #8993a4;
      cursor: pointer;
      font-size: 18px;
      padding: 0 4px;
      line-height: 1;
      flex-shrink: 0;
    }
    .modal-close:hover { color: #172b4d; }

    textarea {
      width: 100%;
      min-height: 220px;
      font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      border: 2px solid #dfe1e6;
      border-radius: 4px;
      padding: 10px 12px;
      resize: vertical;
      line-height: 1.65;
      color: #172b4d;
      transition: border-color 0.15s;
    }
    textarea:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 3px rgba(0,82,204,0.12);
    }

    .modal-hint {
      font-size: 11px;
      color: #8993a4;
      margin-top: 6px;
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      justify-content: flex-end;
    }

    .btn-save   { background: #0052cc; color: white; }
    .btn-cancel { background: #f4f5f7; color: #172b4d; }
    .btn-cancel:hover { background: #ebecf0; opacity: 1; }

    .error-banner {
      background: #ffebe6;
      border-bottom: 2px solid #bf2600;
      color: #bf2600;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 500;
    }
    .error-banner.hidden { display: none; }
  </style>
</head>
<body>

  <div id="error-banner" class="error-banner hidden"></div>

  <header>
    <h1>&#128295; Ptbk Coder Server</h1>
    <span id="status-badge" class="status-badge status-RUNNING">RUNNING</span>
    <span id="pause-label"></span>
    <button id="toggle-btn" class="btn btn-pause">&#9646;&#9646; Pause</button>
  </header>

  <div class="board">
    <div class="column">
      <div class="column-header">
        To Do
        <span class="column-count" id="count-todo">0</span>
      </div>
      <div class="column-cards" id="cards-todo">
        <div class="empty-column">Loading&hellip;</div>
      </div>
    </div>

    <div class="column">
      <div class="column-header">
        Not Ready
        <span class="column-count" id="count-not-ready">0</span>
      </div>
      <div class="column-cards" id="cards-not-ready"></div>
    </div>

    <div class="column">
      <div class="column-header">
        Done
        <span class="column-count" id="count-done">0</span>
      </div>
      <div class="column-cards" id="cards-done"></div>
    </div>

    <div class="column">
      <div class="column-header">
        Failed
        <span class="column-count" id="count-failed">0</span>
      </div>
      <div class="column-cards" id="cards-failed"></div>
    </div>
  </div>

  <div class="modal-overlay hidden" id="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-meta">
          <div class="modal-file" id="modal-file"></div>
          <div class="modal-section-label" id="modal-section-label"></div>
        </div>
        <span class="modal-status" id="modal-status-badge"></span>
        <button class="modal-close" onclick="closeModal()" title="Close (Esc)">&#x2715;</button>
      </div>

      <textarea id="modal-content" placeholder="Prompt content&hellip;"></textarea>
      <div class="modal-hint">Tip: press Ctrl+Enter to save, Esc to cancel.</div>

      <div class="modal-actions">
        <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="btn btn-save" onclick="saveModal()">Save</button>
      </div>
    </div>
  </div>

  <script>
    'use strict';

    let modalState = null;
    let lastPauseState = 'RUNNING';

    function showError(msg) {
      const banner = document.getElementById('error-banner');
      banner.textContent = '\\u26a0 ' + msg;
      banner.classList.remove('hidden');
      clearTimeout(banner._timer);
      banner._timer = setTimeout(() => banner.classList.add('hidden'), 6000);
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = String(str);
      return d.innerHTML;
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) { showError('Status API error: ' + res.status); return; }
        const data = await res.json();

        lastPauseState = data.pauseState;

        const badge = document.getElementById('status-badge');
        badge.textContent = data.pauseState;
        badge.className = 'status-badge status-' + data.pauseState;

        const btn   = document.getElementById('toggle-btn');
        const label = document.getElementById('pause-label');

        if (data.pauseState === 'RUNNING') {
          btn.textContent = '\\u23f8 Pause';
          btn.className   = 'btn btn-pause';
          label.textContent = '';
        } else if (data.pauseState === 'PAUSING') {
          btn.textContent = '\\u23f5 Resume';
          btn.className   = 'btn btn-resume';
          label.textContent = 'Pausing before: ' + (data.pauseTargetLabel || '\\u2026');
        } else {
          btn.textContent = '\\u23f5 Resume';
          btn.className   = 'btn btn-resume';
          label.textContent = 'Paused before: ' + (data.pauseTargetLabel || '\\u2026');
        }
      } catch (e) {
        showError('Could not reach coder server: ' + e.message);
      }
    }

    async function fetchPrompts() {
      try {
        const res = await fetch('/api/prompts');
        if (!res.ok) { showError('Prompts API error: ' + res.status); return; }
        renderBoard(await res.json());
      } catch (e) {
        showError('Could not load prompts: ' + e.message);
      }
    }

    function renderBoard(promptFiles) {
      const columns = { 'todo': [], 'not-ready': [], 'done': [], 'failed': [] };

      for (const file of promptFiles) {
        for (const section of file.sections) {
          const col = columns[section.status];
          if (col) col.push({ file, section });
        }
      }

      for (const [status, cards] of Object.entries(columns)) {
        const container = document.getElementById('cards-' + status);
        const countEl   = document.getElementById('count-' + status);
        if (!container) continue;

        countEl.textContent = cards.length;
        container.innerHTML = '';

        if (cards.length === 0) {
          container.innerHTML = '<div class="empty-column">Empty</div>';
          continue;
        }

        for (const { file, section } of cards) {
          const card = document.createElement('div');
          card.className = 'card card-' + section.status;
          card.innerHTML =
            '<div class="card-file">' + escapeHtml(file.fileName) + ' &bull; #' + (section.index + 1) + '</div>' +
            '<div class="card-summary">' + escapeHtml(section.summary) + '</div>' +
            (section.priority > 0
              ? '<div class="card-priority">' + '!'.repeat(section.priority) + ' priority ' + section.priority + '</div>'
              : '') +
            '<div class="card-edit-hint">Click to edit</div>';
          card.onclick = () => openModal(file, section);
          container.appendChild(card);
        }
      }
    }

    function openModal(file, section) {
      modalState = { filePath: file.filePath, sectionIndex: section.index };

      document.getElementById('modal-file').textContent          = file.fileName;
      document.getElementById('modal-section-label').textContent = 'Section ' + (section.index + 1);

      const badge = document.getElementById('modal-status-badge');
      badge.textContent = section.status.replace('-', '\\u2011');
      badge.className   = 'modal-status status-' + section.status;

      document.getElementById('modal-content').value = section.content;
      document.getElementById('modal-overlay').classList.remove('hidden');
      setTimeout(() => document.getElementById('modal-content').focus(), 50);
    }

    function closeModal() {
      document.getElementById('modal-overlay').classList.add('hidden');
      modalState = null;
    }

    async function saveModal() {
      if (!modalState) return;

      const content = document.getElementById('modal-content').value;
      const saveBtn = document.querySelector('.btn-save');
      saveBtn.disabled    = true;
      saveBtn.textContent = 'Saving\\u2026';

      try {
        const res = await fetch('/api/prompts/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath:     modalState.filePath,
            sectionIndex: modalState.sectionIndex,
            content,
          }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        closeModal();
        fetchPrompts();
      } catch (e) {
        showError('Save failed: ' + e.message);
      } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save';
      }
    }

    document.getElementById('toggle-btn').onclick = async () => {
      try {
        const endpoint = lastPauseState === 'RUNNING' ? '/api/pause' : '/api/resume';
        await fetch(endpoint, { method: 'POST' });
        await fetchStatus();
      } catch (e) {
        showError('Toggle failed: ' + e.message);
      }
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { saveModal(); return; }
    });

    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });

    fetchStatus();
    fetchPrompts();
    setInterval(fetchStatus,  2000);
    setInterval(fetchPrompts, 5000);
  </script>
</body>
</html>`;

// Note: [⚫] Code in this file should never be published in any package
// Note: Keep in sync with apps/coder-server/index.html
