import { escapeHtml, scriptValue, type FeaturePage } from './feature-server.js';

/**
 * Key combinations a viewer's own browser or operating system may intercept, offered from the toolbar so they reach
 * the tab instead (`modifiers`: Alt 1, Ctrl 2, Meta/Command 4, Shift 8).
 */
const SHORTCUTS: ReadonlyArray<{ readonly label: string; readonly key: string; readonly code: string; readonly keyCode: number; readonly modifiers: number }> = [
    { label: 'Tab', key: 'Tab', code: 'Tab', keyCode: 9, modifiers: 0 },
    { label: 'Shift+Tab', key: 'Tab', code: 'Tab', keyCode: 9, modifiers: 8 },
    { label: 'Escape', key: 'Escape', code: 'Escape', keyCode: 27, modifiers: 0 },
    { label: 'F5', key: 'F5', code: 'F5', keyCode: 116, modifiers: 0 },
    { label: 'Ctrl+W', key: 'w', code: 'KeyW', keyCode: 87, modifiers: 2 },
    { label: 'Ctrl+T', key: 't', code: 'KeyT', keyCode: 84, modifiers: 2 },
    { label: 'Ctrl+N', key: 'n', code: 'KeyN', keyCode: 78, modifiers: 2 },
    { label: 'Ctrl+L', key: 'l', code: 'KeyL', keyCode: 76, modifiers: 2 },
    { label: 'Ctrl+Tab', key: 'Tab', code: 'Tab', keyCode: 9, modifiers: 2 },
    { label: 'Ctrl+Shift+Tab', key: 'Tab', code: 'Tab', keyCode: 9, modifiers: 10 },
    { label: 'Alt+Left', key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, modifiers: 1 },
    { label: 'Alt+Right', key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, modifiers: 1 },
    { label: '⌘W', key: 'w', code: 'KeyW', keyCode: 87, modifiers: 4 },
    { label: '⌘Q', key: 'q', code: 'KeyQ', keyCode: 81, modifiers: 4 },
    { label: '⌘L', key: 'l', code: 'KeyL', keyCode: 76, modifiers: 4 },
];

/**
 * The viewer of one user-controlled tab: Promptbook's trusted toolbar (the tab's actual address as an editable field,
 * Back, Forward, Reload, a menu for intercepted shortcuts, Copy and Paste) above the live stream of the tab, whose
 * pointer, wheel, touch and keyboard input go to the tab in order. Clipboard text moves only on an explicit copy or
 * paste. The handoff and Wallet choices are not here: they stay in the controlling dashboard (`hint` says where).
 *
 * @private tab viewer page
 */
