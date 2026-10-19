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
        /** New-chat entry: 'entry' (Chat with Chatter / Choose another agent) or 'all' (every valid alternative). */
        newChat: false,
        showAllChats: false,
        /** Viewer-local detail panels (initially collapsed; never engine state). */
        details: { execution: false, browser: false },
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
        if (stateName === 'running') actions.push({ action: 'pause', label: 'Pause' });
        if (stateName === 'pause') actions.push({ action: 'resume', label: 'Resume', primary: true });
        if (stateName === 'pausing') actions.push({ action: 'resume', label: 'Cancel pause' });
        if (stateName === 'stopping' && lifecycle.cancellable) {
            actions.push({ action: 'resume', label: `Cancel ${pending}`, primary: true });
            actions.push({ action: 'pause', label: 'Pause instead', confirm: `Cancel the pending ${pending} and pause instead?`, extra: { replaceStop: true, revision: lifecycle.revision } });
        }
        if (stateName !== 'stopping' || (lifecycle.intent === 'restart' && lifecycle.cancellable)) {
            actions.push({ action: 'stop', label: stateName === 'pausing' ? 'Stop instead' : 'Stop (graceful)', confirm: 'Stop the service after the current task settles? Every viewer shares this engine; closing this page does not stop it.' });
        }
        if (restartable && stateName !== 'stopping') actions.push({ action: 'restart', label: 'Restart', confirm: 'Restart the service? The current task finishes first; then exactly one replacement starts with the same configuration.' });
        if (lifecycle.intent !== 'force-stop') actions.push({ action: 'force-stop', label: 'Force stop', danger: true, confirm: 'Force stop now? Owned work is interrupted immediately (recoverable, never marked done).' });
        return actions;
    }

    /** What the live service state means (never a fifth "stopped" live state). */
    function lifecycleText(snapshot) {
        const service = snapshot.service;
        const lifecycle = service.lifecycle || {};
        const task = snapshot.current ? `“${snapshot.current.taskTitle}”` : 'the current task';
        switch (service.state === 'paused' ? 'pause' : service.state) {
            case 'running':
                return snapshot.current ? 'New tasks start when ready.' : 'Idle is normal; new tasks start when ready.';
            case 'pausing':
                return `${task} finishes first; then no task starts until you resume.`;
            case 'pause':
                return 'Alive and controllable; no task runs or starts.';
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
            card.append(h('p', {}, 'Talking to ', h('strong', {}, chatter.name)));
            card.append(composer('chat:new', `First message to ${chatter.name}`, (text) => startChat(chatter.reference, text), state.busy.has('new-chat')));
        } else {
            const select = h('select', { 'aria-label': 'Agent', 'data-draft': 'chat:new-agent' });
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
        // A significant browser failure stays visible while the browser details are collapsed.
        const browser = snapshot.browser;
        if (browser && (browser.state === 'failed' || (browser.recovery && browser.recovery.state === 'blocked')) && browser.lastFailure) {
            card.append(h('div', { className: 'notice error' }, h('strong', {}, 'Project browser'), ` — ${browser.lastFailure.summary}`, browser.recovery && browser.recovery.state === 'retrying' ? h('div', { className: 'muted' }, 'Recovering automatically…') : null, h('div', { className: 'muted' }, 'Open “Browser details” to recheck, retry or restart it.')));
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
        const execution = snapshot.execution;
        if (!execution) return h('p', { className: 'muted' }, 'No execution yet in this service.');
        const rows = [
            [execution.status === 'active' ? 'Current run' : 'Last run (historical)', execution.status === 'active' ? `${execution.task.kind} · phase ${execution.phase || 'unknown'}${execution.attempt ? ` · attempt ${execution.attempt}/${execution.attemptBudget}` : ''}` : `${execution.outcome || ''} ${execution.endedAt ? `at ${time(execution.endedAt)}` : ''} — not running now`],
            ['Task', `${execution.task.title}${execution.task.source ? ` · ${execution.task.source}` : ''}`],
            ['Agent', `${execution.agent.name}${execution.agent.source ? ` · ${execution.agent.source}` : ''}`],
        ];
        for (const context of execution.contexts) {
            const prefix = context.role === 'consultation' ? `${context.by || '?'} → ${context.agent} (${context.state}): ` : '';
            rows.push([context.role === 'consultation' ? 'Consultation' : 'Harness', `${prefix}${context.harness.name}${context.harness.version ? ` ${context.harness.version}` : ''}`]);
            rows.push(['Model', `${prefix}${modelText(context.model)}${context.model.source ? ` · ${context.model.source}` : ''}`]);
            rows.push(['Thinking', `${prefix}${thinkingText(context.thinkingLevel)}${context.thinkingLevel.source ? ` · ${context.thinkingLevel.source}` : ''}`]);
        }
        return h('dl', { className: 'kv' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)]));
    }

    function renderBrowserDetails(snapshot) {
        const browser = snapshot.browser;
        if (!browser) return h('p', { className: 'muted' }, 'Browser information is not available from this service.');
        const rows = [
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
        return h(
            'div',
            {},
            h('dl', { className: 'kv' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])),
            h(
                'div',
                { className: 'row', style: 'margin-top:8px', role: 'group', 'aria-label': 'Browser recovery' },
                h('button', { onclick: () => control('browser-recheck') }, 'Recheck'),
                h('button', { onclick: () => control('browser-retry') }, 'Retry startup'),
                h('button', { onclick: () => control('browser-restart', 'Restart this project’s browser? Its profile and sessions are kept; the engine keeps running.') }, 'Restart browser'),
            ),
            h('p', { className: 'muted' }, 'Recovery is automatic; these actions use the same engine-owned recovery and never restart the engine or other browsers.'),
        );
    }

    function renderDetails(snapshot) {
        return h('section', { className: 'details-panels', 'aria-label': 'Details' }, detailPanel('execution', 'Execution details — agent, harness, model, thinking level', renderExecutionDetails(snapshot)), detailPanel('browser', 'Browser details — profile, health, recovery', renderBrowserDetails(snapshot)));
    }

    /** The always-visible service-control panel: live state, pending intent and the shared lifecycle operations. */
    function renderControls(snapshot) {
        const stateName = snapshot.service.state === 'paused' ? 'pause' : snapshot.service.state;
        const card = h('section', { className: `card controls ${stateName}`, 'aria-label': 'Service controls' });
        const lifecycle = snapshot.service.lifecycle || {};
        card.append(h('h2', {}, h('span', {}, 'Service controls'), h('span', { className: 'state' }, pill(stateName, stateName === 'running' ? 'ok' : stateName === 'stopping' ? 'bad' : 'warn'))));
        card.append(h('p', {}, lifecycleText(snapshot), lifecycle.since ? h('span', { className: 'muted' }, ` Requested ${time(lifecycle.since)}.`) : null));
        const buttons = lifecycleActions(snapshot).map((item) =>
            h('button', { className: item.danger ? 'danger' : item.primary ? 'primary' : '', disabled: state.busy.has(`control:${item.action}`), onclick: () => control(item.action, item.confirm, item.extra) }, item.label),
        );
        buttons.push(h('button', { disabled: !(snapshot.wait && snapshot.wait.skippable), title: snapshot.wait && !snapshot.wait.skippable ? 'Only pacing/backoff waits can be skipped' : '', onclick: () => control('skip-wait') }, 'Skip wait'));
        card.append(h('div', { className: 'row', role: 'group', 'aria-label': 'Lifecycle actions' }, buttons));
        card.append(h('p', { className: 'muted' }, 'These are the same operations as ptbk pause, resume, stop, stop --force and restart; every connected viewer shares this engine. Leaving this page never stops it.'));
        return card;
    }

    /** Agents, harnesses and settings (secondary inventory). */
    function renderInventory(snapshot) {
        const card = h('section', { className: 'card inventory', 'aria-label': 'Agents and settings' });
        card.append(h('h2', {}, 'Agents and settings'));
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
        app.replaceChildren(renderAttention(snapshot), renderControls(snapshot), renderChats(snapshot), renderWork(snapshot), renderDetails(snapshot), renderQueue(snapshot), renderActivity(snapshot), renderInventory(snapshot), renderConnection(snapshot));
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
                    // An exited engine is an observation; the page never starts or recreates a service.
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
