'use strict';

/** The owner viewer uses the existing local session or the App gateway's passkey session; no tokens enter URLs. */
(async () => {
    const byId = (id) => document.getElementById(id);
    const screen = byId('screen');
    const state = byId('state');
    const notice = byId('notice');
    const remote = document.body.dataset.remote === 'true';
    const prefix = remote ? '/api/v1/computer' : '/api/computer';
    let csrf;
    let viewing = false;
    let controlling = false;
    let frame;
    let pointer;
    let sequence = Promise.resolve();
    let timer;
    let polling = false;
    let epoch = 0;
    let hover;
    let hovering = false;

    /** Send private owner requests without replaying inputs after a lost response. */
    const call = async (operation, value) => {
        const response = await fetch(`${prefix}/${operation}`, {
            method: value === undefined ? 'GET' : 'POST',
            credentials: 'same-origin', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', ...(remote ? {} : { 'X-PTBK-Client': 'dashboard', ...(csrf ? { 'X-PTBK-CSRF': csrf } : {}) }) },
            ...(value === undefined ? {} : { body: JSON.stringify(value) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Desktop request failed (${response.status}).`);
        return result;
    };

    /** Keep button handlers and rendering independent of captured private content. */
    const show = (message) => { state.textContent = message; };
    const failed = (error) => { epoch++; show(error.message); controlling = false; screen.removeAttribute('data-control'); byId('typing').hidden = true; };
    const update = () => {
        screen.toggleAttribute('data-control', controlling);
        byId('typing').hidden = !controlling;
        byId('take').disabled = controlling;
        byId('return').disabled = !controlling;
    };

    /** Snapshot polling is intentionally bounded and stops when this viewer is hidden or closed. */
    const poll = async () => {
        clearTimeout(timer);
        if (!viewing || document.hidden || polling) return;
        polling = true;
        try {
            const next = await call('screenshot');
            if (!viewing || document.hidden) return;
            if (typeof next.data !== 'string' || next.mimeType !== 'image/png') throw new Error('The desktop returned no frame.');
            frame = next;
            screen.src = `data:image/png;base64,${next.data}`;
            screen.hidden = false;
            show(controlling ? 'You control this desktop' : 'Viewing desktop');
        } catch (error) { if (viewing) failed(error); }
        finally { polling = false; }
        if (viewing && !document.hidden) timer = setTimeout(poll, 750);
    };
    const startView = () => { viewing = true; byId('view').textContent = 'Refresh desktop'; void poll(); };
    const input = (command) => {
        if (!controlling) return;
        // Inputs are ordered once; a failed acknowledgement is never replayed.
        const queuedEpoch = epoch;
        sequence = sequence.then(() => controlling && epoch === queuedEpoch ? call('input', command) : undefined).catch(failed);
    };
    const coordinates = (event) => {
        if (!frame) return undefined;
        const bounds = screen.getBoundingClientRect();
        return { x: Math.max(0, Math.min(frame.width - 1, (event.clientX - bounds.left) * frame.width / bounds.width)), y: Math.max(0, Math.min(frame.height - 1, (event.clientY - bounds.top) * frame.height / bounds.height)) };
    };
    const button = (value) => value === 2 ? 'right' : value === 1 ? 'middle' : 'left';

    byId('view').addEventListener('click', startView);
    byId('take').addEventListener('click', async () => {
        try {
            await call('pause', {});
            controlling = true; update(); startView();
            notice.textContent = 'Agent input and observation are paused. Click the desktop to focus its keyboard; closing this viewer keeps the pause until you return control.';
        } catch (error) { failed(error); }
    });
    byId('return').addEventListener('click', async () => {
        try {
            await sequence;
            await call('resume', {});
            controlling = false; update(); show('Control returned to agents');
            notice.textContent = 'Agents can use this desktop again. Physical input on the computer always has priority.';
        } catch (error) { failed(error); }
    });
    byId('stop').addEventListener('click', async () => {
        // Stop is deliberately not queued behind a drag, movement or text operation.
        epoch++; viewing = false; controlling = false; clearTimeout(timer); update();
        screen.removeAttribute('src'); screen.hidden = true; frame = undefined;
        try { await call('stop', {}); show('Desktop stopped across projects'); } catch (error) { failed(error); }
    });
    byId('permissions').addEventListener('click', async () => {
        try { await call('permissions', {}); show('Complete system permissions on the engine computer, then view its desktop.'); } catch (error) { failed(error); }
    });
    screen.addEventListener('pointerdown', (event) => {
        if (!controlling) return;
        event.preventDefault(); screen.focus();
        const point = coordinates(event);
        if (!point) return;
        pointer = { ...point, button: button(event.button), id: event.pointerId };
        screen.setPointerCapture(event.pointerId);
    });
    screen.addEventListener('pointerup', (event) => {
        if (!controlling || !pointer || pointer.id !== event.pointerId) return;
        event.preventDefault();
        const end = coordinates(event);
        const start = pointer; pointer = undefined;
        if (!end) return;
        if (start.button === 'left' && Math.hypot(end.x - start.x, end.y - start.y) > 5) {
            input({ op: 'move', x: start.x, y: start.y });
            input({ op: 'drag', ...end });
        } else input({ op: 'click', ...end, button: start.button, count: 1 });
    });
    screen.addEventListener('pointermove', (event) => {
        if (!controlling || pointer) return;
        hover = coordinates(event);
        if (hovering) return;
        hovering = true;
        // Coalesce hover movements instead of building a delayed queue while a person moves their pointer.
        const move = async () => {
            const point = hover; hover = undefined;
            if (point && controlling && !pointer) input({ op: 'move', ...point, durationMs: 100 });
            await sequence;
            if (hover && controlling && !pointer) setTimeout(move, 75);
            else hovering = false;
        };
        void move();
    });
    screen.addEventListener('pointercancel', () => { pointer = undefined; });
    screen.addEventListener('contextmenu', (event) => { if (controlling) event.preventDefault(); });
    screen.addEventListener('wheel', (event) => {
        if (!controlling) return;
        event.preventDefault();
        const point = coordinates(event);
        if (point) input({ op: 'move', ...point });
        input({ op: 'scroll', deltaX: event.deltaX, deltaY: event.deltaY });
    }, { passive: false });
    screen.addEventListener('keydown', (event) => {
        if (!controlling || event.key === 'Tab' && !event.ctrlKey && !event.metaKey) return;
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
        event.preventDefault();
        const keys = [event.ctrlKey && 'Control', event.metaKey && 'Meta', event.altKey && 'Alt', event.shiftKey && 'Shift', event.key].filter(Boolean);
        input({ op: 'key', keys });
    });
    byId('typing').addEventListener('submit', (event) => {
        event.preventDefault();
        const text = byId('text').value;
        if (text) input({ op: 'type', text });
        byId('text').value = '';
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else if (viewing) void poll(); });
    window.addEventListener('pagehide', () => { viewing = false; clearTimeout(timer); screen.removeAttribute('src'); frame = undefined; });
    try {
        if (!remote) {
            const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-PTBK-Client': 'dashboard' } });
            if (!response.ok) throw new Error('Open this desktop from the signed-in Promptbook Console.');
            csrf = (await response.json()).csrf;
        }
        const result = await call('status');
        const status = result.data || result;
        show(status.reason || status.backend?.reason || 'Desktop ready to view');
        update();
    } catch (error) { failed(error); }
})();
