'use strict';

/*
 * Promptbook browser dashboard: a small framework-free client of the project service API.
 * All live data comes from /api/state (long polling); all controls go through the API.
 * The root is a no-scroll home screen of tiles; each tile opens a full page (#/<page>, Back returns).
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
        showMoreHarnesses: false,
        busy: new Set(),
        frame: 0,
        /** Open chat: its name, loaded messages and the message count they reflect. */
        chat: null,
        /** Agents offered for a new chat (loaded on demand). */
        agents: null,
        /** New-chat entry: 'entry' (Chat with Chatter / Choose another agent) or 'all' (every valid alternative). */
        newChat: false,
        showAllChats: false,
        /** Viewer-local detail panels (open state is a viewer choice; never engine state). */
        details: { execution: true, browser: false, sync: true },
        /** The open dashboard page (null: the home screen); mirrored in the URL fragment for Back. */
        page: null,
        /** The home tile holding the operator's focus (never moved by attention). */
        focus: 'work',
        /** The active unit selected on the work page (concurrent work). */
        workSelected: null,
        /** Viewer-local attention: domain → { key, tone, since, seen } (seen once the operator was clearly active). */
        attention: new Map(),
        /** Meaningful interactions with this page (keys, clicks) since it opened. */
        interactions: 0,
        /** The complete task inventory in the viewer's chosen order (loaded on the Tasks page). */
        tasks: { items: null, sort: 'smart', descending: false, revision: -1 },
        /** Health remediation preview and swap plan shown on the Health page. */
        healthCache: null,
        healthSwap: null,
        /** Agent preselected for a new chat from the Agents page (by name). */
        newChatAgent: null,
        /** Tool names whose details are expanded (viewer-local). */
        toolDetails: new Set(),
        /** The open add/modify tool form: { mode, name?, values } (values survive re-renders; secrets stay in memory only). */
        toolForm: null,
        /** A tool change waiting for an explicit acknowledgement: { request, requirements }. */
        toolAck: null,
        /** Whether the add form lists every harness variant (featured first, then More). */
        showAllVariants: false,
    };

    /** Creates a DOM element; text children are always inserted as text (never parsed as HTML). */
    function h(tag, attributes, ...children) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes || {})) {
            if (value === undefined || value === null || value === false) continue;
            if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
            else if (key === 'className') element.className = value;
            else if (key === 'style') {
                // Through CSSOM: the page's Content-Security-Policy blocks inline style attributes.
                for (const declaration of String(value).split(';')) {
                    const colon = declaration.indexOf(':');
                    if (colon > 0) element.style.setProperty(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
                }
            } else element.setAttribute(key, value === true ? '' : String(value));
        }
        // Nested child lists (e.g. [dt, dd] pairs of a definition list) are flattened completely.
        for (const child of children.flat(Infinity)) {
            if (child === undefined || child === null || child === false) continue;
            element.append(child instanceof Node ? child : document.createTextNode(String(child)));
        }
        return element;
    }

    /** Calls the local API with the in-memory browser capability. */
    async function api(path, options = {}) {
        const response = await fetch(path, {
            method: options.method || 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-PTBK-Client': 'dashboard', ...(state.csrf ? { 'X-PTBK-CSRF': state.csrf } : {}) },
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

    /** Runs one of the engine's shared control operations through the API and reports its real outcome. */
    async function control(action, confirmText, extra) {
        if (confirmText && !window.confirm(confirmText)) return;
        const key = `control:${action}`;
        if (state.busy.has(key)) return;
        state.busy.add(key);
        try {
            const result = await api('/api/control', { method: 'POST', body: { action, ...(extra || {}) } });
            toast(result.outcome);
        } catch (error) {
            toast(`Not applied: ${error.message}`);
        } finally {
            state.busy.delete(key);
        }
    }

    /** Lifecycle actions applicable to the live service state (the same operations as ptbk pause/resume/stop/restart). */
    function lifecycleActions(snapshot) {
        const service = snapshot.service;
        const lifecycle = service.lifecycle || {};
        const stateName = service.state === 'paused' ? 'pause' : service.state;
        if (stateName === 'stopped' || stateName === 'finished') return [];
        const actions = [];
        const restartable = lifecycle.restartable !== false && service.mode !== 'run';
        const pending = lifecycle.intent === 'restart' ? 'restart' : 'stop';
        // Pause/Resume manage only the manual reason; Health reasons resolve (or are overridden) on the Health page.
        const manual = manualPause(snapshot);
        const health = healthReasons(snapshot).length;
        if (stateName === 'running' || ((stateName === 'pause' || stateName === 'pausing') && !manual)) actions.push({ action: 'pause', label: stateName === 'running' ? 'Pause' : 'Pause manually too' });
        if (stateName === 'pause' && manual) actions.push({ action: 'resume', label: health ? 'Remove manual pause' : 'Resume', primary: true });
        if (stateName === 'pausing' && manual) actions.push({ action: 'resume', label: 'Cancel pause' });
        if (stateName === 'stopping' && lifecycle.cancellable) {
            actions.push({ action: 'resume', label: `Cancel ${pending}`, primary: true });
            actions.push({ action: 'pause', label: 'Pause instead', confirm: `Cancel the pending ${pending} and pause instead?`, extra: { replaceStop: true, revision: lifecycle.revision } });
        }
        if (stateName !== 'stopping' || (lifecycle.intent === 'restart' && lifecycle.cancellable)) {
            actions.push({ action: 'stop', label: stateName === 'pausing' ? 'Stop instead' : 'Stop (graceful)', confirm: 'Stop the service after active work settles? Every viewer shares this engine; closing this page does not stop it.' });
        }
        if (restartable && stateName !== 'stopping') actions.push({ action: 'restart', label: 'Restart', confirm: 'Restart the service? Active work finishes first; then exactly one replacement starts with the same configuration.' });
        if (lifecycle.intent !== 'force-stop') actions.push({ action: 'force-stop', label: 'Force stop', danger: true, confirm: 'Force stop now? Owned work is interrupted immediately (recoverable, never marked done).' });
        return actions;
    }

    /** Whether the ordinary manual pause reason is active (older engines report only the state). */
    function manualPause(snapshot) {
        const reasons = snapshot.service.pauseReasons;
        if (!reasons) return snapshot.service.state === 'pause' || snapshot.service.state === 'pausing';
        return reasons.some((reason) => reason.kind === 'manual');
    }

    /** Active pause reasons of the Health sub-engine. */
    function healthReasons(snapshot) {
        return (snapshot.service.pauseReasons || []).filter((reason) => reason.kind === 'health');
    }

    /** What the live service state means (never a fifth "stopped" live state). */
    function lifecycleText(snapshot) {
        const service = snapshot.service;
        const lifecycle = service.lifecycle || {};
        const running = activeWork(snapshot).filter((item) => item.kind !== 'chat');
        const task = running.length === 1 ? `“${running[0].taskTitle}”` : running.length ? `${running.length} active tasks` : 'active work';
        const health = healthReasons(snapshot);
        const byHealth = health.length ? `Paused by Health (${health.map((reason) => `${reason.severity}: ${reason.summary}`).join('; ')})${manualPause(snapshot) ? ' and manually' : ''}` : '';
        switch (service.state === 'paused' ? 'pause' : service.state) {
            case 'running':
                return snapshot.current ? 'New tasks start when ready.' : 'Idle is normal; new tasks start when ready.';
            case 'pausing':
                return health.length ? `${task} finishes first. ${byHealth}.` : `${task} finishes first; then no task starts until you resume.`;
            case 'pause':
                return health.length ? `${byHealth}; scheduling resumes once every reason is gone.` : 'Alive and controllable; no task runs or starts.';
            case 'stopping':
                if (lifecycle.intent === 'force-stop') return 'Force stop: owned work is being interrupted (recoverable).';
                if (lifecycle.shutdown) return lifecycle.intent === 'restart' ? 'Shutting down for a restart; one replacement starts next.' : 'Shutting down.';
                return `${task} finishes first; then the service ${lifecycle.intent === 'restart' ? 'restarts (exactly one replacement)' : 'exits'}.`;
            case 'stopped':
                return 'No engine is running (an observation, not a live state). Start it with ptbk start.';
            default:
                return 'The finite run ended.';
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
            // Without an explicit agent the service uses Chatter (diagnosed, never silently replaced).
            const result = await api('/api/chats', { method: 'POST', body: { ...(agent ? { agent } : {}), text, requestKey: state.newChatKey } });
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
        state.newChat = 'entry';
        state.focusChatter = true;
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
            item.append(h('div', { className: 'reason' }, `${chat.awaiting ? chat.awaiting.sender : chat.agent || 'An agent'} asks in “${chat.title || chat.name}”`));
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

    /** Human duration (seconds/minutes), as measured, never invented. */
    function duration(ms) {
        if (!Number.isFinite(ms) || ms < 0) return '';
        const seconds = Math.round(ms / 1000);
        return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
    }

    /**
     * Collapses each final reply's preceding progress messages (same sender) into one Thinking item, as the engine's
     * shared view model does; progress without a final reply stays visible.
     */
    function collapseThinking(messages) {
        const key = (sender) => sender.replace(/^[@{]|}$/g, '').toLowerCase();
        const groups = new Map();
        const collapsed = new Set();
        messages.forEach((message, index) => {
            if (message.phase !== 'final') return;
            const members = [];
            for (let previous = index - 1; previous >= 0; previous--) {
                const candidate = messages[previous];
                if (key(candidate.sender) !== key(message.sender)) continue;
                if (candidate.phase !== 'progress') break;
                members.unshift(previous);
            }
            if (!members.length) return;
            groups.set(members[0], { members, final: message });
            for (const member of members) collapsed.add(member);
        });
        const items = [];
        messages.forEach((message, index) => {
            const group = groups.get(index);
            if (group) items.push({ kind: 'thinking', sender: message.sender, elapsedMs: Date.parse(group.final.at) - Date.parse(message.at), messages: group.members.map((member) => messages[member]) });
            else if (!collapsed.has(index)) items.push({ kind: 'message', message });
        });
        return items;
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
                // The evolving title leads; the declared name stays the inspectable, copyable identity.
                h('span', {}, summary.title || summary.name),
                h('span', { className: 'row' }, pill(summary.status === 'waiting-for-user' ? 'waiting for you' : summary.status, summary.status === 'waiting-for-user' ? 'warn' : summary.status === 'open' ? 'ok' : ''), h('button', { onclick: () => ((state.chat = null), render(state.snapshot)) }, 'Close')),
            ),
        );
        if (summary.title && summary.title !== summary.name) card.append(h('div', { className: 'meta muted chat-name', title: 'The chat’s name (its identity)' }, `{${summary.name}}`));
        const persistence = summary.persistence ? (summary.persistence.state === 'failed' ? ` · saved, commit failing (${summary.persistence.failure || 'retrying'})` : ' · saved, commit pending') : '';
        card.append(h('div', { className: 'meta muted' }, `${summary.members.join(', ')} · ${summary.path}${summary.links.length ? ` · links ${summary.links.join(', ')}` : ''}${persistence}`));
        // Live task cards: work this chat created or links, with its actual state; the Tasks page has the details.
        const tasks = chat.detail.tasks || [];
        if (tasks.length) {
            card.append(
                h(
                    'div',
                    { className: 'task-cards', 'aria-label': 'Tasks of this chat' },
                    tasks.map((task) =>
                        h(
                            'div',
                            { className: `task-card ${task.state}` },
                            h('div', { className: 'row' }, pill(task.state, task.state === 'completed' ? 'ok' : task.state === 'failed' || task.state === 'blocked' ? 'bad' : task.state === 'waiting' ? 'warn' : ''), h('strong', {}, task.name)),
                            task.detail || task.agent ? h('div', { className: 'muted' }, [task.agent, task.detail ? task.detail.split('\n')[0] : null, task.commit ? `commit ${task.commit.slice(0, 8)}` : null].filter(Boolean).join(' · ')) : null,
                            h('a', { href: '#/tasks', onclick: () => openPage('tasks') }, 'Open in Tasks'),
                        ),
                    ),
                ),
            );
        }
        const thread = h('div', { className: 'messages', role: 'log', 'aria-live': 'polite' });
        for (const item of collapseThinking(messages)) {
            // A final reply's interim progress collapses into Thinking with its real duration; it can be expanded.
            if (item.kind === 'thinking') {
                thread.append(h('details', { className: 'thinking' }, h('summary', {}, `${item.sender} · Thinking${item.elapsedMs !== undefined ? ` · ${duration(item.elapsedMs)}` : ''}`), item.messages.map((message) => h('div', { className: 'text muted' }, message.text))));
                continue;
            }
            const message = item.message;
            const user = message.sender.replace(/^@/, '').toLowerCase() === 'user';
            thread.append(
                h(
                    'article',
                    { className: `message ${user ? 'user' : 'agent'}${message.phase === 'progress' ? ' progress' : ''}` },
                    h('div', { className: 'meta' }, h('strong', {}, user ? 'You' : message.sender), ` · ${time(message.at)}${message.phase === 'progress' ? ' · working…' : ''}`),
                    h('div', { className: 'text' }, message.text),
                    message.choices && message.choices.length ? h('div', { className: 'muted' }, `Offered: ${message.choices.join(' | ')}`) : null,
                ),
            );
        }
        // The reply being written now (the same in every client); the composer stays usable meanwhile.
        const live = chat.detail.live;
        if (live) {
            thread.append(
                h(
                    'article',
                    { className: 'message agent live' },
                    h('div', { className: 'meta' }, h('strong', {}, live.sender), ` · replying for ${duration(Date.now() - Date.parse(live.startedAt))}`),
                    live.activity.length ? h('div', { className: 'muted' }, live.activity.slice(-4).join(' · ')) : null,
                    live.text ? h('div', { className: 'text' }, live.text) : null,
                ),
            );
        }
        // The user's latest message still waits when only an unfinished turn's progress follows it.
        const answer = [...messages].reverse().find((message) => message.phase !== 'progress');
        const recheck = chat.detail.recheck;
        if (!live && recheck) thread.append(h('p', { className: 'muted' }, `The reply failed (${recheck.cause}). Automatic recheck at ${time(recheck.nextAt)}; writing again retries now.`));
        else if (!live && answer && answer.sender.replace(/^@/, '').toLowerCase() === 'user' && summary.status === 'open') thread.append(h('p', { className: 'muted' }, `Waiting for ${summary.agent || 'the agent'}’s reply…`));
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

    /**
     * New chat: first exactly two choices — Chat with Chatter (focused default) or Choose another agent — and only the
     * second lists every valid alternative (project agents, hidden/core agents and Expert).
     */
    function renderNewChat() {
        const card = h('section', { className: 'card chats', 'aria-label': 'New chat' });
        const back = state.newChat === 'all' || state.newChat === 'chatter' ? h('button', { onclick: () => ((state.newChat = 'entry'), (state.focusChatter = true), render(state.snapshot)) }, 'Back') : null;
        card.append(h('h2', {}, h('span', {}, 'New chat'), h('span', { className: 'row' }, back, h('button', { onclick: () => ((state.newChat = false), render(state.snapshot)) }, 'Cancel'))));
        if (!state.agents) {
            card.append(h('p', { className: 'muted' }, 'Loading agents…'));
            return card;
        }
        const chatter = state.agents.find((agent) => agent.group === 'chatter');
        const others = state.agents.filter((agent) => agent.group !== 'chatter');
        if (!chatter) {
            card.append(h('div', { className: 'notice error' }, 'Chatter (agents/.core/chatter.book), the default partner of new chats, is missing or invalid. Run `ptbk init` or `ptbk start` to restore it, or choose another agent explicitly below.'));
            if (state.newChat === 'entry') state.newChat = 'all';
        }
        if (state.newChat === 'entry' && chatter) {
            const primary = h('button', { className: 'primary', 'data-focus': 'chatter', onclick: () => ((state.newChat = 'chatter'), render(state.snapshot)) }, `Chat with ${chatter.name}`);
            card.append(
                h('div', { className: 'choices', role: 'group', 'aria-label': 'Who do you want to talk to?' }, primary, h('button', { onclick: () => ((state.newChat = 'all'), render(state.snapshot)) }, 'Choose another agent')),
                h('p', { className: 'muted' }, `${chatter.name} answers project questions, consults the right specialists for you and creates tasks only when you ask for work.`),
            );
            if (state.focusChatter) {
                state.focusChatter = false;
                requestAnimationFrame(() => primary.focus());
            }
            return card;
        }
        if (state.newChat === 'chatter' && chatter) {
            state.newChatAgent = null;
            card.append(h('p', {}, 'Talking to ', h('strong', {}, chatter.name)));
            card.append(composer('chat:new', `First message to ${chatter.name}`, (text) => startChat(chatter.reference, text), state.busy.has('new-chat')));
        } else {
            const select = h('select', { 'aria-label': 'Agent', 'data-draft': 'chat:new-agent' });
            // An agent chosen on the Agents page is preselected once.
            const preselected = state.newChatAgent && others.find((agent) => agent.name.toLowerCase() === state.newChatAgent.toLowerCase());
            if (preselected) state.drafts.set('chat:new-agent', preselected.reference);
            state.newChatAgent = null;
            const groups = [
                ['Project agents', others.filter((agent) => agent.group === 'ordinary')],
                ['Hidden/core agents', others.filter((agent) => agent.group === 'hidden')],
                ['Engine-provided', others.filter((agent) => agent.group === 'expert')],
            ];
            for (const [label, members] of groups) if (members.length) select.append(h('optgroup', { label }, members.map((agent) => h('option', { value: agent.reference }, agent.name))));
            if (state.drafts.get('chat:new-agent')) select.value = state.drafts.get('chat:new-agent');
            select.addEventListener('change', () => state.drafts.set('chat:new-agent', select.value));
            card.append(h('div', { className: 'row' }, h('label', {}, 'Talk to ', select)));
            card.append(composer('chat:new', 'First message', (text) => startChat(select.value, text), state.busy.has('new-chat')));
        }
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
                        h('a', { href: '#', className: 'title', onclick: (event) => (event.preventDefault(), openChat(chat.name)) }, chat.title || chat.name, h('span', { className: 'why' }, `${chat.title && chat.title !== chat.name ? `{${chat.name}} · ` : ''}${chat.members.join(', ')}${chat.last ? ` · ${chat.last.sender}: ${chat.last.preview}` : ''}`)),
                        chat.status === 'waiting-for-user' ? pill('waiting for you', 'warn') : chat.unread ? pill(`${chat.unread} unread`, 'ok') : pill(chat.status, ''),
                    ),
                ),
            ),
        );
        if (chats.recent.length > 6) card.append(h('button', { onclick: () => ((state.showAllChats = !state.showAllChats), render(state.snapshot)) }, state.showAllChats ? 'Show fewer' : `Show all ${chats.recent.length}`));
        return card;
    }

    /** Every active unit (an older engine reports only its single current task). */
    function activeWork(snapshot) {
        return snapshot.active || (snapshot.current ? [snapshot.current] : []);
    }

    /** The active unit the operator selected on the work page (the first by default). */
    function selectedWork(snapshot) {
        const active = activeWork(snapshot);
        return active.find((item) => (item.unit || item.taskRef) === state.workSelected) || active[0];
    }

    function renderWork(snapshot) {
        const card = h('section', { className: 'card work', 'aria-label': 'Current work' });
        const active = activeWork(snapshot);
        card.append(h('h2', {}, h('span', {}, 'Current work'), pill(snapshot.phase, snapshot.phase === 'blocked' ? 'bad' : active.length ? 'ok' : '')));
        const capacity = snapshot.capacity;
        if (capacity) card.append(h('p', { className: 'muted' }, `${capacity.active}/${capacity.limit} active · ${capacity.waiting} waiting · ${capacity.queued} queued (execution.maxConcurrentWork, shared by tasks and chats)`));
        if (active.length > 1) {
            // Concurrent work: one row per unit; selecting one shows its details below.
            card.append(
                h(
                    'ul',
                    { className: 'list work-units' },
                    active.map((item) =>
                        h(
                            'li',
                            { className: (item.unit || item.taskRef) === ((selectedWork(snapshot) || {}).unit || (selectedWork(snapshot) || {}).taskRef) ? 'selected' : '' },
                            h('a', { href: '#', className: 'title', onclick: (event) => (event.preventDefault(), (state.workSelected = item.unit || item.taskRef), render(state.snapshot)) }, item.kind === 'chat' ? `Chat: ${item.taskTitle}` : item.taskTitle, h('span', { className: 'why' }, `${item.kind === 'chat' ? 'reply' : item.agent.name} · ${item.phase}${item.detail ? ` · ${item.detail}` : ''}`)),
                        ),
                    ),
                ),
            );
        }
        const current = selectedWork(snapshot);
        if (current) {
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
                ...(current.tool ? [['Tool', `${current.harnessName} · ${current.tool}`]] : []),
                ...(current.trace ? [['Trace', current.trace]] : []),
                ['Phase', `${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}${current.detail ? ` · ${current.detail}` : ''}`],
                ['Since', time(current.startedAt)],
            ];
            if (current.target) rows.push(['Assigning', current.target.ref]);
            if (current.files && current.files.length) rows.push(['Files', current.files.join(', ')]);
            if (current.wait) rows.push(['Waiting', `${current.wait.reason}${current.wait.until ? ` · until ${time(current.wait.until)}` : ''}`]);
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
        // A significant browser failure stays visible while the browser details are collapsed.
        for (const browser of browsersOf(snapshot)) {
            if (!((browser.state === 'failed' || (browser.recovery && browser.recovery.state === 'blocked')) && browser.lastFailure)) continue;
            card.append(h('div', { className: 'notice error' }, h('strong', {}, `Browser ${browser.name}`), ` — ${browser.lastFailure.summary}`, browser.recovery && browser.recovery.state === 'retrying' ? h('div', { className: 'muted' }, 'Recovering automatically…') : null, h('div', { className: 'muted' }, 'Open the Tools page (browser details) to recheck, retry or restart it.')));
        }
        return card;
    }

    /** Labels of a model in one execution context (reported/requested/automatic/unknown stay distinct). */
    function modelText(model) {
        if (model.status === 'reported') return `${model.value} (reported by the harness)`;
        if (model.status === 'requested') return `${model.value} (requested; not yet confirmed)`;
        if (model.status === 'automatic') return 'automatic — harness default, concrete model not reported';
        return 'unknown — not reported';
    }

    /** Labels of a thinking level, in the harness's own terminology. */
    function thinkingText(thinking) {
        const term = thinking.term ? ` — ${thinking.term}` : '';
        if (thinking.status === 'requested') return `${thinking.value}${term}`;
        if (thinking.status === 'automatic') return `automatic (harness default, level not reported)${term}`;
        if (thinking.status === 'not-applicable') return 'not applicable — this harness has no thinking-level setting';
        return thinking.value ? `${thinking.value} (unverified)` : 'unknown — not reported';
    }

    /** One collapsible detail panel whose open state is a viewer-local choice. */
    function detailPanel(key, title, content) {
        const element = h('details', { className: 'card', open: state.details[key] }, h('summary', {}, title), content);
        element.addEventListener('toggle', () => {
            state.details[key] = element.open;
        });
        return element;
    }

    function renderExecutionDetails(snapshot) {
        // The selected unit's run among concurrent work (the first active one by default).
        const selected = selectedWork(snapshot);
        const execution = (selected && (snapshot.executions || []).find((candidate) => candidate.task.ref === selected.taskRef)) || snapshot.execution;
        if (!execution) return h('p', { className: 'muted' }, 'No execution yet in this service.');
        const rows = [
            [execution.status === 'active' ? 'Current run' : 'Last run (historical)', execution.status === 'active' ? `${execution.task.kind} · phase ${execution.phase || 'unknown'}${execution.attempt ? ` · attempt ${execution.attempt}/${execution.attemptBudget}` : ''}` : `${execution.outcome || ''} ${execution.endedAt ? `at ${time(execution.endedAt)}` : ''} — not running now`],
            ['Task', `${execution.task.title}${execution.task.source ? ` · ${execution.task.source}` : ''}`],
            ['Agent', `${execution.agent.name}${execution.agent.source ? ` · ${execution.agent.source}` : ''}`],
        ];
        for (const context of execution.contexts) {
            const prefix = context.role === 'consultation' ? `${context.by || '?'} → ${context.agent} (${context.state}): ` : '';
            rows.push([context.role === 'consultation' ? 'Consultation' : 'Harness', `${prefix}${context.harness.name}${context.harness.version ? ` ${context.harness.version}` : ''}${context.harness.tool ? ` · tool ${context.harness.tool}` : ''}`]);
            rows.push(['Model', `${prefix}${modelText(context.model)}${context.model.source ? ` · ${context.model.source}` : ''}`]);
            rows.push(['Thinking', `${prefix}${thinkingText(context.thinkingLevel)}${context.thinkingLevel.source ? ` · ${context.thinkingLevel.source}` : ''}`]);
        }
        return h('dl', { className: 'kv' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)]));
    }

    /** Every named browser tool the engine reports (older engines: the single project browser). */
    function browsersOf(snapshot) {
        return snapshot.browsers && snapshot.browsers.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : [];
    }

    function renderBrowserDetails(snapshot) {
        const browsers = browsersOf(snapshot);
        if (!browsers.length) return h('p', { className: 'muted' }, 'Browser information is not available from this service.');
        return h(
            'div',
            {},
            browsers.map((browser) => {
                const rows = [
                    ['Tool', `${browser.name} (${browser.variant}${browser.isEnabled ? '' : ', disabled'})${browser.inUse ? ' · in use' : ''}${browser.retained ? ' · current work keeps its acquired configuration' : ''}`],
                    ['Profile', `${browser.sourceLabel} (${browser.source})`],
                    ['Path', browser.profilePath],
                    ['Mode', `${browser.mode.requested}${browser.mode.actual && browser.mode.actual !== browser.mode.requested ? ` (actually ${browser.mode.actual})` : ''}${browser.mode.note ? ` · ${browser.mode.note}` : ''}`],
                    ['State', `${browser.state}${browser.pid ? ` · PID ${browser.pid}` : ''}`],
                    ['Ownership', `${browser.ownership.state}${browser.ownership.holder ? ` — ${browser.ownership.holder}` : ''}`],
                ];
                if (browser.executable) rows.push(['Browser', browser.executable]);
                if (browser.savedProfile) rows.push(['Saved', browser.savedProfile]);
                if (browser.pending) rows.push(['Pending', browser.pending]);
                if (browser.lastFailure) rows.push(['Last failure', `${time(browser.lastFailure.at)} ${browser.lastFailure.summary}${browser.lastFailure.evidence ? ` — ${browser.lastFailure.evidence}` : ''}`]);
                if (browser.recovery && (browser.recovery.state !== 'idle' || browser.recovery.attempts)) rows.push(['Recovery', `${browser.recovery.state}${browser.recovery.attempts ? ` · ${browser.recovery.attempts} attempt(s)` : ''}${browser.recovery.nextRetryAt ? ` · next ${time(browser.recovery.nextRetryAt)}` : ''}${browser.recovery.blocker ? ` · ${browser.recovery.blocker}` : ''}`]);
                if (browser.lastAction) rows.push(['Last action', `${browser.lastAction.action}: ${browser.lastAction.state} — ${browser.lastAction.outcome}`]);
                // The process belongs to the profile's pool shared with other projects (no master engine).
                const connections = browser.connections || [];
                if (connections.length) rows.push(['Engines', connections.map((connection) => (connection.self ? 'this project' : connection.project)).join(', ')]);
                if (browser.tabs && browser.tabs.length) rows.push(['Task tabs', browser.tabs.map((tab) => `${tab.task}${tab.url ? ` (${tab.url})` : ''}`).join('; ')]);
                const others = connections.filter((connection) => !connection.self).map((connection) => connection.project);
                const scope = others.length ? ` It also affects ${others.length} other connected project(s): ${others.join(', ')}.` : '';
                return h(
                    'div',
                    { className: 'browser-detail' },
                    h('h3', {}, browser.name),
                    h('dl', { className: 'kv' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])),
                    h(
                        'div',
                        { className: 'row', style: 'margin-top:8px', role: 'group', 'aria-label': `Recovery of ${browser.name}` },
                        h('button', { onclick: () => control('browser-recheck', null, { name: browser.name }) }, 'Recheck'),
                        h('button', { onclick: () => control('browser-retry', null, { name: browser.name }) }, 'Retry startup'),
                        h('button', { onclick: () => control('browser-restart', `Restart the browser “${browser.name}”? Its profile and sessions are kept; open task tabs end; the engine keeps running.${scope}`, { name: browser.name }) }, 'Restart browser'),
                        h('button', { className: 'danger', onclick: () => control('browser-kill', `Kill the browser “${browser.name}”? Its profile is kept and the next use starts it again.${scope}`, { name: browser.name }) }, 'Kill browser'),
                        h('button', { onclick: () => control('browser-test-tab', null, { name: browser.name }) }, 'Open test GitHub tab'),
                    ),
                );
            }),
            h('p', { className: 'muted' }, 'Recovery is automatic; these actions use the same engine-owned operations on the selected profile’s shared browser. Restart and kill affect every project connected to it; they never restart an engine or touch other browsers.'),
        );
    }

    /** Applies a saved tool change through the shared operation; protections become explicit choices here. */
    async function toolOperation(request) {
        const key = 'tool-operation';
        if (state.busy.has(key)) return;
        state.busy.add(key);
        try {
            const result = await api('/api/tools', { method: 'POST', body: request });
            if (result.status === 'needs-acknowledgement') {
                state.toolAck = { request, requirements: result.requirements };
            } else {
                state.toolAck = null;
                state.toolForm = null;
                toast(`${result.summary}${result.commit ? ` — committed ${result.commit.slice(0, 8)}` : ''}`);
            }
        } catch (error) {
            toast(`Not changed: ${error.message}`);
        } finally {
            state.busy.delete(key);
            render(state.snapshot);
        }
    }

    /** Inline choices for an in-use tool or the last enabled tool of a type (the same meanings as the CLI). */
    function renderToolAck() {
        const ack = state.toolAck;
        if (!ack) return null;
        const inUse = ack.requirements.find((item) => item.kind === 'in-use');
        const last = ack.requirements.find((item) => item.kind === 'last-of-type');
        const withAck = (extra) => ({ ...ack.request, acknowledgements: { ...(ack.request.acknowledgements || {}), ...extra } });
        const buttons = [];
        if (inUse) {
            buttons.push(h('button', { className: 'primary', onclick: () => toolOperation(withAck({ force: true })) }, 'Save now — current work finishes with the tool it acquired'));
            buttons.push(h('button', { className: 'danger', onclick: () => ((state.toolAck = null), control('force-stop', 'Force-stop the whole engine now? Owned work is interrupted (recoverable). The tool change is not applied: repeat it after the engine has stopped.')) }, 'Force-stop the whole engine instead'));
        } else if (last) {
            buttons.push(h('button', { className: 'primary', onclick: () => toolOperation(withAck({ confirmLastOfType: true })) }, 'Confirm'));
        }
        buttons.push(h('button', { onclick: () => ((state.toolAck = null), render(state.snapshot)) }, 'Keep things as they are'));
        return h('div', { className: 'notice error', role: 'alertdialog' }, ack.requirements.map((item) => h('p', {}, item.message)), inUse && last ? h('p', { className: 'muted' }, 'Both protections apply; each is confirmed separately (saving now does not confirm the last-tool warning).') : null, h('div', { className: 'row' }, buttons));
    }

    /** The editable endpoint value of a tool's displayed endpoint (`official …` → empty, `local …` → LOCAL, `custom URL` → URL). */
    function endpointValue(endpoint) {
        const text = String(endpoint || '');
        if (text.startsWith('local')) return 'LOCAL';
        if (text.startsWith('custom ')) return text.slice('custom '.length);
        return '';
    }

    /** One form field whose value survives live re-renders. */
    function formField(form, key, label, attributes) {
        const input = h('input', { type: attributes && attributes.type ? attributes.type : 'text', 'data-draft': `tool:${key}`, 'aria-label': label, placeholder: (attributes && attributes.placeholder) || '', autocomplete: attributes && attributes.type === 'password' ? 'new-password' : 'off' });
        input.value = form.values[key] || '';
        input.addEventListener('input', () => (form.values[key] = input.value));
        return h('label', { className: 'field' }, h('span', {}, label), input);
    }

    /** One select field whose value survives live re-renders. */
    function formSelect(form, key, label, options) {
        const select = h('select', { 'aria-label': label }, options.map((option) => (option.group ? h('optgroup', { label: option.group }, option.options.map((item) => h('option', { value: item.value }, item.label))) : h('option', { value: option.value }, option.label))));
        select.value = form.values[key] || (options[0].options ? options[0].options[0].value : options[0].value);
        form.values[key] = select.value;
        select.addEventListener('change', () => {
            form.values[key] = select.value;
            render(state.snapshot);
        });
        return h('label', { className: 'field' }, h('span', {}, label), select);
    }

    /** The add/modify form (fields of the selected type; the API key value is write-only). */
    function renderToolForm(snapshot) {
        const form = state.toolForm;
        if (!form) return null;
        const values = form.values;
        const type = values.type || 'HARNESS';
        const featured = (snapshot.harnesses || []).filter((harness) => harness.featured);
        const more = (snapshot.harnesses || []).filter((harness) => !harness.featured);
        const variantOf = (harness) => ({ value: harness.id.toUpperCase().replace(/-/g, '_'), label: harness.name });
        const fields = [];
        if (form.mode === 'add') {
            fields.push(formSelect(form, 'type', 'Type', [{ value: 'HARNESS', label: 'Harness' }, { value: 'BROWSER', label: 'Browser' }]));
            fields.push(
                type === 'BROWSER'
                    ? formSelect(form, 'variant', 'Variant', [{ value: 'CHROME', label: 'Chrome (or another Chrome-compatible browser)' }, { value: 'CHROMIUM', label: 'Chromium' }, { value: 'EDGE', label: 'Microsoft Edge' }])
                    : formSelect(form, 'variant', 'Variant', [{ group: 'Featured', options: featured.map(variantOf) }, ...(state.showAllVariants ? [{ group: 'More', options: more.map(variantOf) }] : [])]),
            );
            if (type !== 'BROWSER') fields.push(h('button', { type: 'button', onclick: () => ((state.showAllVariants = !state.showAllVariants), render(state.snapshot)) }, state.showAllVariants ? 'Featured only' : 'More…'));
            fields.push(formField(form, 'name', 'Name (kebab-case)', { placeholder: type === 'BROWSER' ? 'work-browser' : 'codex-company' }));
        } else fields.push(formField(form, 'rename', 'Name', {}));
        fields.push(formField(form, 'description', 'Description (optional)', {}));
        if (type === 'BROWSER') {
            fields.push(formSelect(form, 'profileSource', 'Profile', [{ value: 'MANAGED_GLOBAL', label: 'Dedicated Promptbook profile (shared by your projects)' }, { value: 'PROJECT', label: 'Isolated project profile (.ptbk/)' }, { value: 'USER_EXISTING', label: 'Your existing Chrome profile' }, { value: 'CUSTOM', label: 'Custom path' }]));
            if (values.profileSource === 'CUSTOM') fields.push(formField(form, 'profilePath', 'Profile path', {}));
            fields.push(formSelect(form, 'isHeadless', 'Window', [{ value: 'true', label: 'Headless (no window)' }, { value: 'false', label: 'Visible window' }]));
        } else {
            fields.push(formSelect(form, 'authentication', 'Authentication', [{ value: 'NATIVE', label: 'Native login / subscription' }, { value: 'API_KEY', label: 'API key (explicit paid access)' }]));
            if (values.authentication === 'API_KEY') {
                fields.push(formField(form, 'apiKeyEnv', 'Key variable (stored as ${{ env.NAME }})', { placeholder: 'COMPANY_OPENAI_API_KEY' }));
                fields.push(formField(form, 'apiKeyValue', 'New key value (optional; write-only, stored in the ignored .env)', { type: 'password' }));
            }
            // Model and thinking defaults belong to the harness plugin and Book MODEL; the tool only names its endpoint.
            fields.push(formField(form, 'baseUrl', 'Endpoint (empty = official; LOCAL or a base URL)', { placeholder: 'https://proxy.example/v1' }));
        }
        const submit = () => {
            const text = (key) => (values[key] || '').trim();
            const common = { ...(text('description') ? { description: text('description') } : {}) };
            const browserFields = { profileSource: values.profileSource || 'MANAGED_GLOBAL', ...(values.profileSource === 'CUSTOM' && text('profilePath') ? { profilePath: text('profilePath') } : {}), isHeadless: values.isHeadless !== 'false' };
            const harnessFields = { authentication: values.authentication || 'NATIVE', ...(values.authentication === 'API_KEY' && text('apiKeyEnv') ? { apiKeyEnv: text('apiKeyEnv') } : {}), ...(text('baseUrl') ? { baseUrl: text('baseUrl') } : {}) };
            const secret = values.authentication === 'API_KEY' && values.apiKeyValue ? { variable: text('apiKeyEnv'), value: values.apiKeyValue } : undefined;
            const operation =
                form.mode === 'add'
                    ? { kind: 'add', tool: { type, variant: values.variant, name: text('name'), ...common, ...(type === 'BROWSER' ? browserFields : harnessFields) } }
                    : { kind: 'modify', name: form.name, ...(text('rename') && text('rename') !== form.name ? { rename: text('rename') } : {}), changes: { description: text('description') || null, ...(type === 'BROWSER' ? { ...browserFields, ...(values.profileSource !== 'CUSTOM' ? { profilePath: null } : {}) } : { ...harnessFields, baseUrl: text('baseUrl') || null }) } };
            toolOperation({ operation, ...(secret ? { secret } : {}) });
        };
        return h('div', { className: 'tool-form', role: 'form', 'aria-label': form.mode === 'add' ? 'Add a tool' : `Modify ${form.name}` }, h('h3', {}, form.mode === 'add' ? 'Add a tool' : `Modify ${form.name}`), h('div', { className: 'fields' }, fields), h('div', { className: 'row' }, h('button', { className: 'primary', disabled: state.busy.has('tool-operation'), onclick: submit }, 'Save (commits immediately)'), h('button', { onclick: () => ((state.toolForm = null), render(state.snapshot)) }, 'Cancel')));
    }

    /** Compact tool inventory with primary enable/disable, reordering and secondary removal (shared operations). */
    function renderTools(snapshot) {
        const card = h('section', { className: 'card tools', 'aria-label': 'Tools' });
        const tools = snapshot.tools;
        const usable = tools ? tools.items.filter((item) => item.state === 'usable').length : 0;
        card.append(h('h2', {}, h('span', {}, 'Tools'), h('span', {}, tools ? `${usable} usable` : '')));
        if (!tools) {
            card.append(h('p', { className: 'muted' }, 'Tool information is not available from this service.'));
            return card;
        }
        if (tools.waiting) card.append(h('div', { className: 'notice error' }, h('strong', {}, 'New work waits for tools'), ` — ${tools.waiting.reason}`, h('div', { className: 'muted' }, `Action: ${tools.waiting.action}`), h('div', { className: 'muted' }, 'The engine keeps running; work resumes as soon as a tool is usable.')));
        for (const problem of tools.problems) card.append(h('div', { className: 'notice' }, problem));
        const ack = renderToolAck();
        if (ack) card.append(ack);
        const tone = { usable: 'ok', unavailable: 'bad', disabled: '', unknown: 'warn' };
        card.append(
            h(
                'ul',
                { className: 'list' },
                tools.items.map((item, index) =>
                    h(
                        'li',
                        {},
                        h(
                            'span',
                            { className: 'title' },
                            `${item.name} `,
                            h('span', { className: 'muted' }, `${item.variantLabel} · ${item.type}`),
                            item.inUse ? pill(item.retained ? 'in use (retained)' : 'in use', 'warn') : null,
                            h('span', { className: 'why' }, `${item.summary}${item.nextAction && item.state !== 'usable' ? ` → ${item.nextAction}` : ''}`),
                            state.toolDetails.has(item.name) ? h('dl', { className: 'kv' }, [['Enabled', item.isEnabled ? 'yes' : 'no (configuration and credentials are kept)'], ...Object.entries(item.fields), ...(item.description ? [['Description', item.description]] : [])].map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])) : null,
                        ),
                        h(
                            'span',
                            { className: 'row', role: 'group', 'aria-label': `Actions of ${item.name}` },
                            pill(item.isEnabled ? item.state : 'disabled', tone[item.isEnabled ? item.state : 'disabled']),
                            h('button', { className: 'primary', disabled: state.busy.has('tool-operation'), onclick: () => toolOperation({ operation: { kind: item.isEnabled ? 'disable' : 'enable', name: item.name } }) }, item.isEnabled ? 'Disable' : 'Enable'),
                            h('button', { title: 'Details', 'aria-expanded': state.toolDetails.has(item.name) ? 'true' : 'false', onclick: () => (state.toolDetails.has(item.name) ? state.toolDetails.delete(item.name) : state.toolDetails.add(item.name), render(state.snapshot)) }, 'Details'),
                            h('button', { onclick: () => ((state.toolForm = { mode: 'modify', name: item.name, values: { type: item.type, rename: item.name, description: item.description || '', profileSource: (item.fields.profile || 'MANAGED_GLOBAL').split(' ')[0], profilePath: (item.fields.profile || '').split(' ').slice(1).join(' '), isHeadless: item.fields.isHeadless || 'true', authentication: item.fields.authentication || 'NATIVE', apiKeyEnv: ((item.fields.apiKey || '').match(/env\.([A-Za-z_][A-Za-z0-9_]*)/) || [])[1] || '', baseUrl: endpointValue(item.fields.endpoint) } }), render(state.snapshot)) }, 'Modify'),
                            h('button', { title: 'Move up', 'aria-label': `Move ${item.name} up`, disabled: index === 0, onclick: () => toolOperation({ operation: { kind: 'move', name: item.name, before: tools.items[index - 1].name } }) }, '▲'),
                            h('button', { title: 'Move down', 'aria-label': `Move ${item.name} down`, disabled: index === tools.items.length - 1, onclick: () => toolOperation({ operation: { kind: 'move', name: item.name, after: tools.items[index + 1].name } }) }, '▼'),
                            h('button', { className: 'secondary danger', onclick: () => window.confirm(`Permanently remove the configuration of “${item.name}”? Disable keeps it instead. Browser profiles, native logins and .env history are never deleted.`) && toolOperation({ operation: { kind: 'remove', name: item.name } }) }, 'Remove'),
                        ),
                    ),
                ),
            ),
        );
        const form = renderToolForm(snapshot);
        if (form) card.append(form);
        else card.append(h('button', { onclick: () => ((state.toolForm = { mode: 'add', values: { type: 'HARNESS', authentication: 'NATIVE', profileSource: 'MANAGED_GLOBAL', isHeadless: 'true' } }), render(state.snapshot)) }, 'Add tool'));
        card.append(h('p', { className: 'muted' }, 'Saved changes are committed immediately and used by the running engine at once, also by the current task. API keys are stored only as ${{ env.NAME }} references; key values go to the ignored .env and are never shown again.'));
        return card;
    }

    /** Git synchronization, shown only while automatic synchronization is enabled. */
    function renderSync(snapshot) {
        const sync = snapshot.sync;
        if (!sync) return null;
        const card = h('section', { className: 'card sync', 'aria-label': 'Synchronization' });
        const tone = sync.state === 'synchronized' ? 'ok' : sync.state === 'never' ? '' : ['failed', 'conflict'].includes(sync.state) ? 'bad' : 'warn';
        card.append(h('h2', {}, h('span', {}, 'Synchronization'), pill(sync.phase === 'idle' ? sync.state : sync.phase, tone)));
        card.append(h('p', {}, `${sync.branch || '?'} ↔ ${sync.upstream || 'no tracking destination'}${sync.incoming !== undefined || sync.outgoing !== undefined ? ` · ${sync.incoming ?? '?'} incoming / ${sync.outgoing ?? '?'} outgoing` : ''}`));
        if (sync.reason) card.append(h('div', { className: 'notice' }, sync.reason));
        card.append(
            detailPanel(
                'sync',
                'Synchronization details',
                h('dl', { className: 'kv' }, [
                    ['Origin', sync.origin || 'not configured'],
                    ['Last attempt', time(sync.lastAttemptAt) || 'never'],
                    ['Integrated', time(sync.lastIntegrationAt) || 'unknown'],
                    ['Published', time(sync.lastPublicationAt) || 'unknown'],
                    ['Next attempt', time(sync.nextAttemptAt) || 'unknown'],
                    ...(sync.manual ? [['Manual', `${time(sync.manual.at)}: ${sync.manual.outcome}`]] : []),
                ].map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])),
            ),
        );
        card.append(h('div', { className: 'row' }, h('button', { disabled: state.busy.has('control:sync-now'), onclick: () => control('sync-now') }, 'Synchronize now')));
        card.append(h('p', { className: 'muted' }, 'One cycle of the engine’s own coordinator: fetch, visible merge when safe, then push. Failures never stop local work; history is never rewritten.'));
        return card;
    }

    function renderSettings(snapshot) {
        const editable = snapshot.settings.filter((setting) => setting.application !== 'restart');
        const keySelect = h('select', { 'aria-label': 'Setting' }, editable.map((setting) => h('option', { value: setting.key }, setting.key)));
        const valueInput = h('input', { type: 'text', 'aria-label': 'Value', placeholder: 'value, e.g. 30m, true, YES_AND_FIX' });
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

    /** Local HTTP connection details; opening this viewer never starts an engine. */
    function renderConnection(snapshot) {
        const { local } = snapshot.connection;
        return h('section', { className: 'card connection', 'aria-label': 'Connection' },
            h('h2', {}, 'Connection'),
            h('dl', { className: 'kv' }, h('dt', {}, 'Local'), h('dd', {},
                pill(local.state, local.state === 'ready' ? 'ok' : ''),
                local.url ? h('div', {}, h('a', { href: local.url }, local.url)) : null,
                local.error ? h('div', { className: 'muted' }, local.error) : null)),
            h('p', { className: 'muted' }, 'Available on this computer only.'));
    }

    /** Operational domains: home tiles and their pages (Synchronization only while autosync is enabled). */
    const DOMAINS = ['work', 'system', 'health', 'chats', 'tasks', 'agents', 'tools', 'wallet', 'results', 'usage', 'actions', 'history', 'files', 'connection', 'sync'];

    const TITLES = { work: 'Current work', system: 'System', health: 'Health', chats: 'Chats', tasks: 'Tasks', agents: 'Agents', tools: 'Tools', wallet: 'Wallet', results: 'Results and activity', usage: 'Usage', actions: 'Action log', history: 'History', files: 'Files', connection: 'Connection', sync: 'Synchronization' };

    /** Loads the History window (read-only: the engine never fetches or changes Git for it). */
    async function loadHistory() {
        if (state.historyLoading) return;
        state.historyLoading = true;
        try {
            const seen = state.snapshot && state.snapshot.history ? state.snapshot.history.last.sha : null;
            state.history = { ...(state.history || {}), view: await api('/api/history?limit=300'), error: null, seen };
        } catch (error) {
            state.history = { ...(state.history || {}), error: error.message };
        } finally {
            state.historyLoading = false;
        }
        render(state.snapshot);
    }

    /** Opens one commit's full original message and its verified provenance links. */
    async function openCommit(sha) {
        state.history = { ...(state.history || {}), open: sha, detail: null };
        render(state.snapshot);
        try {
            const detail = await api(`/api/history/commit?sha=${encodeURIComponent(sha)}`);
            if (state.history && state.history.open === sha) state.history = { ...state.history, detail };
        } catch (error) {
            if (state.history && state.history.open === sha) state.history = { ...state.history, detail: { error: error.message } };
        }
        render(state.snapshot);
    }

    /** The History page: Git messages and topology of the current branch, verified links, never a Git mutation. */
    function renderHistoryPage(snapshot) {
        const history = state.history || {};
        if (!history.view && !history.error) {
            loadHistory();
            return pageFrame('history', 'Reading the local Git history…', h('p', { className: 'muted' }, 'Loading…'));
        }
        if (history.error) return pageFrame('history', 'Git history', h('p', { className: 'warn' }, history.error));
        if (snapshot.history && history.seen && snapshot.history.last.sha !== history.seen) loadHistory();
        const view = history.view;
        if (view.problem) return pageFrame('history', view.branch || 'Git history', h('p', { className: 'muted' }, view.problem));
        const rows = view.rows.map((row) => {
            if (!row.commit) return h('li', { className: 'graph-only' }, h('code', { className: 'graph' }, row.graph));
            const commit = row.commit;
            const open = history.open === commit.sha;
            const detail = open ? history.detail : null;
            return h(
                'li',
                {},
                h('code', { className: 'graph' }, row.graph),
                ' ',
                h('button', { 'aria-expanded': String(open), onclick: () => (open ? ((state.history = { ...history, open: null }), render(state.snapshot)) : openCommit(commit.sha)) }, commit.kind === 'agent' ? `\`${commit.visual}\` ${commit.summary}` : commit.kind === 'legacy' ? `PTBK ${commit.summary}` : commit.summary),
                h('span', { className: 'muted' }, ` ${time(commit.at)}${commit.kind === 'foreign' ? ` · ${commit.author}` : ''}${commit.refs.length ? ` · ${commit.refs.join(', ')}` : ''}`),
                open
                    ? detail
                        ? detail.error
                            ? h('p', { className: 'warn' }, detail.error)
                            : h(
                                  'div',
                                  { className: 'commit-detail' },
                                  h('p', { className: 'muted' }, `${detail.sha} · ${detail.author} <${detail.email}> · ${detail.at}${detail.parents.length > 1 ? ` · merge of ${detail.parents.map((parent) => parent.slice(0, 10)).join(', ')}` : ''}`),
                                  ...detail.links.tasks.map((task) => h('p', {}, `Task {${task.name}} `, h('span', { className: task.path ? 'ok' : 'muted' }, task.path ? task.path : '(no longer in the project)'))),
                                  ...detail.links.chats.map((chat) => h('p', {}, `Chat {${chat.name}} `, chat.exists && chat.name !== 'Report' ? h('button', { onclick: () => (openPage('chats'), openChat(chat.name)) }, 'Open') : h('span', { className: 'muted' }, chat.exists ? 'report.book' : '(no longer in the project)'))),
                                  h('pre', { className: 'log' }, detail.message),
                              )
                        : h('p', { className: 'muted' }, 'Loading…')
                    : null,
            );
        });
        return pageFrame(
            'history',
            `${view.branch || 'HEAD'} · messages and topology, read-only (never fetches)`,
            h('ul', { className: 'list history' }, ...rows),
            view.more ? h('p', { className: 'muted' }, 'Older commits are not shown here.') : null,
            view.shallow ? h('p', { className: 'warn' }, 'This is a shallow clone: older history is not available locally.') : null,
        );
    }

    /** Opens a folder or file in Files (read-only, confined to nonhidden project paths). */
    async function openFiles(path, kind) {
        state.files = { ...(state.files || {}), loading: true };
        render(state.snapshot);
        try {
            if (kind === 'file') state.files = { ...state.files, loading: false, file: await api(`/api/files/file?path=${encodeURIComponent(path)}`), error: null };
            else state.files = { loading: false, path, folder: await api(`/api/files?path=${encodeURIComponent(path)}`), file: null, error: null };
        } catch (error) {
            state.files = { ...state.files, loading: false, error: error.message };
        }
        render(state.snapshot);
    }

    /** The Files page: a confined read-only project browser (no edit, save, rename or delete; video is not played). */
    function renderFilesPage() {
        const files = state.files;
        if (!files) {
            openFiles('');
            return pageFrame('files', 'Read-only project browser', h('p', { className: 'muted' }, 'Loading…'));
        }
        const path = files.path || '';
        const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        const crumbs = h('div', { className: 'row' }, h('strong', {}, `/${path}`), path ? h('button', { onclick: () => openFiles(parent) }, '↑ Up') : null);
        const list = files.folder
            ? h(
                  'ul',
                  { className: 'list' },
                  ...files.folder.entries.map((entry) =>
                      h(
                          'li',
                          {},
                          entry.type === 'link-outside'
                              ? h('span', { className: 'muted' }, `${entry.name} → outside the project (not followed)`)
                              : h('button', { onclick: () => openFiles(entry.path, entry.type === 'directory' ? 'folder' : 'file') }, entry.type === 'directory' ? `${entry.name}/` : entry.name),
                          entry.type === 'file' ? h('span', { className: 'muted' }, ` ${entry.kind} · ${entry.size} bytes${entry.modifiedAt ? ` · ${time(entry.modifiedAt)}` : ''}`) : null,
                      ),
                  ),
              )
            : null;
        const file = files.file;
        const viewer = file
            ? h(
                  'section',
                  { className: 'card', 'aria-label': `File ${file.path}` },
                  h('h2', {}, file.path),
                  h('p', { className: 'muted' }, `${file.kind} · ${file.size} bytes · read-only`),
                  file.image ? h('img', { src: file.image, alt: file.name, className: 'file-image' }) : null,
                  file.kind === 'image' && !file.image ? h('p', { className: 'muted' }, 'The image is too large to display here.') : null,
                  file.kind === 'video' ? h('p', { className: 'muted' }, 'Video playback is not part of Files; the file is identified only.') : null,
                  file.kind === 'binary' ? h('p', { className: 'muted' }, 'Binary file; not shown as text.') : null,
                  typeof file.text === 'string' ? h('pre', { className: 'log' }, file.text) : null,
                  file.truncated ? h('p', { className: 'warn' }, 'Only the beginning of this file is shown; the rest stays on disk.') : null,
              )
            : null;
        return pageFrame('files', 'Read-only · hidden and protected paths (.git, .ptbk, .env …) are never shown', crumbs, files.error ? h('p', { className: 'warn' }, files.error) : null, files.loading ? h('p', { className: 'muted' }, 'Loading…') : null, list, viewer);
    }

    /** An external action's outcome as a styled word (partial and uncertain stay explicit). */
    function outcomeBadge(outcome) {
        const className = outcome === 'confirmed' ? 'ok' : outcome === 'partial' || outcome === 'uncertain' ? 'warn' : 'muted';
        return h('span', { className }, outcome === 'not-performed' ? 'not performed' : outcome);
    }

    /** Loads one saved external-action record for the Action log page (read-only). */
    async function openActionRecord(path) {
        state.actionRecord = { path, loading: true };
        render(state.snapshot);
        try {
            const record = await api(`/api/actions/record?path=${encodeURIComponent(path)}`);
            if (state.actionRecord && state.actionRecord.path === path) state.actionRecord = { path, content: record.content };
        } catch (error) {
            if (state.actionRecord && state.actionRecord.path === path) state.actionRecord = { path, error: error.message };
        }
        render(state.snapshot);
    }

    /** The Action log page: saved records of external task actions, separate from runtime activity, traces and Git history. */
    function renderActionsPage(snapshot) {
        const actions = snapshot.actions;
        if (!actions) return pageFrame('actions', 'External actions of tasks', h('p', { className: 'muted' }, 'This engine does not report external actions yet.'));
        const open = state.actionRecord;
        const items = actions.recent.map((item) =>
            h(
                'li',
                {},
                h('button', { className: open && open.path === item.path ? 'primary' : '', 'aria-expanded': String(Boolean(open && open.path === item.path)), onclick: () => (open && open.path === item.path ? ((state.actionRecord = null), render(state.snapshot)) : openActionRecord(item.path)) }, `${item.operation}${item.service ? ` · ${item.service}` : ''}`),
                ' ',
                outcomeBadge(item.outcome),
                item.pending ? h('span', { className: 'warn' }, ' · not committed yet') : null,
                h('div', { className: 'muted' }, [item.at ? time(item.at) : '', item.target ? `→ ${item.target}` : '', item.agent || '', item.taskName || item.task].filter(Boolean).join(' · ')),
                open && open.path === item.path ? h('pre', { className: 'log', 'aria-label': `Record ${item.path}` }, open.loading ? 'Loading…' : open.error ? `The record could not be read: ${open.error}` : open.content) : null,
            ),
        );
        const summary = `${actions.total} recorded · saved Markdown in actions/, independent of traces${actions.pending ? ` · ${actions.pending} not committed` : ''}${actions.unresolved ? ` · ${actions.unresolved} without a reported outcome` : ''}`;
        return pageFrame(
            'actions',
            summary,
            items.length ? h('ul', { className: 'list' }, ...items) : h('p', { className: 'muted' }, 'No external action has been recorded. Records are captured from now on; earlier tasks may have external work without a record.'),
            actions.total > actions.recent.length ? h('p', { className: 'muted' }, `${actions.total - actions.recent.length} older record(s) are in actions/.`) : null,
        );
    }

    /** A compact token count (`950`, `12.3k`, `4.1M`). */
    function compactCount(value) {
        if (value < 1000) return String(Math.round(value));
        if (value < 1000000) return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`;
        return `${(value / 1000000).toFixed(value < 10000000 ? 1 : 0)}M`;
    }

    /** Billing mode and certainty of usage totals in words. */
    function billingMix(totals) {
        return [totals.billing.subscription ? `${totals.billing.subscription} subscription` : '', totals.billing.api ? `${totals.billing.api} API` : '', totals.billing.unknown ? `${totals.billing.unknown} unknown billing` : '', totals.coverage.unavailable ? `${totals.coverage.unavailable} without reported usage` : '']
            .filter(Boolean)
            .join(' · ') || 'no runs';
    }

    /** The last Usage view of this viewer (a local convenience; storage may be unavailable). */
    function usageView() {
        try {
            const saved = JSON.parse(localStorage.getItem('ptbk-usage-view') || '{}');
            return { grouping: ['agent', 'harness', 'model', 'work'].includes(saved.grouping) ? saved.grouping : 'agent', inclusive: saved.inclusive === true };
        } catch {
            return { grouping: 'agent', inclusive: false };
        }
    }

    /** Remembers the Usage view locally (never a project setting). */
    function rememberUsageView(view) {
        try {
            localStorage.setItem('ptbk-usage-view', JSON.stringify(view));
        } catch {
            // Private windows may refuse storage; the view still works.
        }
    }

    /** The Usage page: a simple seven-day summary with the chosen breakdown; billing mode and certainty stay visible. */
    function renderUsagePage(snapshot) {
        const usage = snapshot.usage;
        if (!usage) return pageFrame('usage', 'Model usage of this project', h('p', { className: 'muted' }, 'This engine does not report usage yet.'));
        const view = usageView();
        const rows = view.grouping === 'agent' ? (view.inclusive ? usage.breakdowns.agentInclusive : usage.breakdowns.agent) : usage.breakdowns[view.grouping];
        const tokens = (row) => `${compactCount(row.input)} in · ${compactCount(row.output)} out${row.cachedInput ? ` · ${compactCount(row.cachedInput)} cached` : ''}${row.reasoning ? ` · ${compactCount(row.reasoning)} reasoning` : ''}`;
        const money = (row) => [row.coverage.costReported ? `$${row.reportedCostUsd.toFixed(2)} reported by providers` : '', row.calculated.apiUsd ? `$${row.calculated.apiUsd.toFixed(2)} API${row.calculated.estimated ? ' (partly estimated)' : ''}` : '', row.calculated.subscriptionEquivalentUsd ? `$${row.calculated.subscriptionEquivalentUsd.toFixed(2)} token-price equivalent of subscription work` : ''].filter(Boolean).join(' · ');
        const choose = (changes) => {
            rememberUsageView({ ...view, ...changes });
            render(state.snapshot);
        };
        const groupings = { agent: 'Agent', harness: 'Harness', model: 'Model', work: 'Kind of work' };
        const controls = h(
            'div',
            { className: 'row', role: 'group', 'aria-label': 'Group usage by' },
            ...Object.entries(groupings).map(([value, label]) => h('button', { className: value === view.grouping ? 'primary' : '', 'aria-pressed': String(value === view.grouping), onclick: () => choose({ grouping: value }) }, label)),
            view.grouping === 'agent' ? h('button', { 'aria-pressed': String(view.inclusive), onclick: () => choose({ inclusive: !view.inclusive }) }, view.inclusive ? 'Own work only' : 'Include initiated work') : null,
        );
        const total = h('section', { className: 'card', 'aria-label': 'Total' }, h('h2', {}, `Last ${usage.days} days`), h('p', {}, usage.total.units ? `${tokens(usage.total)} · ${usage.total.units} runs` : 'No model usage.'), money(usage.total) ? h('p', {}, money(usage.total)) : null, h('p', { className: 'muted' }, billingMix(usage.total)));
        const table = h(
            'section',
            { className: 'card', 'aria-label': 'Breakdown' },
            h('h2', {}, view.grouping === 'agent' && view.inclusive ? 'By agent, including work it initiated (rows overlap)' : `By ${groupings[view.grouping].toLowerCase()}`),
            rows.length
                ? h('ul', { className: 'list' }, ...rows.map((row) => h('li', {}, h('strong', {}, row.label), h('span', {}, ` ${tokens(row)} · ${row.units} runs`), h('div', { className: 'muted' }, [money(row), billingMix(row)].filter(Boolean).join(' · ')))))
                : h('p', { className: 'muted' }, 'Nothing in this period.'),
        );
        return pageFrame('usage', 'Totals count every consumption once, from durable raw usage; missing usage is shown, never counted as zero', controls, total, table);
    }

    /** Interactions after a new attention item appeared that show the operator is active here (it then settles). */
    const ATTENTION_SETTLE_INTERACTIONS = 3;

    /** The tiles of a snapshot. */
    function homeTiles(snapshot) {
        return DOMAINS.filter((domain) => domain !== 'sync' || snapshot.sync);
    }

    /** The page named by the URL fragment (`#/health`), or null for the home screen. */
    function routeFromHash() {
        const match = /^#\/([a-z]+)$/.exec(location.hash);
        return match && DOMAINS.includes(match[1]) ? match[1] : null;
    }

    /** Opens a domain page (a history entry, so browser Back returns home); viewing never changes the engine. */
    function openPage(domain) {
        const item = state.attention.get(domain);
        if (item) item.seen = true;
        state.focus = domain;
        state.page = domain;
        history.pushState({ page: domain }, '', `#/${domain}`);
        if (domain === 'tasks') loadTasks(true);
        render(state.snapshot);
        window.scrollTo(0, 0);
    }

    /** Returns to the home screen (Back control, Escape or browser history). */
    function goHome() {
        if (history.state && history.state.page) history.back();
        else {
            state.page = null;
            history.replaceState(null, '', location.pathname + location.search);
            render(state.snapshot);
        }
    }

    /** Re-derives viewer-local attention from the engine's shared per-domain attention. */
    function updateAttention(snapshot) {
        const current = snapshot.attention || {};
        for (const domain of [...state.attention.keys()]) if (!current[domain]) state.attention.delete(domain);
        for (const [domain, item] of Object.entries(current)) {
            const previous = state.attention.get(domain);
            if (!previous || previous.key !== item.key) state.attention.set(domain, { key: item.key, tone: item.tone, since: state.interactions, seen: false });
            else previous.tone = item.tone;
        }
    }

    /** A meaningful interaction: unseen attention settles once the operator is clearly active (never by time alone). */
    function interacted() {
        state.interactions++;
        let changed = false;
        for (const item of state.attention.values()) {
            if (!item.seen && state.interactions - item.since >= ATTENTION_SETTLE_INTERACTIONS) {
                item.seen = true;
                changed = true;
            }
        }
        if (changed && !state.page) render(state.snapshot);
    }

    /** Formats MiB for health values. */
    function mib(value) {
        if (value === undefined || value === null) return 'unknown';
        if (value >= 10240) return `${(value / 1024).toFixed(0)} GiB`;
        if (value >= 1024) return `${(value / 1024).toFixed(1)} GiB`;
        return `${Math.round(value)} MiB`;
    }

    /** The smallest useful summary of a tile (never the complete domain). */
    function tileSummary(snapshot, domain) {
        const current = snapshot.current;
        switch (domain) {
            case 'work': {
                const active = activeWork(snapshot);
                if (active.length > 1) {
                    const capacity = snapshot.capacity;
                    return [h('strong', {}, `${active.length}${capacity ? `/${capacity.limit}` : ''} active${capacity && capacity.queued ? ` · ${capacity.queued} queued` : ''}`), ...active.map((item) => (item.kind === 'chat' ? h('span', {}, `Chat: ${item.taskTitle}`) : h('span', { className: 'row' }, badge(item.agent, true), item.taskTitle)))];
                }
                if (current) return [h('span', { className: 'row' }, badge(current.agent, true), h('strong', {}, current.agent.name), h('span', { className: 'muted' }, ACTIVITY_LABEL[current.agent.activity] || current.agent.activity)), current.taskTitle, h('span', { className: 'muted' }, `${current.phase}${current.attempt ? ` · attempt ${current.attempt}/${current.attemptBudget}` : ''}`)];
                if (snapshot.blockers.length) return [h('strong', { className: 'bad' }, snapshot.blockers[0].title), h('span', { className: 'muted' }, snapshot.blockers[0].action || snapshot.blockers[0].reason)];
                return [h('strong', {}, snapshot.phase), snapshot.wait ? h('span', { className: 'muted' }, snapshot.wait.reason) : null];
            }
            case 'system': {
                const stateName = snapshot.service.state;
                const health = healthReasons(snapshot);
                return [
                    pill(stateName, stateName === 'running' ? 'ok' : stateName === 'stopping' ? 'bad' : 'warn'),
                    health.length ? `Paused by Health (${health.map((reason) => reason.severity).join(', ')})${manualPause(snapshot) ? ' + manual' : ''}` : manualPause(snapshot) && stateName !== 'running' ? 'Paused manually' : null,
                    snapshot.service.lifecycle && snapshot.service.lifecycle.intent && snapshot.service.lifecycle.intent !== 'pause' ? h('span', { className: 'warn' }, `${snapshot.service.lifecycle.intent} pending`) : null,
                    h('span', { className: 'muted' }, 'Pause, resume, stop, restart'),
                ];
            }
            case 'health': {
                const health = snapshot.health;
                if (!health) return [h('span', { className: 'muted' }, 'Not reported by this engine.')];
                return [h('strong', { className: health.status === 'ok' ? 'ok' : health.status === 'hard' ? 'bad' : health.status === 'unknown' ? '' : 'warn' }, health.summary), h('span', { className: 'muted' }, `disk ${mib(health.disk.freeMiB)} · memory ${mib(health.memory.availableMiB)}`), healthReasons(snapshot).length ? h('span', { className: 'warn' }, 'new background work is paused') : null];
            }
            case 'wallet': {
                const wallet = snapshot.wallet;
                if (!wallet) return [h('span', { className: 'muted' }, 'Not reported by this engine.')];
                const tone = wallet.state === 'unavailable' ? 'bad' : wallet.state === 'locked' || wallet.state === 'setup' || wallet.pending.length ? 'warn' : wallet.state === 'ready' ? 'ok' : 'muted';
                const first = wallet.pending[0];
                return [h('strong', { className: tone }, wallet.summary), first ? h('span', { className: 'warn' }, `login for ${first.origin.replace(/^https?:\/\//, '')}${first.problem === 'rejected' ? ' (rejected)' : ''}`) : null];
            }
            case 'chats': {
                const waiting = snapshot.chats.waiting;
                const first = waiting[0];
                return [waiting.length ? h('strong', { className: 'warn' }, `${waiting.length} waiting for you`) : h('span', { className: 'muted' }, 'Nobody waits for you'), first ? `${first.awaiting ? first.awaiting.sender : first.agent || 'An agent'}: ${(first.awaiting ? first.awaiting.text : first.name).split('\n')[0]}` : null, h('span', { className: 'muted' }, `${snapshot.chats.total} chats${snapshot.chats.unread ? ` · ${snapshot.chats.unread} unread` : ''}`)];
            }
            case 'tasks': {
                const next = snapshot.queue.find((item) => item.readiness === 'ready') || snapshot.queue[0];
                return [h('strong', {}, `${snapshot.queueTotal} unfinished`), next ? h('span', {}, h('span', { className: 'muted' }, 'next '), next.title) : h('span', { className: 'muted' }, 'No unfinished tasks.')];
            }
            case 'agents': {
                const active = snapshot.agents.filter((agent) => agent.activity !== 'idle');
                return [h('span', { className: 'muted' }, `${snapshot.agents.length} agents${active.length ? ` · ${active.length} active` : ''}`), ...[...active, ...snapshot.agents.filter((agent) => agent.activity === 'idle')].slice(0, 3).map((agent) => h('span', { className: 'row' }, badge(agent, true), agent.name))];
            }
            case 'tools': {
                const tools = snapshot.tools;
                if (!tools) return [h('span', { className: 'muted' }, 'Not reported by this engine.')];
                const count = (type) => `${tools.items.filter((item) => item.type === type && item.state === 'usable').length}/${tools.items.filter((item) => item.type === type).length}`;
                return [`Harnesses ${count('HARNESS')} · Browsers ${count('BROWSER')}`, tools.waiting ? h('span', { className: 'warn' }, `New work waits: ${tools.waiting.reason}`) : null];
            }
            case 'results': {
                const last = snapshot.results.recent[0];
                const error = snapshot.errors[snapshot.errors.length - 1];
                return [`✔ ${snapshot.results.completed} completed · ✖ ${snapshot.results.failed} failed`, last ? h('span', { className: 'muted' }, last.title) : null, error ? h('span', { className: 'warn' }, `Last error: ${error.summary}`) : null];
            }
            case 'history': {
                const last = snapshot.history && snapshot.history.last;
                return last ? [h('span', {}, last.summary), h('span', { className: 'muted' }, time(last.at))] : [h('span', { className: 'muted' }, 'Git messages and topology')];
            }
            case 'files':
                return [h('span', { className: 'muted' }, 'Read-only project browser')];
            case 'actions': {
                const actions = snapshot.actions;
                if (!actions) return [h('span', { className: 'muted' }, 'Not reported by this engine yet.')];
                const latest = actions.recent[0];
                if (!latest) return [h('span', { className: 'muted' }, 'No external actions recorded')];
                return [h('strong', {}, `${actions.total} recorded`), h('span', {}, `${latest.operation}${latest.service ? ` · ${latest.service}` : ''} `, outcomeBadge(latest.outcome)), actions.pending ? h('span', { className: 'warn' }, `${actions.pending} not committed yet`) : null];
            }
            case 'usage': {
                const usage = snapshot.usage;
                if (!usage) return [h('span', { className: 'muted' }, 'Not reported by this engine yet.')];
                const total = usage.total;
                return [total.units ? h('strong', {}, `${compactCount(total.input + total.output)} tokens · ${total.units} runs`) : h('span', { className: 'muted' }, `No model usage in ${usage.days} days`), total.units ? h('span', { className: 'muted' }, billingMix(total)) : null];
            }
            case 'connection': {
                const { local } = snapshot.connection;
                return [local.state === 'ready' ? h('strong', { className: 'ok' }, 'Local only') : `HTTP ${local.state}`, local.url ? h('span', { className: 'muted' }, local.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) : null];
            }
            case 'sync': {
                const sync = snapshot.sync;
                return sync ? [pill(sync.phase === 'idle' ? sync.state : sync.phase, sync.state === 'synchronized' ? 'ok' : ['failed', 'conflict'].includes(sync.state) ? 'bad' : 'warn'), sync.reason ? h('span', { className: 'warn' }, sync.reason) : h('span', { className: 'muted' }, `${sync.incoming ?? '?'} in / ${sync.outgoing ?? '?'} out`)] : [];
            }
            default:
                return [];
        }
    }

    /** Room of the home grid: the viewport below the top bar. */
    function homeRoom() {
        const topbar = document.querySelector('.topbar');
        return { width: window.innerWidth, height: window.innerHeight - (topbar ? topbar.offsetHeight : 52) - 24 };
    }

    /**
     * Columns of the home grid: roomy tiles on wide windows, more columns on short ones (the home never scrolls), then
     * balanced so that the last row is not left nearly empty.
     */
    function homeColumns(count) {
        const { width, height } = homeRoom();
        const maxColumns = Math.max(1, Math.min(5, count, Math.floor(width / 160)));
        let columns = Math.max(1, Math.min(maxColumns, Math.floor(width / 280)));
        while (columns < maxColumns && Math.ceil(count / columns) * 110 > height) columns++;
        return Math.ceil(count / Math.ceil(count / columns));
    }

    /** Summary lines that fit one tile of the current grid (the title always stays). */
    function tileLineBudget(count) {
        const rows = Math.ceil(count / homeColumns(count));
        const tileHeight = (homeRoom().height - (rows - 1) * 10) / rows;
        return Math.max(1, Math.floor((tileHeight - 44) / 22));
    }

    /** Asks the engine for one coalesced brief generation (it waits while background work is paused). */
    async function refreshBrief() {
        try {
            toast((await api('/api/report', { method: 'POST', body: { action: 'refresh' } })).outcome);
        } catch (error) {
            toast(`Refresh failed: ${error.message}`);
        }
    }

    /** Starts a new chat seeded with exactly the displayed brief, then opens it. */
    async function discussBrief(at) {
        try {
            const result = await api('/api/report', { method: 'POST', body: { action: 'discuss', at } });
            openPage('chats');
            openChat(result.chat);
        } catch (error) {
            toast(`The discussion could not be started: ${error.message}`);
        }
    }

    /** Chatter's saved brief beneath the application header (reading never generates one), with its explicit actions. */
    function renderBrief(snapshot) {
        const report = snapshot.report;
        const brief = report && report.brief;
        // A failed update and a pending commit are recovered automatically: their cause and next attempt, never a Retry question.
        const status = report
            ? report.generating
                ? 'updating…'
                : [
                      report.requestedAt ? `refresh requested${report.waiting ? ` — ${report.waiting}` : ''}` : '',
                      report.recheck ? `the last update failed (${report.recheck.cause}); automatic retry ${time(report.recheck.nextAt)}` : '',
                      report.isCommitPending ? 'saved, but its commit is pending (retried automatically)' : '',
                  ]
                      .filter(Boolean)
                      .join(' · ')
            : '';
        const text = brief ? brief.text : report ? (report.state === 'unreadable' ? `The project brief cannot be read (${report.problem || 'report.book'}).` : 'No project brief yet. Refresh asks Chatter for one.') : 'This engine does not report a project brief.';
        return h(
            'section',
            { className: 'brief', 'aria-label': 'Project brief' },
            h('div', { className: 'brief-body' }, h('p', { className: `brief-text${state.briefExpanded ? ' expanded' : ''}${brief ? '' : ' muted'}` }, text), h('span', { className: 'muted' }, [brief ? time(brief.at) : '', status].filter(Boolean).join(' · '))),
            h(
                'div',
                { className: 'brief-actions' },
                brief ? h('button', { onclick: () => discussBrief(brief.at) }, 'Discuss') : null,
                h('button', { onclick: refreshBrief, disabled: Boolean(report && report.generating) }, 'Refresh'),
                brief && brief.text.length > 200 ? h('button', { 'aria-expanded': String(Boolean(state.briefExpanded)), onclick: () => ((state.briefExpanded = !state.briefExpanded), render(state.snapshot)) }, state.briefExpanded ? 'Less' : 'More') : null,
            ),
        );
    }

    /** The no-scroll home screen: the saved brief, compact tiles, a focused tile (operator's cursor) and independent attention. */
    function renderHome(snapshot) {
        const tiles = homeTiles(snapshot);
        if (!tiles.includes(state.focus)) state.focus = 'work';
        const columns = homeColumns(tiles.length);
        const lines = tileLineBudget(tiles.length);
        const grid = h('section', { className: 'home', role: 'grid', 'aria-label': 'Dashboard home', style: `--columns:${columns};--rows:${Math.ceil(tiles.length / columns)}` });
        for (const domain of tiles) {
            const attention = state.attention.get(domain);
            const classes = ['tile', attention ? `attention ${attention.tone === 'error' ? 'error' : ''} ${attention.seen ? 'seen' : 'new'}` : '', state.focus === domain ? 'focused' : ''].filter(Boolean).join(' ');
            grid.append(
                h(
                    'button',
                    {
                        className: classes,
                        'data-tile': domain,
                        tabindex: state.focus === domain ? '0' : '-1',
                        'aria-label': `${TITLES[domain]}${attention ? ` — needs attention${attention.seen ? '' : ' (new)'}` : ''}`,
                        onclick: () => openPage(domain),
                        onfocus: () => (state.focus = domain),
                    },
                    h('span', { className: 'tile-title' }, attention ? h('span', { className: 'mark', 'aria-hidden': 'true' }, '▲') : null, TITLES[domain] === 'Results and activity' ? 'Results' : TITLES[domain], attention && !attention.seen ? h('span', { className: 'new-label' }, 'new') : null),
                    ...tileSummary(snapshot, domain)
                        .filter(Boolean)
                        .slice(0, lines)
                        .map((line) => h('span', { className: 'tile-line' }, line)),
                ),
            );
        }
        return h('div', { className: 'home-wrap' }, renderBrief(snapshot), grid);
    }

    /** Arrow-key navigation between tiles, following the rendered grid (focus only; Enter/click opens). */
    function moveTileFocus(key) {
        const tiles = homeTiles(state.snapshot);
        const columns = homeColumns(tiles.length);
        const index = Math.max(0, tiles.indexOf(state.focus));
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key];
        const next = index + delta;
        if (next < 0 || next >= tiles.length || (Math.abs(delta) === 1 && Math.floor(next / columns) !== Math.floor(index / columns))) return;
        state.focus = tiles[next];
        render(state.snapshot);
        const element = app.querySelector(`[data-tile="${state.focus}"]`);
        if (element) element.focus();
    }

    /** A page frame: Back, title and context stay at the top while the body scrolls. */
    function pageFrame(domain, context, ...content) {
        return h(
            'section',
            { className: 'page', 'aria-label': TITLES[domain] },
            h('header', { className: 'page-header' }, h('button', { onclick: goHome, 'aria-label': 'Back to the home screen' }, '← Back'), h('h1', {}, TITLES[domain]), h('span', { className: 'muted' }, context)),
            h('div', { className: 'page-body' }, ...content.flat().filter(Boolean)),
        );
    }

    /** The System page: engine identity, lifecycle, every pause reason and the manual controls. */
    function renderSystemPage(snapshot) {
        const service = snapshot.service;
        const lifecycle = service.lifecycle || {};
        const stateName = service.state === 'paused' ? 'pause' : service.state;
        const reasons = service.pauseReasons || [];
        const controls = h('section', { className: `card controls ${stateName}`, 'aria-label': 'Lifecycle' });
        controls.append(h('h2', {}, h('span', {}, 'Lifecycle'), pill(stateName, stateName === 'running' ? 'ok' : stateName === 'stopping' ? 'bad' : 'warn')));
        controls.append(h('p', {}, lifecycleText(snapshot), lifecycle.since ? h('span', { className: 'muted' }, ` Requested ${time(lifecycle.since)}.`) : null));
        const buttons = lifecycleActions(snapshot).map((item) => h('button', { className: item.danger ? 'danger' : item.primary ? 'primary' : '', disabled: state.busy.has(`control:${item.action}`), onclick: () => control(item.action, item.confirm, item.extra) }, item.label));
        buttons.push(h('button', { disabled: !(snapshot.wait && snapshot.wait.skippable), title: snapshot.wait && !snapshot.wait.skippable ? 'Only pacing/backoff waits can be skipped' : '', onclick: () => control('skip-wait') }, 'Skip wait'));
        controls.append(h('div', { className: 'row', role: 'group', 'aria-label': 'Lifecycle actions' }, buttons));
        controls.append(h('p', { className: 'muted' }, 'The same operations as ptbk pause, resume, stop, stop --force and restart; every connected viewer shares this engine. Leaving this page never stops it.'));
        const pause = h('section', { className: 'card', 'aria-label': 'Pause reasons' }, h('h2', {}, h('span', {}, `Pause reasons (${reasons.length})`)));
        if (!reasons.length) pause.append(h('p', { className: 'muted' }, 'No pause reason is active; background work may start.'));
        else {
            pause.append(
                h(
                    'ul',
                    { className: 'list' },
                    reasons.map((reason) =>
                        h(
                            'li',
                            {},
                            h('span', { className: 'title' }, reason.kind === 'manual' ? 'Manual pause' : `Health (${reason.severity})`, h('span', { className: 'why' }, `${reason.summary} · owner ${reason.owner} · since ${time(reason.since)}`)),
                            pill(reason.kind === 'manual' ? 'removed by Resume' : reason.severity === 'hard' ? 'no override' : 'resolves automatically', reason.severity === 'hard' ? 'bad' : 'warn'),
                        ),
                    ),
                ),
            );
            if (healthReasons(snapshot).length) pause.append(h('p', { className: 'muted' }, 'Resume removes only the manual reason; scheduling continues once every reason is gone. Health reasons are handled on the Health page.'));
        }
        const engine = h(
            'section',
            { className: 'card', 'aria-label': 'Engine and process' },
            h('h2', {}, 'Engine and process'),
            h(
                'dl',
                { className: 'kv' },
                [
                    ['Engine', `ptbk ${snapshot.engine.version} (${snapshot.engine.scope} installation)`],
                    ['Installation', snapshot.engine.installation],
                    ['Process', `${service.mode}${service.pid ? ` · PID ${service.pid}` : ''}${service.startedAt ? ` · started ${time(service.startedAt)}` : ''}`],
                    ['Project', snapshot.project.path],
                    ['Commits', service.commitMode === 'commit' ? 'automatic' : 'NO-COMMIT mode (results stay uncommitted)'],
                    ['Persistent', service.persistent === null ? 'n/a' : service.persistent ? 'yes' : `no${service.persistenceNote ? ` — ${service.persistenceNote}` : ''}`],
                    ['Configuration', `promptbookVersion ${(snapshot.configuration && snapshot.configuration.promptbookVersion) || 'unknown'}${snapshot.configuration && snapshot.configuration.pending ? ` · pending: ${snapshot.configuration.pending}` : ''}`],
                ].map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)]),
            ),
            renderSettings(snapshot),
        );
        return pageFrame('system', 'Engine identity, lifecycle, every active pause reason and manual controls', controls, pause, engine);
    }

    /** The Health page: UI over the per-engine Health sub-engine (no generic manual Pause/Resume here). */
    function renderHealthPage(snapshot) {
        const health = snapshot.health;
        if (!health) return pageFrame('health', 'Host resources of this engine', h('p', { className: 'muted' }, 'This engine does not report health.'));
        const status = h('section', { className: 'card', 'aria-label': 'Measurements' });
        status.append(h('h2', {}, h('span', {}, 'Host resources'), pill(health.summary, health.status === 'ok' ? 'ok' : health.status === 'hard' ? 'bad' : 'warn')));
        status.append(
            h(
                'dl',
                { className: 'kv' },
                [
                    ['Measured', `${time(health.observedAt) || 'not yet'} · every ${Math.round(health.intervalMs / 1000)} s, with or without viewers`],
                    ['Limits', `disk ${health.limits.disk ? mib(health.limits.disk) : 'off'} · memory ${health.limits.memory ? mib(health.limits.memory) : 'off'} (${health.limits.source}; ptbk.json limit.disk / limit.memory, soft only)`],
                    ['Disk', `${mib(health.disk.freeMiB)} free${health.disk.totalMiB ? ` of ${mib(health.disk.totalMiB)}` : ''}${health.disk.error ? ` · ${health.disk.error}` : ''}`],
                    ['Memory', `${mib(health.memory.availableMiB)} available for new work (RAM + swap)`],
                    ['RAM', `${mib(health.memory.ramAvailableMiB)} available${health.memory.ramTotalMiB ? ` of ${mib(health.memory.ramTotalMiB)}` : ''}`],
                    ['Swap', health.memory.swapTotalMiB === undefined ? 'not measured' : `${mib(health.memory.swapFreeMiB)} free of ${mib(health.memory.swapTotalMiB)}`],
                    ['CPU', health.cpu.state === 'unknown' ? 'load not reported on this platform' : `load ${health.cpu.load1.toFixed(2)} / ${health.cpu.load5.toFixed(2)} / ${health.cpu.load15.toFixed(2)} on ${health.cpu.cores} cores${health.cpu.state === 'high' ? ' · high' : ''}`],
                    ['Network', `${health.network.state}${health.network.target ? ` · ${health.network.target}` : ''}${health.network.checkedAt ? ` · checked ${time(health.network.checkedAt)}` : ''}${health.network.error && health.network.state !== 'reachable' ? ` · ${health.network.error}` : ''}`],
                ].map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)]),
            ),
            h('div', { className: 'row' }, h('button', { onclick: () => control('health-recheck') }, 'Measure now')),
        );
        const incidents = h('section', { className: 'card', 'aria-label': 'Incidents' }, h('h2', {}, `Incidents (${health.incidents.length})`));
        if (!health.incidents.length) incidents.append(h('p', { className: 'muted' }, 'No health incident; new background work is not limited by Health.'));
        for (const incident of health.incidents) {
            const impact = incident.pauses ? 'pauses new background work' : incident.overriddenAt ? `overridden ${time(incident.overriddenAt)} — work continues below the limit` : 'attention only (no pause)';
            incidents.append(
                h(
                    'div',
                    { className: `notice ${incident.severity === 'hard' ? 'error' : ''}` },
                    h('strong', {}, `${incident.severity.toUpperCase()} · ${incident.summary}`),
                    h('div', { className: 'muted' }, `since ${time(incident.openedAt)} · ${impact}${incident.severity === 'hard' ? ' · cannot be overridden; it clears once the condition is gone' : ''}`),
                    incident.severity === 'soft' && incident.pauses
                        ? h('button', { className: 'danger', onclick: () => control('health-override', `Continue below the recommended limit?\n\n${incident.summary}\n\nNew background work will start although this resource is below its configured preventive limit. The override applies only to this incident and does not change ptbk.json; after recovery a new drop pauses again.`, { incident: incident.id }) }, 'Override this incident')
                        : null,
                ),
            );
        }
        const remediation = h('section', { className: 'card', 'aria-label': 'Remediation' }, h('h2', {}, 'Remediation'));
        remediation.append(h('p', {}, `Clean the Promptbook-owned project cache (${health.remediation.cache.path}/). A preview comes first; entries changed in the last minutes are kept.`));
        if (state.healthCache) {
            const removable = state.healthCache.entries.filter((entry) => !entry.kept);
            remediation.append(h('ul', { className: 'list' }, state.healthCache.entries.slice(0, 10).map((entry) => h('li', {}, h('span', { className: 'title' }, entry.name, h('span', { className: 'why' }, entry.kept || 'will be removed')), pill(mib(entry.bytes / 1048576), entry.kept ? '' : 'warn')))));
            remediation.append(
                h(
                    'div',
                    { className: 'row' },
                    removable.length
                        ? h('button', { className: 'danger', onclick: async () => (await healthAction('health-clean-cache', { confirm: true }, `Remove ${removable.length} cache entries (${mib(state.healthCache.removableBytes / 1048576)})?`)) && ((state.healthCache = null), render(state.snapshot)) }, `Clean ${mib(state.healthCache.removableBytes / 1048576)}`)
                        : h('span', { className: 'muted' }, 'Nothing to clean.'),
                    h('button', { onclick: () => ((state.healthCache = null), render(state.snapshot)) }, 'Close preview'),
                ),
            );
        } else remediation.append(h('div', { className: 'row' }, h('button', { onclick: async () => ((state.healthCache = (await healthAction('health-clean-cache')) || null), render(state.snapshot)) }, 'Preview cleanup')));
        remediation.append(h('p', {}, `Swap: ${health.remediation.swap.note}`));
        if (state.healthSwap) {
            const plan = state.healthSwap;
            remediation.append(h('p', { className: 'muted' }, plan.note));
            if (plan.proposal) {
                remediation.append(h('pre', { className: 'log' }, [...plan.proposal.commands, `# keep after reboot (/etc/fstab): ${plan.proposal.persistLine}`].join('\n')));
                if (plan.proposal.privilege === 'missing') remediation.append(h('div', { className: 'notice' }, 'This engine has no administrator rights and never waits for a password: run the commands above as an administrator.'));
                else remediation.append(h('button', { className: 'danger', onclick: () => healthAction('health-swap', { apply: true }, `Create and enable a ${mib(plan.proposal.sizeMiB)} swap file at ${plan.proposal.path} (as ${plan.proposal.privilege})?`) }, `Create ${mib(plan.proposal.sizeMiB)} swap`));
            }
        } else if (health.remediation.swap.supported) remediation.append(h('button', { onclick: async () => ((state.healthSwap = (await healthAction('health-swap')) || null), render(state.snapshot)) }, 'Plan swap'));
        remediation.append(h('p', { className: 'muted' }, 'Manual Pause/Resume lives on the System page. Viewing this page never resolves an incident.'));
        return pageFrame('health', 'Disk, RAM, swap, CPU and connectivity observed by this engine’s Health sub-engine', status, incidents, remediation);
    }

    /**
     * The Wallet page: readiness, pending login requests and saved logins (labels only). Protected input (passwords,
     * the 12 words for recovery) happens in dialogs outside the live-updating page and is never shown again.
     */
    function renderWalletPage(snapshot) {
        const wallet = snapshot.wallet;
        if (!wallet) return pageFrame('wallet', 'Website logins of this project', h('p', { className: 'muted' }, 'This engine does not report a Wallet.'));
        const status = h('section', { className: 'card', 'aria-label': 'Wallet' });
        status.append(h('h2', {}, h('span', {}, 'Wallet'), pill(wallet.state, wallet.state === 'ready' ? 'ok' : wallet.state === 'unavailable' ? 'bad' : wallet.state === 'empty' ? '' : 'warn')));
        status.append(h('p', {}, wallet.summary));
        if (wallet.facility) status.append(h('p', { className: 'muted' }, `This computer unlocks it automatically (${wallet.facility}).`));
        if (wallet.problem) status.append(h('div', { className: `notice ${wallet.state === 'unavailable' ? 'error' : ''}` }, wallet.problem));
        const actions = h('div', { className: 'row' });
        if (wallet.state === 'empty' || wallet.state === 'setup') actions.append(h('button', { className: 'primary', onclick: walletSetup }, 'Set up the Wallet'));
        if (wallet.state === 'locked' || wallet.state === 'unavailable') actions.append(h('button', { className: 'primary', onclick: walletRestore }, 'Restore with 12 words for recovery'));
        if (wallet.state === 'ready') actions.append(h('button', { className: 'primary', onclick: () => walletLoginDialog({}) }, 'Add a login'));
        const management = wallet.management || {};
        if (management.canImport) actions.append(h('button', { onclick: walletImport }, 'Import from Bitwarden'));
        if (management.canRotate) actions.append(h('button', { onclick: walletRotate }, 'Generate new 12 words'));
        if (management.canReset) actions.append(h('button', { className: 'danger', onclick: walletReset }, 'Reset Wallet'));
        status.append(actions);
        if (wallet.lockedRecords) status.append(h('p', { className: 'muted' }, `${wallet.lockedRecords} saved login${wallet.lockedRecords === 1 ? '' : 's'}: their services, accounts and labels are encrypted too and appear once this computer unlocks the Wallet.`));
        if (wallet.lastAction) status.append(h('p', { className: 'muted' }, `Last: ${wallet.lastAction.outcome}`));
        const requests = h('section', { className: 'card', 'aria-label': 'Login requests' }, h('h2', {}, `Login requests waiting (${wallet.pending.length})`));
        if (!wallet.pending.length) requests.append(h('p', { className: 'muted' }, 'Nothing waits for a login.'));
        for (const action of wallet.pending) {
            const problem = action.problem === 'rejected' ? 'the saved login was rejected' : action.problem === 'locked' ? 'restore the Wallet first' : 'no saved login';
            requests.append(
                h(
                    'div',
                    { className: 'notice' },
                    h('strong', {}, `${action.origin}${action.account ? ` · ${action.account}` : ''} · ${problem}`),
                    h('div', { className: 'muted' }, `${action.reason} ${action.tasks.length ? `For ${action.tasks.join(', ')}.` : ''} Since ${time(action.createdAt)}${action.requests > 1 ? ` · requested ${action.requests}×` : ''}.`),
                    h('div', { className: 'row' }, wallet.state === 'ready' ? h('button', { className: 'primary', onclick: () => walletLoginDialog({ origin: action.origin, action: action.id }) }, 'Add this login') : null, h('button', { onclick: () => walletCall('wallet-dismiss', { request: action.id }, `Dismiss the login request for ${action.origin}? The waiting work continues without it.`) }, 'Dismiss')),
                ),
            );
        }
        const records = h('section', { className: 'card', 'aria-label': 'Saved logins' }, h('h2', {}, `Saved logins (${wallet.records.length})`));
        if (!wallet.records.length) records.append(h('p', { className: 'muted' }, wallet.state === 'ready' ? 'No saved logins yet.' : 'None.'));
        records.append(
            h(
                'ul',
                { className: 'list' },
                wallet.records.map((record) =>
                    h(
                        'li',
                        {},
                        h('span', { className: 'title' }, `${record.origin} · ${record.account}`, h('span', { className: 'why' }, `${record.lastUsedAt ? `used ${time(record.lastUsedAt)}` : 'not used yet'}${record.lastOutcome === 'rejected' ? ' · rejected by the site' : ''}`)),
                        h('span', { className: 'row' }, h('button', { onclick: () => walletLoginDialog({ origin: record.origin, label: record.account, id: record.id }) }, 'Update'), h('button', { className: 'danger', onclick: () => walletCall('wallet-remove', { id: record.id }, `Remove the saved login "${record.account}" for ${record.origin}?`) }, 'Remove')),
                    ),
                ),
            ),
        );
        records.append(h('p', { className: 'muted' }, 'Agents never receive passwords: the Wallet signs in for them. Passwords, the 12 words for recovery and keys are never shown here.'));
        return pageFrame('wallet', 'Encrypted website logins of this project, applied for agents without showing them the credentials', status, requests, records);
    }

    /** Calls a Wallet operation (optionally confirmed) and reports its outcome (never a secret). */
    async function walletCall(action, body, confirmText) {
        if (confirmText && !window.confirm(confirmText)) return undefined;
        try {
            const result = await api('/api/wallet', { method: 'POST', body: { ...(body || {}), action } });
            if (result && result.outcome) toast(result.outcome);
            return result;
        } catch (error) {
            toast(`Wallet: ${error.message}`);
            return undefined;
        }
    }

    /** A modal dialog outside the live-updating page (its inputs survive snapshot updates); removed when closed. */
    function walletDialog(title, ...content) {
        const dialog = h('dialog', { className: 'wallet-dialog', 'aria-label': title }, h('h2', {}, title), ...content);
        dialog.addEventListener('close', () => dialog.remove());
        document.body.append(dialog);
        dialog.showModal();
        return dialog;
    }

    /**
     * An owner-entry field with a native keyboard-accessible visibility button, starting in the input's own state
     * (username visible, password masked with the browser's typing feedback); never loads saved values.
     */
    function walletCredentialField(label, input) {
        const isVisible = input.type !== 'password';
        const button = h('button', {
            type: 'button',
            'aria-pressed': String(isVisible),
            onclick: () => {
                const isRevealed = input.type === 'password';
                input.type = isRevealed ? 'text' : 'password';
                button.textContent = `${isRevealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`;
                button.setAttribute('aria-pressed', String(isRevealed));
            },
        }, `${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`);
        return h('div', { className: 'field' }, h('label', {}, h('span', {}, label), input), button);
    }

    /** Protected entry of a website login: owner reveal applies only to new input, cleared once sent. */
    function walletLoginDialog(initial) {
        const field = (label, input) => h('label', { className: 'field' }, h('span', {}, label), input);
        const origin = h('input', { type: 'text', value: initial.origin || '', autocomplete: 'off', placeholder: 'https://example.com', required: true });
        const username = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', required: true });
        const password = h('input', { type: 'password', autocomplete: 'new-password', required: true });
        const label = h('input', { type: 'text', value: initial.label || '', autocomplete: 'off', placeholder: 'optional; default: website · masked account' });
        let dialog;
        const form = h(
            'form',
            {
                method: 'dialog',
                autocomplete: 'off',
                onsubmit: async (event) => {
                    event.preventDefault();
                    const body = { origin: origin.value, username: username.value, password: password.value, label: label.value, ...(initial.action ? { request: initial.action } : {}), ...(initial.id ? { id: initial.id } : {}) };
                    password.value = '';
                    const result = await walletCall('wallet-save', body);
                    body.password = '';
                    if (result) dialog.close();
                },
            },
            h('p', { className: 'muted' }, 'The username starts visible and the password masked. Show or hide each field while entering it; saved passwords cannot be revealed. Agents never receive them.'),
            field('Website', origin),
            walletCredentialField('Username or email', username),
            walletCredentialField('Password', password),
            field('Label (editable name of this login)', label),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Save login'), h('button', { type: 'button', onclick: () => ((password.value = ''), dialog.close()) }, 'Cancel')),
        );
        dialog = walletDialog(initial.id ? 'Update a website login' : 'Add a website login', form);
        (initial.origin ? username : origin).focus();
    }

    /** First setup: the 12 words for recovery are shown once in a dialog and the Wallet is created after confirmation. */
    async function walletSetup() {
        const result = await walletCall('wallet-setup');
        if (!result || !result.words) return;
        let confirmed = false;
        const words = h('ol', { className: 'recovery-words' }, result.words.map((word) => h('li', {}, word)));
        const dialog = walletDialog(
            '12 words for recovery',
            h('p', {}, 'Write these 12 words on paper, in order, and keep them safe. With the project folder they restore its saved logins on another computer. They are shown only now.'),
            words,
            h(
                'div',
                { className: 'row' },
                h('button', { className: 'primary', onclick: async () => ((confirmed = true), words.remove(), dialog.close(), await walletCall('wallet-setup-confirm')) }, 'I wrote them down — create the Wallet'),
                h('button', { onclick: () => dialog.close() }, 'Cancel'),
            ),
        );
        dialog.addEventListener('close', () => {
            if (!confirmed) void walletCall('wallet-setup-cancel');
        });
    }

    /** Shows new 12 words in a dialog; `confirm` applies them, closing otherwise runs `cancel` (nothing changes). */
    function walletWordsDialog(title, text, words, confirmLabel, confirm, cancel) {
        let confirmed = false;
        const list = h('ol', { className: 'recovery-words' }, words.map((word) => h('li', {}, word)));
        const dialog = walletDialog(title, h('p', {}, text), list, h('div', { className: 'row' }, h('button', { className: 'primary', onclick: async () => ((confirmed = true), list.remove(), dialog.close(), await walletCall(confirm)) }, confirmLabel), h('button', { onclick: () => dialog.close() }, 'Cancel')));
        dialog.addEventListener('close', () => {
            if (!confirmed) void walletCall(cancel);
        });
    }

    /** New 12 words while this computer's key works: every saved login is re-encrypted and kept. */
    async function walletRotate() {
        if (!window.confirm('Generate new 12 words for recovery? Every saved login stays; the old words stop opening this Wallet and other computers need the new words once.')) return;
        const result = await walletCall('wallet-rotate');
        if (result && result.words) walletWordsDialog('New 12 words for recovery', 'Write these NEW words on paper, in order, and keep them safe. The Wallet switches to them when you confirm; the old words then stop working.', result.words, 'I wrote them down — switch to the new words', 'wallet-rotate-confirm', 'wallet-rotate-cancel');
    }

    /** Empty reset after total key loss: the all-data-loss warning, a typed RESET, then the new Wallet's words. */
    async function walletReset() {
        const typed = window.prompt('No key on this computer and no 12 words can unlock this Wallet, so its old data cannot be recovered.\n\nResetting discards ALL of it for good: services and accounts, labels, usernames, passwords and TOTP generators.\n\nType RESET to continue (anything else cancels):');
        if (typed !== 'RESET') {
            toast('Nothing was changed; the encrypted Wallet data is kept.');
            return;
        }
        const result = await walletCall('wallet-reset', { confirm: typed });
        if (result && result.words) walletWordsDialog('12 words for the new empty Wallet', 'Write these words down. Confirming discards the old Wallet and creates a new empty one; cancelling keeps the old encrypted data.', result.words, 'I wrote them down — reset the Wallet', 'wallet-setup-confirm', 'wallet-setup-cancel');
    }

    /**
     * Import from an unencrypted Bitwarden JSON export chosen through the browser's own file picker: its content goes
     * only to this engine's protected Wallet (never saved or attached anywhere); the preview offers individual, Select
     * all and Select none selection, and conflicts are replaced only when chosen.
     */
    function walletImport() {
        const file = h('input', { type: 'file', accept: 'application/json,.json' });
        let dialog;
        let draft = null;
        const body = h('div', {});
        const choose = h(
            'form',
            {
                method: 'dialog',
                onsubmit: async (event) => {
                    event.preventDefault();
                    const chosen = file.files && file.files[0];
                    if (!chosen) return;
                    const content = await chosen.text();
                    file.value = '';
                    const preview = await walletCall('wallet-import-preview', { content });
                    if (!preview || !preview.candidates) return;
                    draft = preview.draft;
                    showPreview(preview);
                },
            },
            h('p', {}, 'In Bitwarden choose Export vault with the File format ".json" (not encrypted). The file contains your passwords: the Wallet reads it once and keeps no copy; delete it safely afterwards.'),
            h('label', { className: 'field' }, h('span', {}, 'Bitwarden JSON export'), file),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Read the export'), h('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel')),
        );
        const showPreview = (preview) => {
            const boxes = [];
            const rows = preview.candidates.map((candidate) => {
                const box = h('input', { type: 'checkbox', checked: candidate.state === 'new', disabled: candidate.state === 'duplicate' });
                const replace = candidate.state === 'conflict' ? h('input', { type: 'checkbox' }) : null;
                boxes.push({ candidate, box, replace });
                return h('li', {}, h('label', {}, box, ` ${candidate.label}`), h('div', { className: 'muted' }, `${candidate.origin} · ${candidate.account}${candidate.totp ? ' · TOTP generator' : ''}${candidate.state === 'duplicate' ? ' · identical to a saved login (kept)' : candidate.state === 'conflict' ? ' · differs from the saved login' : ''}`), replace ? h('label', { className: 'muted' }, replace, ' replace the saved values with the exported ones') : null);
            });
            const setAll = (value) => boxes.forEach((item) => (item.box.checked = !item.box.disabled && value));
            body.replaceChildren(
                h('div', { className: 'row' }, h('button', { type: 'button', onclick: () => setAll(true) }, 'Select all'), h('button', { type: 'button', onclick: () => setAll(false) }, 'Select none')),
                h('ul', { className: 'list' }, ...rows),
                preview.skipped.length ? h('p', { className: 'muted' }, `Not imported (${preview.skipped.length}): ${preview.skipped.map((entry) => `${entry.label} — ${entry.reason}`).join('; ')}`) : null,
                h(
                    'div',
                    { className: 'row' },
                    h(
                        'button',
                        {
                            className: 'primary',
                            onclick: async () => {
                                const select = boxes.filter((item) => item.box.checked).map((item) => item.candidate.key);
                                const replace = boxes.filter((item) => item.box.checked && item.replace && item.replace.checked).map((item) => item.candidate.key);
                                const result = await walletCall('wallet-import-apply', { draft, select, replace });
                                if (result) ((draft = null), dialog.close());
                            },
                        },
                        'Import the selected logins',
                    ),
                    h('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel'),
                ),
            );
        };
        body.append(choose);
        dialog = walletDialog('Import logins from Bitwarden', body);
        dialog.addEventListener('close', () => {
            if (draft) void walletCall('wallet-import-cancel');
        });
    }

    /** Restoration on this computer from the 12 words for recovery (hidden while typed, never sent anywhere else). */
    function walletRestore() {
        const words = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', required: true, placeholder: 'word1 word2 … word12' });
        let dialog;
        const form = h(
            'form',
            {
                method: 'dialog',
                autocomplete: 'off',
                onsubmit: async (event) => {
                    event.preventDefault();
                    const value = words.value;
                    words.value = '';
                    if (await walletCall('wallet-restore', { words: value })) dialog.close();
                },
            },
            h('p', {}, 'Enter the 12 words for recovery of this project, in order, separated by spaces. Saved logins need not be entered again.'),
            h('label', { className: 'field' }, h('span', {}, '12 words for recovery'), words),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Restore'), h('button', { type: 'button', onclick: () => ((words.value = ''), dialog.close()) }, 'Cancel')),
        );
        dialog = walletDialog('Restore the Wallet on this computer', form);
        words.focus();
    }

    /** Runs a Health operation (optionally confirmed) and returns its preview/plan data. */
    async function healthAction(action, extra, confirmText) {
        if (confirmText && !window.confirm(confirmText)) return undefined;
        try {
            const result = await api('/api/control', { method: 'POST', body: { action, ...(extra || {}) } });
            toast(result.outcome);
            return result.data || result.applied;
        } catch (error) {
            toast(`Not applied: ${error.message}`);
            return undefined;
        }
    }

    /** Loads the complete task inventory in the viewer's order (the engine applies the shared sort). */
    async function loadTasks(force) {
        if (!force && state.tasks.revision === state.revision) return;
        state.tasks.revision = state.revision;
        try {
            const result = await api(`/api/tasks?sort=${encodeURIComponent(state.tasks.sort)}${state.tasks.descending ? '&descending=1' : ''}`);
            state.tasks.items = result.tasks;
        } catch (error) {
            toast(`Tasks unavailable: ${error.message}`);
        }
        if (state.page === 'tasks') render(state.snapshot);
    }

    /** The Tasks page: the complete inventory with smart default order and user-selected sorting. */
    function renderTasksPage() {
        const card = h('section', { className: 'card queue', 'aria-label': 'Tasks' });
        const sort = h('select', { 'aria-label': 'Sort by' }, ['smart', 'priority', 'time', 'status', 'agent', 'name'].map((field) => h('option', { value: field }, field === 'smart' ? 'smart (current, coming up, recent, history)' : field)));
        sort.value = state.tasks.sort;
        sort.addEventListener('change', () => ((state.tasks.sort = sort.value), loadTasks(true)));
        const direction = h('button', { onclick: () => ((state.tasks.descending = !state.tasks.descending), loadTasks(true)) }, state.tasks.descending ? 'Descending' : 'Ascending');
        card.append(h('h2', {}, h('span', {}, `All tasks (${state.tasks.items ? state.tasks.items.length : '…'})`), h('span', { className: 'row' }, h('label', {}, 'Sort ', sort), direction)));
        if (!state.tasks.items) {
            card.append(h('p', { className: 'muted' }, 'Loading the task inventory…'));
            return pageFrame('tasks', 'Every task in every state', card);
        }
        const tone = { ready: 'ok', active: 'ok', 'needs-assignment': 'warn', assigning: 'warn', blocked: 'bad', failed: 'bad', 'needs-recovery': 'bad', 'awaiting-user': 'warn' };
        card.append(
            h(
                'ul',
                { className: 'list' },
                state.tasks.items.map((item) =>
                    h(
                        'li',
                        {},
                        h('span', { className: 'title' }, item.title, h('span', { className: 'why' }, `${item.reason}${item.agent ? ` · ${item.agent}` : ''}${item.priority ? ` · priority ${item.priority}` : ''}${item.repeat ? ` · every ${item.repeat}` : ''}${item.until ? ` · next ${time(item.until)}` : item.lastDone ? ` · done ${time(item.lastDone)}` : ''} · ${item.source}`)),
                        // The task's question is the one in its chat: answering opens that conversation.
                        item.waitingChat ? h('button', { className: 'primary', onclick: () => openChat(item.waitingChat) }, 'Answer') : null,
                        pill(item.readiness, tone[item.readiness]),
                    ),
                ),
            ),
        );
        if (!state.tasks.items.length) card.append(h('p', { className: 'muted' }, 'No tasks yet. Ask Tasker in a new chat to create one.'));
        return pageFrame('tasks', 'Viewer order only — sorting never changes engine scheduling', card);
    }

    /** The Agents page: every agent with its actual activity, queue and a direct chat. */
    function renderAgentsPage(snapshot) {
        const card = h('section', { className: 'card inventory', 'aria-label': 'Agents' });
        card.append(h('h2', {}, `Agents (${snapshot.agents.length})`));
        const queued = (agent) => snapshot.queue.filter((item) => item.agent && item.agent.replace(/^@|^\{|\}$/g, '').toLowerCase() === agent.name.toLowerCase()).length;
        card.append(
            h(
                'ul',
                { className: 'list' },
                snapshot.agents.map((agent) =>
                    h(
                        'li',
                        {},
                        h('span', { className: 'title row' }, badge(agent, true), agent.name, h('span', { className: 'why' }, `${ACTIVITY_LABEL[agent.activity] || agent.activity}${queued(agent) ? ` · ${queued(agent)} queued` : ''}${agent.role === 'engine' ? ' · engine-provided' : agent.role === 'core' ? ' · core' : ''}`)),
                        h('button', { onclick: () => ((state.newChatAgent = agent.name), (state.newChat = agent.name.toLowerCase() === 'chatter' ? 'chatter' : 'all'), (state.chat = null), openPage('chats'), showNewChatAgents()) }, 'Chat'),
                    ),
                ),
            ),
        );
        return pageFrame('agents', 'The complete team, core roles and Expert included; actual activity, never a fabricated worker', card);
    }

    /** Loads the chat agents for the full new-chat list without resetting its stage. */
    async function showNewChatAgents() {
        if (state.agents) return render(state.snapshot);
        try {
            state.agents = (await api('/api/chat-agents')).agents;
        } catch (error) {
            toast(`Agents unavailable: ${error.message}`);
        }
        render(state.snapshot);
    }

    /** One domain page. */
    function renderPage(snapshot, domain) {
        switch (domain) {
            case 'work':
                return pageFrame('work', 'Agent, task, phase, waits and the actual harness/model/thinking of this run', renderWork(snapshot), detailPanel('execution', 'Execution details — agent, harness tool, model, thinking level', renderExecutionDetails(snapshot)));
            case 'system':
                return renderSystemPage(snapshot);
            case 'health':
                return renderHealthPage(snapshot);
            case 'wallet':
                return renderWalletPage(snapshot);
            case 'chats':
                return pageFrame('chats', `${snapshot.chats.total} chats · ${snapshot.chats.unread} unread · ${snapshot.chats.waiting.length} waiting for you`, snapshot.chats.waiting.length && !state.chat && !state.newChat ? renderAttention(snapshot) : null, renderChats(snapshot));
            case 'tasks':
                return renderTasksPage();
            case 'agents':
                return renderAgentsPage(snapshot);
            case 'tools':
                return pageFrame('tools', 'Named tools · saved changes are committed immediately and apply to new work at once', renderTools(snapshot), detailPanel('browser', 'Browser details — named browsers, profiles, health, recovery', renderBrowserDetails(snapshot)));
            case 'results':
                return pageFrame('results', 'Outcomes of this session and the bounded runtime activity log', renderActivity(snapshot));
            case 'usage':
                return renderUsagePage(snapshot);
            case 'actions':
                return renderActionsPage(snapshot);
            case 'history':
                return renderHistoryPage(snapshot);
            case 'files':
                return renderFilesPage();
            case 'connection':
                return pageFrame('connection', 'Local dashboard access on this computer', renderConnection(snapshot));
            case 'sync':
                return pageFrame('sync', 'Git autosync through the engine’s one coordinator', renderSync(snapshot));
            default:
                return renderHome(snapshot);
        }
    }

    /** Renders the home screen or the open page, preserving focus, drafts and scroll. */
    function render(snapshot) {
        if (!snapshot) return;
        if (state.page && !homeTiles(snapshot).includes(state.page)) state.page = null;
        const active = document.activeElement;
        const focusDraft = active && active.getAttribute && active.getAttribute('data-draft');
        const focusTile = active && active.getAttribute && active.getAttribute('data-tile');
        const selection = focusDraft ? [active.selectionStart, active.selectionEnd] : null;
        const scroll = window.scrollY;
        document.body.classList.toggle('home-view', !state.page);
        app.replaceChildren(state.page ? renderPage(snapshot, state.page) : renderHome(snapshot));
        if (focusDraft) {
            const field = app.querySelector(`[data-draft="${CSS.escape(focusDraft)}"]`);
            if (field) {
                field.focus();
                if (selection) field.setSelectionRange(selection[0], selection[1]);
            }
        } else if (focusTile && !state.page) {
            const tile = app.querySelector(`[data-tile="${CSS.escape(state.focus)}"]`);
            if (tile) tile.focus();
        }
        if (state.page) window.scrollTo(0, scroll);
        // The sticky page header sits right below the (possibly wrapped) top bar.
        const topbar = document.querySelector('.topbar');
        if (topbar) document.documentElement.style.setProperty('--topbar-height', `${topbar.offsetHeight}px`);
        const live = state.connected ? 'live' : 'disconnected — showing last known state';
        const attention = state.attention.size;
        // The shared application header: Promptbook / PTBK (brand) and the project, with attention and freshness as
        // secondary details; it is never a tile. Lifecycle/pause state lives in the System and related tiles.
        headerStatus.replaceChildren(
            h('strong', { className: 'header-project' }, snapshot.project.name),
            snapshot.service.commitMode === 'no-commit' ? h('span', { className: 'pill warn' }, 'NO-COMMIT') : '',
            h('span', { className: 'header-details' }, attention ? h('span', { className: 'warn' }, `▲ ${attention} need${attention === 1 ? 's' : ''} attention · `) : '', live),
        );
        document.title = `${snapshot.chats.waiting.length ? `(${snapshot.chats.waiting.length}) ` : ''}PTBK · ${snapshot.project.name}`;
    }

    /** Displays a local connection failure without claiming fresh state. */
    function showConnectionError(message) {
        headerStatus.textContent = 'Disconnected';
        app.replaceChildren(h('section', { className: 'card' }, h('h2', {}, 'Local dashboard unavailable'), h('p', {}, message)));
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
                updateAttention(snapshot);
                if (state.page === 'tasks') loadTasks(false);
                render(snapshot);
                // New messages in the open chat arrive without stealing focus or drafts.
                if (state.chat && state.chat.detail) {
                    const summary = snapshot.chats.recent.find((chat) => chat.name === state.chat.name);
                    // A reply in progress streams its progress: refetch while it lasts and once more when it ends.
                    const replying = (snapshot.chats.replying || []).includes(state.chat.name) || Boolean(state.chat.detail.live);
                    const recheck = (snapshot.chats.rechecks || []).find((item) => item.chat === state.chat.name);
                    const recheckChanged = (recheck && recheck.nextAt) !== (state.chat.detail.recheck && state.chat.detail.recheck.nextAt);
                    if (summary && (replying || recheckChanged || summary.messages !== state.chat.detail.messages.length || summary.status !== state.chat.detail.summary.status)) loadChat(state.chat.name);
                }
                if (snapshot.service.state === 'stopped' || snapshot.service.state === 'finished') {
                    // An exited engine is an observation; the page never starts or recreates a service.
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            } catch (error) {
                if (error.status === 401) {
                    showConnectionError('The engine restarted. Reload this local dashboard to reconnect.');
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

    /** Boot the direct local browser client, then load live state. */
    async function boot() {
        try {
            const session = await api('/api/session');
            state.csrf = session.csrf;
        } catch (error) {
            showConnectionError(error.message);
            return;
        }
        // Viewer-local navigation: the URL fragment names the open page, so browser Back returns home.
        state.page = routeFromHash();
        if (state.page) history.replaceState({ page: state.page }, '', `#/${state.page}`);
        window.addEventListener('popstate', () => {
            state.page = routeFromHash();
            render(state.snapshot);
        });
        // The home grid follows the viewport (also when only its height changes).
        let layout = '';
        new ResizeObserver(() => {
            const tiles = state.snapshot ? homeTiles(state.snapshot).length : 0;
            const next = `${homeColumns(tiles)}:${tileLineBudget(tiles)}`;
            if (!state.page && state.snapshot && next !== layout) render(state.snapshot);
            layout = next;
        }).observe(document.documentElement);
        document.addEventListener('pointerdown', interacted);
        document.addEventListener('keydown', (event) => {
            interacted();
            const typing = event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
            if (event.key === 'Escape' && state.page && !typing) {
                event.preventDefault();
                goHome();
            } else if (!state.page && !typing && (event.key.startsWith('Arrow') || event.key === 'Enter')) {
                const onTile = event.target && event.target.getAttribute && event.target.getAttribute('data-tile');
                if (onTile && event.key === 'Enter') return;
                event.preventDefault();
                // From the page body the first key brings the cursor tile into keyboard focus.
                if (!onTile) {
                    const tile = app.querySelector(`[data-tile="${CSS.escape(state.focus)}"]`);
                    if (event.key === 'Enter') openPage(state.focus);
                    else if (tile) tile.focus();
                } else moveTileFocus(event.key);
            }
        });
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