export function tabFeaturePage(input: { readonly browser: string; readonly hint: string }): FeaturePage {
    return {
        title: `Browser · ${input.browser}`,
        style: `html, body { height: 100%; }
body { display: flex; flex-direction: column; overflow: hidden; }
header { display: flex; gap: 6px; align-items: center; padding: 6px 8px; background: var(--panel); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
header button, header select { font: inherit; font-size: 14px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }
header button:disabled { opacity: 0.45; cursor: default; }
header button:focus-visible, header select:focus-visible, #address:focus-visible, #stage:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
form { flex: 1 1 260px; display: flex; min-width: 0; }
#address { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); }
.badge { font-size: 12px; color: var(--muted); white-space: nowrap; }
#stage { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; outline: none; touch-action: none; user-select: none; -webkit-user-select: none; position: relative; }
#screen { display: block; max-width: 100%; max-height: 100%; cursor: default; -webkit-user-drag: none; }
#placeholder { color: #bbb; text-align: center; padding: 24px; max-width: 520px; }
footer { padding: 4px 10px; font-size: 12px; color: var(--muted); background: var(--panel); border-top: 1px solid var(--line); }
#limitations { color: var(--warn); }
`,
        body: `<header>
<button id="back" type="button" title="Back" aria-label="Back">←</button>
<button id="forward" type="button" title="Forward" aria-label="Forward">→</button>
<button id="reload" type="button" title="Reload" aria-label="Reload">⟳</button>
<form id="go"><input id="address" type="text" spellcheck="false" autocomplete="off" aria-label="Address" placeholder="Address"></form>
<select id="shortcut" aria-label="Send a key combination to the tab"><option value="">Send keys…</option>${SHORTCUTS.map((shortcut, index) => `<option value="${index}">${escapeHtml(shortcut.label)}</option>`).join('')}</select>
<button id="copy" type="button" title="Copy the tab's selected text">Copy</button>
<button id="paste" type="button" title="Paste your clipboard text into the tab">Paste</button>
<span id="mode" class="badge"></span>
</header>
<main id="stage" tabindex="0" aria-label="Live browser tab">
<p id="placeholder">Connecting to the tab…</p>
<img id="screen" alt="" hidden draggable="false">
</main>
<footer><span id="limitations" hidden></span> <span>${escapeHtml(input.hint)}</span></footer>`,
        script: `(() => {
  const SHORTCUTS = ${scriptValue(SHORTCUTS)};
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), screen = $('screen'), placeholder = $('placeholder'), address = $('address');
  let frame = { width: 0, height: 0 }, objectUrl = '', queue = [], pendingMove = null, scheduled = false, over = false, clicks = 0;
  const mods = (event) => (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  const flush = () => {
    scheduled = false;
    if (pendingMove) { queue.push(pendingMove); pendingMove = null; }
    if (!queue.length) return;
    surface.send({ type: 'input', events: queue });
    queue = [];
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(flush); } };
  // Inputs keep their order: a pending pointer move goes out before the next other input.
  const push = (event) => { if (over) return; if (pendingMove) { queue.push(pendingMove); pendingMove = null; } queue.push(event); schedule(); };
  const position = (event) => {
    const box = screen.getBoundingClientRect();
    return { x: (event.clientX - box.left) / Math.max(1, box.width), y: (event.clientY - box.top) / Math.max(1, box.height) };
  };
  const BUTTONS = ['left', 'middle', 'right'];
  screen.addEventListener('mousedown', (event) => { event.preventDefault(); stage.focus(); clicks = event.detail || 1; push({ type: 'mouse', action: 'down', ...position(event), button: BUTTONS[event.button] || 'left', buttons: event.buttons, clickCount: clicks, modifiers: mods(event) }); });
  addEventListener('mouseup', (event) => { if (screen.hidden) return; push({ type: 'mouse', action: 'up', ...position(event), button: BUTTONS[event.button] || 'left', buttons: event.buttons, clickCount: event.detail || clicks || 1, modifiers: mods(event) }); });
  addEventListener('mousemove', (event) => { if (screen.hidden || over) return; pendingMove = { type: 'mouse', action: 'move', ...position(event), buttons: event.buttons, modifiers: mods(event) }; schedule(); });
  screen.addEventListener('contextmenu', (event) => event.preventDefault());
  screen.addEventListener('dragstart', (event) => event.preventDefault());
  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    push({ type: 'mouse', action: 'wheel', ...position(event), deltaX: event.deltaX * scale, deltaY: event.deltaY * scale, modifiers: mods(event) });
  }, { passive: false });
  const touches = (event) => [...event.touches].map((touch) => ({ ...position(touch), id: touch.identifier }));
  for (const [name, action] of [['touchstart', 'start'], ['touchmove', 'move'], ['touchend', 'end'], ['touchcancel', 'cancel']]) {
    screen.addEventListener(name, (event) => { event.preventDefault(); stage.focus(); push({ type: 'touch', action, points: touches(event), modifiers: mods(event) }); }, { passive: false });
  }
  // Keys typed while the tab has focus go to it; copy, cut and paste of the viewer's clipboard stay explicit.
  const commandOf = (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return undefined;
    const key = event.key.toLowerCase();
    if (key === 'a') return 'selectAll';
    if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (key === 'y' && event.ctrlKey) return 'redo';
    return undefined;
  };
  const clipboardKey = (event) => (event.ctrlKey || event.metaKey) && !event.altKey && ['c', 'x', 'v'].includes(event.key.toLowerCase());
  stage.addEventListener('keydown', (event) => {
    if (clipboardKey(event) || event.isComposing) return;
    event.preventDefault();
    const text = event.key.length === 1 && !event.ctrlKey && !event.metaKey ? event.key : event.key === 'Enter' ? '\\r' : undefined;
    push({ type: 'key', action: 'down', key: event.key, code: event.code, keyCode: event.keyCode, modifiers: mods(event), location: event.location, repeat: event.repeat, ...(text ? { text } : {}), ...(commandOf(event) ? { command: commandOf(event) } : {}) });
  });
  stage.addEventListener('keyup', (event) => {
    if (clipboardKey(event)) return;
    event.preventDefault();
    push({ type: 'key', action: 'up', key: event.key, code: event.code, keyCode: event.keyCode, modifiers: mods(event), location: event.location });
  });
  const inStage = () => document.activeElement === stage;
  const copy = (action) => { if (!over) surface.send({ type: 'clipboard', action }); };
  document.addEventListener('copy', (event) => { if (!inStage()) return; event.preventDefault(); copy('copy'); });
  document.addEventListener('cut', (event) => { if (!inStage()) return; event.preventDefault(); copy('cut'); });
  document.addEventListener('paste', (event) => {
    if (!inStage()) return;
    event.preventDefault();
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
    if (text) push({ type: 'text', text });
  });
  $('copy').addEventListener('click', () => { copy('copy'); stage.focus(); });
  $('paste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) push({ type: 'text', text });
      else surface.status('Your clipboard has no text to paste.', 'warning');
    } catch {
      surface.status('This browser did not allow reading the clipboard. Allow clipboard access for this page, or click the tab and press Ctrl+V (⌘V on a Mac).', 'warning');
    }
    stage.focus();
  });
  $('shortcut').addEventListener('change', (event) => {
    const shortcut = SHORTCUTS[Number(event.target.value)];
    event.target.value = '';
    stage.focus();
    if (!shortcut) return;
    push({ type: 'key', action: 'down', key: shortcut.key, code: shortcut.code, keyCode: shortcut.keyCode, modifiers: shortcut.modifiers });
    push({ type: 'key', action: 'up', key: shortcut.key, code: shortcut.code, keyCode: shortcut.keyCode, modifiers: shortcut.modifiers });
  });
  $('back').addEventListener('click', () => surface.send({ type: 'navigate', action: 'back' }));
  $('forward').addEventListener('click', () => surface.send({ type: 'navigate', action: 'forward' }));
  $('reload').addEventListener('click', () => surface.send({ type: 'navigate', action: 'reload' }));
  $('go').addEventListener('submit', (event) => { event.preventDefault(); if (address.value.trim()) surface.send({ type: 'navigate', action: 'go', url: address.value.trim() }); stage.focus(); });
  let resizeTimer;
  const resize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => surface.send({ type: 'resize', width: stage.clientWidth, height: stage.clientHeight, scale: devicePixelRatio || 1 }), 150); };
  new ResizeObserver(resize).observe(stage);
  surface.onopen = () => { resize(); stage.focus(); };
  surface.onmessage = (message) => {
    if (message.type === 'frame') frame = { width: message.width, height: message.height };
    else if (message.type === 'view') {
      const view = message.view;
      if (document.activeElement !== address) address.value = view.url || '';
      $('back').disabled = !view.canGoBack;
      $('forward').disabled = !view.canGoForward;
      $('mode').textContent = view.mode === 'headful' ? 'visible window' : 'headless';
      document.title = (view.title ? view.title + ' · ' : '') + 'Promptbook browser';
      const limitations = $('limitations');
      limitations.textContent = (view.limitations || []).join(' ');
      limitations.hidden = !limitations.textContent;
    } else if (message.type === 'clipboard') {
      if (!message.text) { surface.status('Nothing is selected in the tab.', 'warning'); return; }
      navigator.clipboard.writeText(message.text).then(() => surface.status('Copied.'), () => surface.status('This browser did not allow writing to the clipboard. Allow clipboard access for this page and copy again.', 'warning'));
      setTimeout(() => surface.status(''), 2500);
    } else if (message.type === 'problem') surface.status(message.text, 'warning');
  };
  surface.onbinary = (data) => {
    const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
    screen.onload = () => { if (objectUrl && objectUrl !== url) URL.revokeObjectURL(objectUrl); objectUrl = url; };
    screen.src = url;
    screen.hidden = false;
    placeholder.hidden = true;
  };
  surface.onclose = (reason) => {
    over = true;
    queue = [];
    pendingMove = null;
    screen.hidden = true;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    placeholder.hidden = false;
    placeholder.textContent = reason || 'This viewer is closed.';
  };
})();`,
    };
}
