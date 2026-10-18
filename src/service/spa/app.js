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
        /** Open chat: its name, loaded messages and the message count they reflect. */
        chat: null,
        /** Agents offered for a new chat (loaded on demand). */
        agents: null,
        newChat: false,
        showAllChats: false,
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

    /** Loads (or reloads) the open chat; opening marks it read but never answers anything. */
    async function loadChat(name) {
        try {
            const detail = await api(`/api/chats/${encodeURIComponent(name)}`);
            const changed = !state.chat || state.chat.name !== detail.summary.name || state.chat.detail?.messages.length !== detail.messages.length || state.chat.detail?.summary.status !== detail.summary.status;
            state.chat = { name: detail.summary.name, detail };
            if (changed) await api(`/api/chats/${encodeURIComponent(detail.summary.name)}/read`, { method: 'POST' }).catch(() => undefined);
        } catch (error) {
            toast(`Chat unavailable: ${error.message}`);
            state.chat = null;
        }
        render(state.snapshot);
    }

    function openChat(name) {
        state.newChat = false;
        state.chat = { name, detail: null };
        render(state.snapshot);
        loadChat(name);
    }

    /** Sends one message (an answer is an ordinary committed chat message); stale views are rejected by the service. */
    async function sendMessage(name, text, expected) {
        if (state.busy.has(name)) return;
        state.busy.add(name);
        render(state.snapshot);
        try {
            const result = await api(`/api/chats/${encodeURIComponent(name)}/messages`, { method: 'POST', body: { text, expected } });
            state.drafts.delete(`chat:${name}`);
            toast(result.commit ? `Saved (${result.commit.slice(0, 8)}).` : 'Saved.');
        } catch (error) {
            toast(`Not sent: ${error.message}`);
        } finally {
            state.busy.delete(name);
        }
        if (state.chat && state.chat.name === name) await loadChat(name);
        else render(state.snapshot);
    }

    async function startChat(agent, text) {
        if (state.busy.has('new-chat')) return;
        state.busy.add('new-chat');
        render(state.snapshot);
        try {
            // One request key per draft: a retried request returns the chat it already created.
            state.newChatKey = state.newChatKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            const result = await api('/api/chats', { method: 'POST', body: { agent, text, requestKey: state.newChatKey } });
            state.newChatKey = null;
            state.drafts.delete('chat:new');
            toast(`Started “${result.name}”.`);
            openChat(result.name);
        } catch (error) {
            toast(`Not started: ${error.message}`);
        } finally {
            state.busy.delete('new-chat');
            render(state.snapshot);
        }
    }

    async function showNewChat() {
        state.newChat = true;
        state.chat = null;
        render(state.snapshot);
        if (!state.agents) {
            try {
                state.agents = (await api('/api/chat-agents')).agents;
            } catch (error) {
                toast(`Agents unavailable: ${error.message}`);
            }
            render(state.snapshot);
        }
    }

    /** Text area with a persistent draft (survives re-renders and reconnects). */
    function composer(key, label, onSend, disabled) {
        const field = h('textarea', { 'data-draft': key, 'aria-label': label, placeholder: 'Type a message…', disabled });
        field.value = state.drafts.get(key) || '';
        field.addEventListener('input', () => state.drafts.set(key, field.value));
        field.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (field.value.trim()) onSend(field.value);
            }
        });
        return h('div', {}, field, h('div', { className: 'row', style: 'margin-top:8px' }, h('button', { className: 'primary', disabled, onclick: () => (field.value.trim() ? onSend(field.value) : field.focus()) }, 'Send'), h('span', { className: 'muted' }, 'Ctrl+Enter sends')));
    }

    function renderAttention(snapshot) {
        const waiting = snapshot.chats.waiting;
        const card = h('section', { className: `card attention ${waiting.length ? '' : 'empty'}`, 'aria-label': 'Needs your attention' });
        card.append(h('h2', {}, h('span', {}, waiting.length ? `Needs your attention (${waiting.length})` : 'Needs your attention'), waiting.length ? pill('waiting for you', 'warn') : null));
        if (!waiting.length) {
            card.append(h('p', { className: 'muted' }, 'No agent is waiting for you.'));
            return card;
        }
        for (const chat of waiting) {
            const busy = state.busy.has(chat.name);
            const item = h('article', { className: 'request', 'data-chat': chat.name });
            item.append(h('div', { className: 'reason' }, `${chat.awaiting ? chat.awaiting.sender : chat.agent || 'An agent'} asks in “${chat.name}”`));
            item.append(h('div', { className: 'meta' }, `${chat.members.join(', ')}${chat.links.length ? ` · ${chat.links.join(', ')}` : ''}${chat.last ? ` · ${time(chat.last.at)}` : ''}${chat.unread ? ` · ${chat.unread} unread` : ''}`));
            if (chat.awaiting) item.append(h('div', { className: 'question' }, chat.awaiting.text));
            const actions = h('div', { className: 'choices', role: 'group', 'aria-label': 'Answers' });
            for (const choice of (chat.awaiting && chat.awaiting.choices) || []) actions.append(h('button', { className: 'primary', disabled: busy, onclick: () => sendMessage(chat.name, choice, chat.messages) }, choice));
            actions.append(h('button', { onclick: () => openChat(chat.name) }, 'Open conversation'));
            item.append(actions);
            card.append(item);
        }
        return card;
    }

    function renderThread(snapshot) {
        const chat = state.chat;
        const card = h('section', { className: 'card chats thread', 'aria-label': 'Conversation' });
        if (!chat.detail) {
            card.append(h('h2', {}, h('span', {}, chat.name)), h('p', { className: 'muted' }, 'Loading…'));
            return card;
        }
        const { summary, messages } = chat.detail;
        card.append(
            h(
                'h2',
                {},
                h('span', {}, summary.name),
                h('span', { className: 'row' }, pill(summary.status === 'waiting-for-user' ? 'waiting for you' : summary.status, summary.status === 'waiting-for-user' ? 'warn' : summary.status === 'open' ? 'ok' : ''), h('button', { onclick: () => ((state.chat = null), render(state.snapshot)) }, 'Close')),
            ),
        );
        card.append(h('div', { className: 'meta muted' }, `${summary.members.join(', ')} · ${summary.path}${summary.links.length ? ` · links ${summary.links.join(', ')}` : ''}`));
        const thread = h('div', { className: 'messages', role: 'log', 'aria-live': 'polite' });
        for (const message of messages) {
            const user = message.sender.replace(/^@/, '').toLowerCase() === 'user';
            thread.append(
                h(
                    'article',
                    { className: `message ${user ? 'user' : 'agent'}` },
                    h('div', { className: 'meta' }, h('strong', {}, user ? 'You' : message.sender), ` · ${time(message.at)}`),
                    h('div', { className: 'text' }, message.text),
                    message.choices && message.choices.length ? h('div', { className: 'muted' }, `Offered: ${message.choices.join(' | ')}`) : null,
                ),
            );
        }
        const last = messages[messages.length - 1];
        if (last && last.sender.replace(/^@/, '').toLowerCase() === 'user' && summary.status === 'open') thread.append(h('p', { className: 'muted' }, `Waiting for ${summary.agent || 'the agent'}’s reply…`));
        card.append(thread);
        requestAnimationFrame(() => {
            thread.scrollTop = thread.scrollHeight;
        });
        const busy = state.busy.has(summary.name);
        if (summary.humanFacing) {
            if (summary.awaiting && summary.awaiting.choices && summary.awaiting.choices.length && summary.status === 'waiting-for-user') {
                card.append(h('div', { className: 'choices', role: 'group', 'aria-label': 'Offered answers' }, summary.awaiting.choices.map((choice) => h('button', { className: 'primary', disabled: busy, onclick: () => sendMessage(summary.name, choice, messages.length) }, choice))));
            }
            card.append(composer(`chat:${summary.name}`, `Message to ${summary.agent || 'the agent'}`, (text) => sendMessage(summary.name, text, messages.length), busy));
        } else card.append(h('p', { className: 'muted' }, 'A task-internal consultation between agents (read-only).'));
        return card;
    }

    function renderNewChat() {
        const card = h('section', { className: 'card chats', 'aria-label': 'New chat' });
        card.append(h('h2', {}, h('span', {}, 'New chat'), h('button', { onclick: () => ((state.newChat = false), render(state.snapshot)) }, 'Cancel')));
        if (!state.agents) {
            card.append(h('p', { className: 'muted' }, 'Loading agents…'));
            return card;
        }
        const select = h('select', { 'aria-label': 'Agent', 'data-draft': 'chat:new-agent' });
        const ordinary = state.agents.filter((agent) => agent.group === 'ordinary');
        const more = state.agents.filter((agent) => agent.group !== 'ordinary');
        if (ordinary.length) select.append(h('optgroup', { label: 'Project agents' }, ordinary.map((agent) => h('option', { value: agent.reference }, agent.name))));
        if (more.length) select.append(h('optgroup', { label: 'More: hidden/core agents and Expert' }, more.map((agent) => h('option', { value: agent.reference }, agent.name))));
        if (state.drafts.get('chat:new-agent')) select.value = state.drafts.get('chat:new-agent');
        select.addEventListener('change', () => state.drafts.set('chat:new-agent', select.value));
        card.append(h('div', { className: 'row' }, h('label', {}, 'Talk to ', select)));
        card.append(composer('chat:new', 'First message', (text) => startChat(select.value, text), state.busy.has('new-chat')));
        card.append(h('p', { className: 'muted' }, 'Every message is saved in chats/ and committed. Agents reply read-only and create ordinary tasks only when you ask for work.'));
        return card;
    }

    function renderChats(snapshot) {
        if (state.newChat) return renderNewChat();
        if (state.chat) return renderThread(snapshot);
        const chats = snapshot.chats;
        const card = h('section', { className: 'card chats', 'aria-label': 'Chats' });
        card.append(h('h2', {}, h('span', {}, `Chats (${chats.total}${chats.unread ? `, ${chats.unread} unread` : ''})`), h('button', { className: 'primary', onclick: showNewChat }, 'New chat')));
        if (!chats.recent.length) {
            card.append(h('p', { className: 'muted' }, 'No chats yet. Start one to ask an agent about the project or to plan work.'));
            return card;
        }
        const items = state.showAllChats ? chats.recent : chats.recent.slice(0, 6);
        card.append(
            h(
                'ul',
                { className: 'list' },
                items.map((chat) =>
                    h(
                        'li',
                        {},
                        h('a', { href: '#', className: 'title', onclick: (event) => (event.preventDefault(), openChat(chat.name)) }, chat.name, h('span', { className: 'why' }, `${chat.members.join(', ')}${chat.last ? ` · ${chat.last.sender}: ${chat.last.preview}` : ''}`)),
                        chat.status === 'waiting-for-user' ? pill('waiting for you', 'warn') : chat.unread ? pill(`${chat.unread} unread`, 'ok') : pill(chat.status, ''),
                    ),
                ),
            ),
        );
        if (chats.recent.length > 6) card.append(h('button', { onclick: () => ((state.showAllChats = !state.showAllChats), render(state.snapshot)) }, state.showAllChats ? 'Show fewer' : `Show all ${chats.recent.length}`));
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
                ...(current.trace ? [['Trace', current.trace]] : []),
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
        app.replaceChildren(renderAttention(snapshot), renderChats(snapshot), renderWork(snapshot), renderControls(snapshot), renderQueue(snapshot), renderActivity(snapshot), renderConnection(snapshot));
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
            ` · ptbk ${snapshot.engine.version} · ${snapshot.service.mode} · ${snapshot.service.state}${snapshot.service.commitMode === 'no-commit' ? ' · NO-COMMIT' : ''}${snapshot.chats.waiting.length ? ` · ${snapshot.chats.waiting.length} waiting for you` : ''} · ${live} · observed ${time(snapshot.observedAt)}`,
        );
        document.title = `${snapshot.chats.waiting.length ? `(${snapshot.chats.waiting.length}) ` : ''}${snapshot.project.name} · Promptbook`;
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
                // New messages in the open chat arrive without stealing focus or drafts.
                if (state.chat && state.chat.detail) {
                    const summary = snapshot.chats.recent.find((chat) => chat.name === state.chat.name);
                    if (summary && (summary.messages !== state.chat.detail.messages.length || summary.status !== state.chat.detail.summary.status)) loadChat(state.chat.name);
                }
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
