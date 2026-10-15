'use strict';

/*
 * Promptbook browser dashboard: a small framework-free client of the project service API.
 * All live data comes from /api/state (long polling); all controls go through the API.
 */
(() => {
    const app = document.getElementById('app');
    const headerStatus = document.getElementById('header-status');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        snapshot: null,
        revision: -1,
        csrf: null,
        connected: false,
        drafts: new Map(),
        showAllQueue: false,
        showMoreHarnesses: false,
        busy: new Set(),
        qrFor: null,
        frame: 0,
    };

    /** Creates a DOM element; text children are always inserted as text (never parsed as HTML). */
    function h(tag, attributes, ...children) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes || {})) {
            if (value === undefined || value === null || value === false) continue;
            if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
            else if (key === 'className') element.className = value;
            else if (key === 'style') element.setAttribute('style', value);
            else element.setAttribute(key, value === true ? '' : String(value));
        }
        for (const child of children.flat()) {
            if (child === undefined || child === null || child === false) continue;
            element.append(child instanceof Node ? child : document.createTextNode(String(child)));
        }
        return element;
    }

    /** Calls the API with the session cookie and CSRF header. */
    async function api(path, options = {}) {
        const response = await fetch(path, {
            method: options.method || 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-PTBK-CSRF': state.csrf } : {}) },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            const error = new Error(data.error || 'Authentication required.');
            error.status = 401;
            throw error;
        }
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        return data;
    }

    /** Short transient feedback (in addition to the persistent status). */
    function toast(text) {
        const element = h('div', { className: 'toast', role: 'status' }, text);
        document.body.append(element);
        setTimeout(() => element.remove(), 3500);
    }

    /** Formats an ISO time as local short time. */
    function time(iso) {
        if (!iso) return '';
        const date = new Date(iso);
        const today = new Date();
        const sameDay = date.toDateString() === today.toDateString();
        return sameDay ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    }

    /** Agent badge with optional working gesture frame. */
    function badge(agent, small) {
        const classes = ['badge', small ? 'small' : '', agent.activity === 'working' ? 'working' : ''].filter(Boolean).join(' ');
        return h('span', { className: classes, style: `--hue:${agent.hue}`, title: `${agent.name} — ${agent.activity}`, 'aria-hidden': 'true' }, h('span', { className: 'frame-a' }, agent.face), h('span', { className: 'frame-b' }, agent.gesture));
    }

    const ACTIVITY_LABEL = {
        working: 'working',
        idle: 'idle',
        'waiting-user': 'waiting for you',
        'waiting-provider': 'waiting for provider',
        paused: 'paused',
        blocked: 'blocked',
        failed: 'failed',
        completed: 'completed',
    };

    /** Pill describing a state. */
    function pill(text, tone) {
        return h('span', { className: `pill ${tone || ''}` }, text);
    }

    /** Runs a control action through the API. */
    async function control(action, confirmText) {
        if (confirmText && !window.confirm(confirmText)) return;
        try {
            const result = await api('/api/control', { method: 'POST', body: { action } });
            toast(result.outcome);
        } catch (error) {
            toast(`Failed: ${error.message}`);
        }
    }

    /** Submits an answer once. */
    async function answer(id, value, status) {
        if (state.busy.has(id)) return;
        state.busy.add(id);
        render(state.snapshot);
        try {
            await api(`/api/requests/${encodeURIComponent(id)}/answer`, { method: 'POST', body: { answer: value, status: status || 'answered' } });
            state.drafts.delete(id);
            toast('Answer applied.');
        } catch (error) {
            toast(`Not applied: ${error.message}`);
        } finally {
            state.busy.delete(id);
            render(state.snapshot);
        }
    }

    function renderAttention(snapshot) {
        const requests = snapshot.requests;
        const card = h('section', { className: `card attention ${requests.length ? '' : 'empty'}`, 'aria-label': 'Needs your attention' });
        card.append(h('h2', {}, h('span', {}, requests.length ? `Needs your attention (${requests.length})` : 'Needs your attention'), requests.length ? pill('action required', 'warn') : null));
        if (!requests.length) {
            card.append(h('p', { className: 'muted' }, 'Nothing needs you right now.'));
            return card;
        }
        for (const request of requests) {
            const busy = state.busy.has(request.id);
            const item = h('article', { className: 'request', 'data-request': request.id });
            item.append(h('div', { className: 'reason' }, request.reason));
            item.append(
                h(
                    'div',
                    { className: 'meta' },
                    `${request.id} · ${request.origin}${request.agent ? ` · asked by ${request.agent}` : ''}${request.taskTitle ? ` · affects “${request.taskTitle}”` : ''} · ${time(request.createdAt)}${request.blocking ? ' · blocking' : ''}`,
                ),
            );
            item.append(h('div', { className: 'question' }, request.question));
            if (request.choices && request.choices.length) {
                item.append(h('div', { className: 'choices', role: 'group', 'aria-label': 'Answers' }, request.choices.map((choice) => h('button', { className: 'primary', disabled: busy, onclick: () => answer(request.id, choice) }, choice))));
            } else {
                const field = h('textarea', { 'data-draft': request.id, 'aria-label': `Answer to ${request.id}`, placeholder: 'Type your answer…', disabled: busy });
                field.value = state.drafts.get(request.id) || '';
                field.addEventListener('input', () => state.drafts.set(request.id, field.value));
                field.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        if (field.value.trim()) answer(request.id, field.value);
                    }
                });
                item.append(field);
                item.append(
                    h(
                        'div',
                        { className: 'row', style: 'margin-top:8px' },
                        h('button', { className: 'primary', disabled: busy, onclick: () => (field.value.trim() ? answer(request.id, field.value) : field.focus()) }, 'Send answer'),
                        h('span', { className: 'muted' }, 'Ctrl+Enter sends'),
                    ),
                );
            }
            item.append(h('div', { className: 'row', style: 'margin-top:6px' }, h('button', { disabled: busy, onclick: () => window.confirm('Decline this request? The agent is told it was declined.') && answer(request.id, 'Declined by the user.', 'rejected') }, 'Decline')));
            card.append(item);
        }
        return card;
    }

    function renderWork(snapshot) {
        const card = h('section', { className: 'card work', 'aria-label': 'Current work' });
        card.append(h('h2', {}, h('span', {}, 'Current work'), pill(snapshot.phase, snapshot.phase === 'blocked' ? 'bad' : snapshot.current ? 'ok' : '')));
        const current = snapshot.current;
        if (current) {
            const model = current.model ? `${current.model}${current.modelSource === 'requested' ? ' (requested)' : ''}` : 'harness default (unknown model)';
            card.append(
                h(
                    'div',
                    { className: 'agent' },
                    badge(current.agent),
                    h('div', {}, h('div', {}, h('strong', {}, current.agent.name), ' ', h('span', { className: 'muted' }, ACTIVITY_LABEL[current.agent.activity] || current.agent.activity)), h('div', { className: 'title' }, current.taskTitle)),
                ),
            );
            const rows = [
                ['Task', `${current.taskRef}${current.kind !== 'task' ? ` (${current.kind})` : ''}`],
                ['Harness', `${current.harnessName} · ${model}${current.thinkingLevel ? ` · ${current.thinkingLevel}` : ''}`],
                ['Phase', `${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}${current.detail ? ` · ${current.detail}` : ''}`],
                ['Since', time(current.startedAt)],
            ];
            if (current.target) rows.push(['Assigning', current.target.ref]);
            card.append(h('dl', { className: 'kv', style: 'margin-top:12px' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])));
        } else {
            card.append(h('p', {}, snapshot.service.state === 'stopped' ? 'The service is stopped.' : snapshot.wait ? snapshot.wait.reason : 'Idle.'));
        }
        if (snapshot.wait) {
            card.append(
                h(
                    'div',
                    { className: 'notice' },
                    h('strong', {}, `Waiting (${snapshot.wait.kind})`),
                    ' ',
                    snapshot.wait.reason,
                    snapshot.wait.until ? ` · until ${time(snapshot.wait.until)}` : '',
                    snapshot.wait.action ? h('div', { className: 'muted' }, `Next: ${snapshot.wait.action}`) : null,
                ),
            );
        }
        for (const blocker of snapshot.blockers) {
            card.append(h('div', { className: 'notice error' }, h('strong', {}, blocker.title), ' — ', blocker.reason, blocker.action ? h('div', {}, `Action: ${blocker.action}`) : null, blocker.recheckAt ? h('div', { className: 'muted' }, `Next recheck ${time(blocker.recheckAt)}`) : null));
        }
        const error = snapshot.errors[snapshot.errors.length - 1];
        if (error) card.append(h('details', {}, h('summary', {}, `Last error: ${error.summary}`), h('div', { className: 'muted' }, [error.phase && `Step: ${error.phase}`, error.next && `Next: ${error.next}`, error.trace && `Diagnostics: ${error.trace}`].filter(Boolean).join(' · '))));
        return card;
    }

    function renderControls(snapshot) {
        const card = h('section', { className: 'card controls', 'aria-label': 'Controls' });
        card.append(h('h2', {}, 'Controls'));
        const running = !['stopped', 'finished'].includes(snapshot.service.state);
        const paused = snapshot.service.state === 'paused' || snapshot.service.state === 'pausing';
        card.append(
            h(
                'div',
                { className: 'row' },
                h('button', { disabled: !running, onclick: () => control(paused ? 'resume' : 'pause') }, paused ? 'Resume' : 'Pause'),
                h('button', { disabled: !running || !(snapshot.wait && snapshot.wait.skippable), title: snapshot.wait && !snapshot.wait.skippable ? 'Only pacing/backoff waits can be skipped' : '', onclick: () => control('skip-wait') }, 'Skip wait'),
                snapshot.service.stopRequested
                    ? h('button', { onclick: () => control('cancel-stop') }, 'Cancel stop')
                    : h('button', { disabled: !running, onclick: () => control('stop', 'Stop the service after the current task? Closing this page does not stop it.') }, 'Stop after task'),
                h('button', { className: 'danger', disabled: !running, onclick: () => control('stop-now', 'Stop now? The current task is cancelled and resumes from its recovery record next time.') }, 'Stop now'),
            ),
        );
        card.append(h('p', { className: 'muted' }, 'Leaving this page never stops the service.'));
        const agents = h('details', {}, h('summary', {}, `Agents (${snapshot.agents.length})`), h('ul', { className: 'list' }, snapshot.agents.map((agent) => h('li', {}, h('span', { className: 'row' }, badge(agent, true), agent.name), h('span', { className: 'muted' }, ACTIVITY_LABEL[agent.activity])))));
        card.append(agents);
        const featured = snapshot.harnesses.filter((harness) => harness.featured || harness.enabled);
        const harnessList = h(
            'ul',
            { className: 'list' },
            (state.showMoreHarnesses ? snapshot.harnesses : featured).map((harness) =>
                h('li', {}, h('span', {}, harness.name, harness.enabled ? '' : h('span', { className: 'muted' }, ' (not enabled)')), harness.enabled ? pill(harness.usable ? 'ready' : 'needs setup', harness.usable ? 'ok' : 'bad') : null),
            ),
        );
        card.append(h('details', {}, h('summary', {}, 'Harnesses'), harnessList, h('button', { onclick: () => ((state.showMoreHarnesses = !state.showMoreHarnesses), render(state.snapshot)) }, state.showMoreHarnesses ? 'Fewer' : 'More…')));
        card.append(renderSettings(snapshot));
        return card;
    }

    function renderSettings(snapshot) {
        const editable = snapshot.settings.filter((setting) => setting.application !== 'restart');
        const keySelect = h('select', { 'aria-label': 'Setting' }, editable.map((setting) => h('option', { value: setting.key }, setting.key)));
        const valueInput = h('input', { type: 'text', 'aria-label': 'Value', placeholder: 'value, e.g. 30m, true, headful' });
        const save = h('input', { type: 'checkbox', id: 'save-default' });
        const apply = async () => {
            try {
                const result = await api('/api/settings', { method: 'POST', body: { changes: { [keySelect.value]: valueInput.value }, save: save.checked } });
                toast(`${result.saved ? 'Saved to ptbk.json' : 'Changed for this process'}${result.restartRequired && result.restartRequired.length ? ' (restart required)' : ''}`);
            } catch (error) {
                toast(`Not applied: ${error.message}`);
            }
        };
        return h(
            'details',
            {},
            h('summary', {}, 'Settings'),
            h('dl', { className: 'kv' }, snapshot.settings.map((setting) => [h('dt', {}, setting.key), h('dd', {}, `${setting.value} `, h('span', { className: 'muted' }, `(${setting.source}; ${setting.application === 'live' ? 'live' : setting.application === 'next-task' ? 'next task' : 'restart'})`))])),
            h('div', { className: 'row', style: 'margin-top:8px' }, keySelect, valueInput, h('label', { for: 'save-default' }, save, ' save as project default'), h('button', { onclick: apply }, 'Apply')),
        );
    }

    function renderQueue(snapshot) {
        const card = h('section', { className: 'card queue', 'aria-label': 'Queue' });
        card.append(h('h2', {}, h('span', {}, `Queue (${snapshot.queueTotal})`)));
        if (!snapshot.queue.length) {
            card.append(h('p', { className: 'muted' }, 'No unfinished tasks.'));
            return card;
        }
        const items = state.showAllQueue ? snapshot.queue : snapshot.queue.slice(0, 12);
        const tone = { ready: 'ok', active: 'ok', 'needs-assignment': 'warn', assigning: 'warn', blocked: 'bad', failed: 'bad', 'needs-recovery': 'bad', 'awaiting-user': 'warn' };
        card.append(
            h(
                'ul',
                { className: 'list' },
                items.map((item) =>
                    h(
                        'li',
                        {},
                        h('span', { className: 'title' }, item.title, h('span', { className: 'why' }, `${item.reason}${item.agent ? ` · ${item.agent}` : ''}${item.harness ? ` · ${item.harness}` : ''}${item.priority ? ` · priority ${item.priority}` : ''}`)),
                        pill(item.readiness, tone[item.readiness]),
                    ),
                ),
            ),
        );
        if (snapshot.queue.length > 12) card.append(h('button', { onclick: () => ((state.showAllQueue = !state.showAllQueue), render(state.snapshot)) }, state.showAllQueue ? 'Show fewer' : `Show all ${snapshot.queue.length}`));
        return card;
    }

    function renderActivity(snapshot) {
        const card = h('section', { className: 'card activity', 'aria-label': 'Results and activity' });
        card.append(h('h2', {}, h('span', {}, 'Results and activity'), h('span', {}, `✔ ${snapshot.results.completed} · ✖ ${snapshot.results.failed}`)));
        if (snapshot.results.recent.length) {
            card.append(
                h(
                    'ul',
                    { className: 'list' },
                    snapshot.results.recent.slice(0, 6).map((result) =>
                        h('li', {}, h('span', { className: 'title' }, result.title, h('span', { className: 'why' }, `${result.agent || ''} ${result.commit ? `· ${result.commit.slice(0, 8)}` : ''} · ${time(result.endedAt)}`)), pill(result.outcome, result.outcome.startsWith('completed') ? 'ok' : result.outcome === 'failed' ? 'bad' : 'warn')),
                    ),
                ),
            );
        }
        const log = h('div', { className: 'log', role: 'log', 'aria-live': 'off' }, snapshot.activity.slice(-150).map((line) => h('div', { className: line.level }, `${time(line.at)}  ${line.text}`)));
        card.append(log);
        requestAnimationFrame(() => {
            log.scrollTop = log.scrollHeight;
        });
        return card;
    }

    function renderConnection(snapshot) {
        const card = h('section', { className: 'card connection', 'aria-label': 'Connection' });
        card.append(h('h2', {}, 'Connection'));
        const { local, remote } = snapshot.connection;
        const remoteTone = remote.state === 'ready' ? 'ok' : remote.state === 'disabled' ? '' : remote.state === 'connecting' ? 'warn' : 'bad';
        const rows = [
            [h('dt', {}, 'Remote'), h('dd', {}, pill(remote.state, remoteTone), remote.provider ? ` ${remote.provider}` : '', remote.url ? h('div', {}, h('a', { href: remote.url, rel: 'noreferrer' }, remote.url)) : null, remote.error ? h('div', { className: 'muted' }, remote.error) : null)],
            [h('dt', {}, 'Local'), h('dd', {}, pill(local.state, local.state === 'ready' ? 'ok' : ''), local.url ? h('div', {}, local.url, h('span', { className: 'muted' }, ' (same computer only)')) : null)],
        ];
        card.append(h('dl', { className: 'kv' }, rows));
        if (remote.state === 'ready' && remote.url) {
            if (state.qrFor !== remote.url) state.qrFor = remote.url;
            card.append(h('div', { className: 'qr' }, h('img', { src: `/api/qr?v=${encodeURIComponent(remote.url)}`, alt: `QR code of ${remote.url}` }), h('div', { className: 'muted' }, 'Opens this dashboard; new devices still need a pairing link from the local terminal.')));
        } else if (remote.state !== 'disabled') {
            card.append(h('p', { className: 'muted' }, 'Remote access is not ready; local access keeps working.'));
        }
        card.append(h('p', { className: 'muted' }, 'The tunnel provider relays traffic; HTTPS does not hide content from the relay. Pairing links are shown only in the local terminal (ptbk access pair).'));
        card.append(
            h('button', {
                onclick: async () => {
                    await api('/api/logout', { method: 'POST' }).catch(() => undefined);
                    location.reload();
                },
            }, 'Sign out this device'),
        );
        return card;
    }

    /** Renders the whole view, preserving focus, drafts and scroll. */
    function render(snapshot) {
        if (!snapshot) return;
        const active = document.activeElement;
        const focusDraft = active && active.getAttribute && active.getAttribute('data-draft');
        const selection = focusDraft ? [active.selectionStart, active.selectionEnd] : null;
        const scroll = window.scrollY;
        app.replaceChildren(renderAttention(snapshot), renderWork(snapshot), renderControls(snapshot), renderQueue(snapshot), renderActivity(snapshot), renderConnection(snapshot));
        if (focusDraft) {
            const field = app.querySelector(`[data-draft="${CSS.escape(focusDraft)}"]`);
            if (field) {
                field.focus();
                if (selection) field.setSelectionRange(selection[0], selection[1]);
            }
        }
        window.scrollTo(0, scroll);
        const live = state.connected ? 'live' : 'disconnected — showing last known state';
        headerStatus.replaceChildren(
            h('strong', {}, snapshot.project.name),
            ` · ptbk ${snapshot.engine.version} · ${snapshot.service.mode} · ${snapshot.service.state}${snapshot.service.commitMode === 'no-commit' ? ' · NO-COMMIT' : ''}${snapshot.requests.length ? ` · ${snapshot.requests.length} request(s)` : ''} · ${live} · observed ${time(snapshot.observedAt)}`,
        );
        document.title = `${snapshot.requests.length ? `(${snapshot.requests.length}) ` : ''}${snapshot.project.name} · Promptbook`;
    }

    /** Pairing screen for unauthenticated visitors (no project data). */
    function showPairing(message) {
        headerStatus.textContent = 'Not paired';
        app.replaceChildren(
            h(
                'section',
                { className: 'card pairing' },
                h('h2', {}, 'Pair this device'),
                h('p', {}, 'This project dashboard is protected. Open the pairing link or scan the QR code shown in the local terminal (`ptbk status`, `ptbk dashboard` or `ptbk access pair`).'),
                message ? h('div', { className: 'notice error' }, message) : null,
                h('p', { className: 'muted' }, 'Pairing links are single-use and expire after 10 minutes.'),
            ),
        );
    }

    /** Long-polling loop with honest disconnection state. */
    async function poll() {
        let backoff = 1000;
        for (;;) {
            try {
                const snapshot = await api(`/api/state?after=${state.revision}&wait=25000`);
                state.connected = true;
                backoff = 1000;
                state.snapshot = snapshot;
                state.revision = snapshot.revision;
                render(snapshot);
                if (snapshot.service.state === 'stopped' || snapshot.service.state === 'finished') {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            } catch (error) {
                if (error.status === 401) {
                    showPairing('Your session ended or was revoked.');
                    return;
                }
                state.connected = false;
                render(state.snapshot);
                if (!state.snapshot) headerStatus.textContent = `Disconnected (${error.message}); retrying…`;
                await new Promise((resolve) => setTimeout(resolve, backoff));
                backoff = Math.min(backoff * 2, 15000);
            }
        }
    }

    /** Boot: redeem a pairing fragment, then load the session. */
    async function boot() {
        const fragment = new URLSearchParams(location.hash.slice(1));
        const code = fragment.get('pair');
        if (code) {
            history.replaceState(null, '', location.pathname + location.search);
            try {
                const result = await api('/api/pair', { method: 'POST', body: { code } });
                state.csrf = result.csrf;
            } catch (error) {
                showPairing(error.message);
                return;
            }
        }
        try {
            const session = await api('/api/session');
            if (!session.authenticated) {
                showPairing();
                return;
            }
            state.csrf = session.csrf || state.csrf;
        } catch (error) {
            showPairing(error.message);
            return;
        }
        poll();
        if (!reducedMotion) {
            setInterval(() => {
                state.frame++;
                for (const element of document.querySelectorAll('.badge.working')) element.classList.toggle('alt', state.frame % 2 === 1);
            }, 700);
        }
    }

    boot();
})();
