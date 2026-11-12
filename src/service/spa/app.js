'use strict';

/*
 * Shared graphical client of the project service API, including the deprecated standalone browser entry.
 * All live data comes from /api/state (long polling); all controls go through the API.
 * Each home tile opens a full page (#/<page>, Back returns).
 */
(() => {
    const app = document.getElementById('app');
    const headerStatus = document.getElementById('header-status');
    /** The desktop window opts into a different layout for the same local dashboard. */
    const desktop = new URLSearchParams(location.search).get('view') === 'desktop';
    document.documentElement.toggleAttribute('data-desktop', desktop);
    /**
     * The desktop shell's per-view voice intent token: only a desktop window's dashboard has one, and only its shell
     * (which owns the microphone and the media view) acts on voice intents carrying it.
     */
    const desktopIntent = desktop ? new URLSearchParams(location.search).get('intent') : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        snapshot: null,
        revision: -1,
        csrf: null,
        connected: false,
        drafts: new Map(),
        /** Calling messages already reported as seen by this page. */
        seenSent: new Set(),
        /** The operator's last input in this page (active viewing). */
        lastInput: Date.now(),
        /** One viewport observer, disconnected when the chat is replaced or left. */
        chatObserver: null,
        /** Conversation viewport positions stay local, independent of shared seen/request state. */
        chatScroll: new Map(),
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
        focus: 'harnesses',
        /** The active unit selected on the work page (concurrent work). */
        sessionSelected: undefined,
        sessionsEnded: false,
        /** Viewer-local attention: domain → { key, tone, since, seen } (seen once the operator was clearly active). */
        attention: new Map(),
        /** Meaningful interactions with this page (keys, clicks) since it opened. */
        interactions: 0,
        /** The complete task inventory in the viewer's chosen order (loaded on the Tasks page). */
        tasks: { items: null, sort: 'smart', descending: false, filter: { text: '', readiness: '', agent: '', kind: '', purpose: '' }, showSupporting: false, supporting: 0, firstSupporting: null, total: 0, choices: null, revision: -1, request: 0 },
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
        /** Unsaved Book editor drafts by source path: { text, revision } (closing the editor never loses them). */
        bookDrafts: new Map(),
        /** Unsaved drafts of ordinary text files edited in the desktop workspace (kept across closing and failed saves). */
        textDrafts: new Map(),
        /** The chat this view started voice in (leaving that chat view ends its call, as closing a terminal chat does). */
        voiceOwner: null,
        /** Voice guidance shown in a chat after a refused start (setup, unsupported harness), by chat name. */
        voiceNotes: new Map(),
        /** Replay players of recorded messages, by `chat#message#segment` (kept across re-renders while playing). */
        players: new Map(),
        /** The identity of this Files view: successive imports from it into one folder share a commit batch. */
        filesView: `files-${Math.random().toString(36).slice(2, 10)}`,
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

    /** Calls the local API and returns the status with the body, also for an expected non-2xx outcome (409 conflict). */
    async function apiRaw(path, options = {}) {
        const response = await fetch(path, {
            method: options.method || 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { ...(options.raw ? {} : { 'Content-Type': 'application/json' }), 'X-PTBK-Client': 'dashboard', ...(state.csrf ? { 'X-PTBK-CSRF': state.csrf } : {}) },
            body: options.raw ? options.raw : options.body ? JSON.stringify(options.body) : undefined,
        });
        return { status: response.status, data: await response.json().catch(() => ({})) };
    }

    /** Short transient feedback (in addition to the persistent status). */
    function toast(text) {
        const element = h('div', { className: 'toast', role: 'status' }, text);
        document.body.append(element);
        setTimeout(() => element.remove(), 3500);
    }

    /**
     * The Voice indicator of a spoken message (the same rule as the terminal), or '' for a typed one: its durable
     * CHAT MESSAGE AUDIO recording with the actual capture state, or, during its call, a recording that still finalizes
     * or could not be saved.
     */
    function messageVoiceLabel(audio, live) {
        if (audio && audio.length) {
            const state = audio.some((segment) => segment.status === 'incomplete') ? 'recording incomplete' : audio.some((segment) => segment.status === 'interrupted') ? 'recording interrupted' : 'recording available';
            return `Voice · ${audio.length > 1 ? `${state} · ${audio.length} segments` : state}`;
        }
        if (live === 'finalizing' || live === 'saved') return 'Voice · recording finalizing…';
        if (live === 'unavailable') return 'Voice · recording unavailable';
        return '';
    }

    /** Whether a voice call view is still live (not ended or failed). */
    function voiceLive(call) {
        return Boolean(call) && call.state !== 'ended' && call.state !== 'failed';
    }

    /**
     * Hands a voice intent for one chat to this desktop window's shell, which owns the call's media and microphone:
     * the shell refuses this popup and acts only on its own view token, so this page never navigates. The project API
     * itself never starts calls.
     */
    function desktopVoice(action, chat) {
        if (!desktopIntent) return;
        const target = new URL('/.ptbk-desktop/voice', location.origin);
        target.searchParams.set('intent', desktopIntent);
        target.searchParams.set('action', action);
        target.searchParams.set('chat', chat);
        window.open(target.href, '_blank', 'noopener,noreferrer');
    }

    /**
     * Starts voice in the open chat through the shared availability check: unsupported or incomplete setup is shown in
     * this chat with its next action; otherwise the shell starts the call bound to this chat (navigation never retargets it).
     */
    async function startVoice(name) {
        const key = `voice:${name}`;
        if (state.busy.has(key)) return;
        state.busy.add(key);
        state.voiceNotes.delete(name);
        render(state.snapshot);
        try {
            const report = await api(`/api/chats/${encodeURIComponent(name)}/voice`);
            if (!report.selected) state.voiceNotes.set(name, report.guidance || 'No voice-capable harness is ready. Text chat keeps working.');
            else {
                state.voiceOwner = name;
                desktopVoice('start', name);
            }
        } catch (error) {
            state.voiceNotes.set(name, `Voice is not available: ${error.message}. Text chat keeps working.`);
        } finally {
            state.busy.delete(key);
        }
        render(state.snapshot);
    }

    /**
     * Starts voice in a new chat before its first message: the view's ordinary Book is prepared (no message, nothing
     * dispatched) with the same request key as its first send, the unsent draft moves with it, and voice starts there.
     */
    async function startVoiceInNewChat(agent) {
        if (state.busy.has('new-chat')) return;
        state.busy.add('new-chat');
        render(state.snapshot);
        let name;
        try {
            state.newChatKey = state.newChatKey || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            name = (await api('/api/chats', { method: 'POST', body: { open: true, ...(agent ? { agent } : {}), requestKey: state.newChatKey } })).name;
            state.newChatKey = null;
            const draft = state.drafts.get('chat:new');
            if (draft) state.drafts.set(`chat:${name}`, draft);
            state.drafts.delete('chat:new');
        } catch (error) {
            toast(`Voice not started: ${error.message}`);
        } finally {
            state.busy.delete('new-chat');
        }
        if (!name) return render(state.snapshot);
        openChat(name);
        await startVoice(name);
    }

    /** A call control from the owning chat (mute, unmute, end), carried out by this window's shell. */
    function voiceControl(name, action) {
        if (action === 'end' && state.voiceOwner === name) state.voiceOwner = null;
        desktopVoice(action, name);
    }

    /** Plays one recorded segment of a message (inspection only: nothing is resent or dispatched). */
    async function replayRecording(name, message, segment) {
        const key = `${name}#${message}#${segment}`;
        if (state.players.has(key)) return;
        try {
            const response = await fetch(`/api/chats/${encodeURIComponent(name)}/audio?message=${message}&segment=${segment}`, { credentials: 'same-origin', cache: 'no-store', headers: { 'X-PTBK-Client': 'dashboard', ...(state.csrf ? { 'X-PTBK-CSRF': state.csrf } : {}) } });
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
            const source = URL.createObjectURL(await response.blob());
            const player = h('audio', { controls: true, src: source, preload: 'auto', 'aria-label': `Recording of message ${message}${segment ? `, segment ${segment + 1}` : ''}` });
            state.players.set(key, player);
            // Only a few players stay loaded; the oldest are released.
            while (state.players.size > 8) {
                const [oldest, element] = state.players.entries().next().value;
                URL.revokeObjectURL(element.src);
                state.players.delete(oldest);
            }
            render(state.snapshot);
            player.play().catch(() => undefined);
        } catch (error) {
            toast(`Recording unavailable: ${error.message}`);
        }
    }

    /** The Voice indicator, actual capture state and replay of one spoken message (typed messages get nothing). */
    function renderMessageVoice(name, message, position, live) {
        const label = messageVoiceLabel(message.audio, live);
        if (!label) return null;
        const segments = message.audio || [];
        return h(
            'div',
            { className: 'message-voice' },
            h('span', { className: 'voice-badge' }, 'Voice'),
            h('span', { className: 'muted' }, label.replace(/^Voice · /, '')),
            ...segments.map((_segment, index) => state.players.get(`${name}#${position}#${index}`) || h('button', { className: 'small', 'aria-label': `Play the recording of message ${position}${segments.length > 1 ? `, segment ${index + 1}` : ''}`, onclick: () => replayRecording(name, position, index) }, segments.length > 1 ? `▶ ${index + 1}` : '▶ Play')),
        );
    }

    /**
     * The call of the open chat: its actual state, provisional captions and problems, and in a desktop window its
     * microphone, sound and End controls (bound to this chat, never to whichever chat is displayed later).
     */
    function renderVoicePanel(name, call) {
        const live = voiceLive(call);
        if (!live && !(call.archive || []).length && Date.now() - Date.parse(call.endedAt || '') > 30000) return null;
        const labels = {
            connecting: 'connecting…',
            'awaiting-browser': call.mic === 'denied' ? 'microphone denied: allow it for Promptbook, then start voice again' : call.mic === 'missing' ? 'no microphone found' : call.playback === 'blocked' ? 'click the voice view to allow sound' : call.page === 'connected' ? 'waiting for the microphone: allow it when asked' : 'preparing the voice view…',
            listening: 'listening',
            speaking: `${call.agent} is speaking`,
            reconnecting: 'the voice view closed; it reconnects or the call ends',
            ending: 'ending…',
            ended: 'ended',
            failed: 'failed',
        };
        return h(
            'div',
            { className: `voice-panel${live ? ' live' : ''}`, role: 'status', 'aria-label': 'Voice call' },
            h('div', {}, h('span', { className: 'voice-badge' }, 'Voice'), ` ${labels[call.state] || call.state}`, live ? h('span', { className: 'muted' }, ` · microphone ${call.micMuted ? 'muted' : 'on'} · sound ${call.outputMuted ? 'muted' : 'on'}${call.tool ? ` · ${call.tool}` : ''}`) : null),
            call.captions && call.captions.user ? h('div', { className: 'muted caption' }, `You (provisional): ${call.captions.user}`) : null,
            call.captions && call.captions.assistant ? h('div', { className: 'muted caption' }, `${call.agent} (provisional): ${call.captions.assistant}`) : null,
            call.problem ? h('div', { className: 'warn' }, call.problem) : null,
            ...(call.archive || []).slice(-2).map((problem) => h('div', { className: 'warn' }, problem)),
            live && desktopIntent
                ? h(
                      'div',
                      { className: 'row voice-controls' },
                      h('button', { onclick: () => voiceControl(name, call.micMuted ? 'unmute-mic' : 'mute-mic') }, call.micMuted ? 'Unmute microphone' : 'Mute microphone'),
                      h('button', { onclick: () => voiceControl(name, call.outputMuted ? 'unmute-output' : 'mute-output') }, call.outputMuted ? 'Unmute sound' : 'Mute sound'),
                      h('button', { className: 'danger', onclick: () => voiceControl(name, 'end') }, 'End voice chat'),
                  )
                : null,
        );
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
        if (restartable && stateName !== 'stopping') actions.push({ action: 'restart', label: 'Restart', confirm: 'Restart the service? Active work finishes or checkpoints first; then exactly one replacement starts with the same configuration.' });
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
                return health.length ? `${task} is settling at its nearest safe point and keeps its checkpoint. ${byHealth}.` : `${task} is settling at its nearest safe point and keeps its checkpoint; no task continues until you resume. Chats stay available.`;
            case 'pause':
                return health.length ? `${byHealth}; scheduling resumes once every reason is gone.` : 'Alive and controllable; no task runs, continues or starts. Chats stay available.';
            case 'stopping':
                if (lifecycle.intent === 'force-stop') return 'Force stop: owned work is being interrupted (recoverable).';
                if (lifecycle.shutdown) return lifecycle.intent === 'restart' ? 'Shutting down for a restart; one replacement starts next.' : 'Shutting down.';
                return `${task} finishes or checkpoints first; then the service ${lifecycle.intent === 'restart' ? 'restarts (exactly one replacement)' : 'exits'}.`;
            case 'stopped':
                return 'No engine is running (an observation, not a live state). Start it with ptbk start.';
            default:
                return 'The finite run ended.';
        }
    }

    /**
     * Reports a displayed calling message as seen (once), only while this page is visible and the operator used it within
     * the last ten seconds: a chat left open unattended sees nothing. Seeing never answers or resolves the question.
     */
    function markSeen(name, message, element) {
        const key = `${name}#${message}`;
        if (!message || !element?.isConnected || state.chat?.name !== name || state.seenSent.has(key) || document.visibilityState !== 'visible' || !document.hasFocus() || Date.now() - (state.lastInput || 0) > 10000) return;
        state.seenSent.add(key);
        api(`/api/chats/${encodeURIComponent(name)}/seen`, { method: 'POST', body: { messages: [message] } }).then(
            () => {
                if (element) element.classList.remove('pinged');
                if (state.chat && state.chat.name === name) loadChat(name);
            },
            () => state.seenSent.delete(key),
        );
    }

    /** Real input can make an already intersecting message actively viewed without changing its intersection. */
    function acknowledgeVisibleChat() {
        const thread = app.querySelector('.messages[data-chat]');
        if (!thread) return;
        const viewport = thread.getBoundingClientRect();
        for (const article of thread.querySelectorAll('.message.pinged')) {
            const bounds = article.getBoundingClientRect();
            if (bounds.bottom > Math.max(0, viewport.top) && bounds.top < Math.min(window.innerHeight, viewport.bottom)) markSeen(thread.dataset.chat, Number(article.dataset.message), article);
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
        // Opening a conversation is the operator's own action: its displayed messages count as actively viewed.
        state.lastInput = Date.now();
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
    function composer(key, label, onSend, disabled, extras = []) {
        const field = h('textarea', { 'data-draft': key, 'aria-label': label, placeholder: 'Type a message…', disabled });
        field.value = state.drafts.get(key) || '';
        field.addEventListener('input', () => state.drafts.set(key, field.value));
        field.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (field.value.trim()) onSend(field.value);
            }
        });
        return h('div', { className: 'composer' }, field, h('div', { className: 'row composer-actions' }, h('button', { className: 'primary', disabled, onclick: () => (field.value.trim() ? onSend(field.value) : field.focus()) }, 'Send'), ...extras, h('span', { className: 'muted' }, 'Ctrl+Enter sends')));
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
        const header = h('div', { className: 'conversation-header' });
        const heading = desktop ? header : card;
        heading.append(
            h(
                'h2',
                {},
                // The evolving title leads; the declared name stays the inspectable, copyable identity.
                h('span', {}, summary.title || summary.name),
                h('span', { className: 'row' }, pill(summary.status === 'waiting-for-user' ? 'waiting for you' : summary.status, summary.status === 'waiting-for-user' ? 'warn' : summary.status === 'open' ? 'ok' : ''), h('button', { onclick: () => ((state.chat = null), render(state.snapshot)) }, 'Close')),
            ),
        );
        if (summary.title && summary.title !== summary.name) heading.append(h('div', { className: 'meta muted chat-name', title: 'The chat’s name (its identity)' }, `{${summary.name}}`));
        const persistence = summary.persistence ? (summary.persistence.state === 'failed' ? ` · saved, commit failing (${summary.persistence.failure || 'retrying'})` : ' · saved, commit pending') : '';
        heading.append(h('div', { className: 'meta muted' }, `${summary.members.join(', ')} · ${summary.path}${summary.links.length ? ` · links ${summary.links.join(', ')}` : ''}${persistence}`));
        if (desktop) card.append(header);
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
                            ...(task.receipts || []).map((receipt) => h('div', { className: 'muted' }, receipt)),
                            h('a', { href: '#/tasks', onclick: () => openPage('tasks') }, 'Open in Tasks'),
                        ),
                    ),
                ),
            );
        }
        const thread = h('div', { className: 'messages', role: 'log', 'aria-live': 'polite', 'data-chat': summary.name });
        // Unseen explicit User pings: actually displaying one to an active viewer marks it seen for every client
        // (the question keeps waiting; seeing never answers it).
        const unseen = new Set((summary.pings || []).map((ping) => ping.message));
        /** Messages the chat's call saved from speech, with their recording state (before the durable binding exists). */
        const spoken = new Map(((chat.detail.voice && chat.detail.voice.spoken) || []).map((entry) => [entry.message, entry.recording]));
        state.chatObserver?.disconnect();
        const observer = unseen.size && 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && markSeen(summary.name, Number(entry.target.dataset.message), entry.target)), { root: thread, threshold: 0 }) : null;
        state.chatObserver = observer;
        for (const item of collapseThinking(messages)) {
            // A final reply's interim progress collapses into Thinking with its real duration; it can be expanded.
            if (item.kind === 'thinking') {
                thread.append(h('details', { className: 'thinking' }, h('summary', {}, `${item.sender} · Thinking${item.elapsedMs !== undefined ? ` · ${duration(item.elapsedMs)}` : ''}`), item.messages.map((message) => h('div', { className: 'text muted' }, message.text))));
                continue;
            }
            const message = item.message;
            const user = message.sender.replace(/^@/, '').toLowerCase() === 'user';
            const position = messages.indexOf(message) + 1;
            const pinged = unseen.has(position);
            const article = h(
                'article',
                { className: `message ${user ? 'user' : 'agent'}${message.phase === 'progress' ? ' progress' : ''}${pinged ? ' pinged' : ''}`, 'data-message': String(position) },
                h('div', { className: 'meta' }, h('strong', {}, user ? 'You' : message.sender), ` · ${time(message.at)}${message.phase === 'progress' ? ' · working…' : ''}`, pinged ? h('span', { className: 'warn' }, ' · asks you (new)') : null),
                h('div', { className: 'text' }, message.text),
                message.choices && message.choices.length ? h('div', { className: 'muted' }, `Offered: ${message.choices.join(' | ')}`) : null,
                // A spoken message's Voice indicator and replay (its CHAT MESSAGE AUDIO is another form of this same
                // message, distinct from attachments); typed messages keep their ordinary presentation.
                renderMessageVoice(summary.name, message, position, spoken.get(position)),
            );
            thread.append(article);
            if (pinged && observer) observer.observe(article);
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
        // Outstanding requests: the responsible agent and its actual relevance check (shown, never triggered).
        for (const request of chat.detail.requests || []) {
            const check = request.check;
            const status = !check ? '' : check.state === 'paused' ? 'its automatic check waits while the engine is paused' : check.state === 'unavailable' ? `its check is pending${check.lastOutcome ? ` (${check.lastOutcome})` : ''}` : check.state === 'checking' ? 'checking whether it is still needed now' : `checks whether it is still needed at ${time(check.nextAt)}`;
            thread.append(h('p', { className: 'muted request-supervision' }, `Message ${request.message} waits for you · ${request.owner} is responsible${status ? ` and ${status}` : ''}.`));
        }
        card.append(thread);
        const busy = state.busy.has(summary.name);
        if (summary.humanFacing || summary.joinable) {
            if (summary.awaiting && summary.awaiting.choices && summary.awaiting.choices.length && summary.status === 'waiting-for-user') {
                card.append(h('div', { className: 'choices', role: 'group', 'aria-label': 'Offered answers' }, summary.awaiting.choices.map((choice) => h('button', { className: 'primary', disabled: busy, onclick: () => sendMessage(summary.name, choice, messages.length) }, choice))));
            }
            if (!summary.humanFacing) card.append(h('p', { className: 'muted' }, 'An agent thread: your first message adds you as a participant.'));
            // Voice belongs to this chat view: its call state and controls sit with the composer, which keeps working.
            const call = chat.detail.voice;
            if (call) {
                const panel = renderVoicePanel(summary.name, call);
                if (panel) card.append(panel);
            }
            const voiceStart = desktopIntent && summary.humanFacing && !voiceLive(call) ? [h('button', { className: 'voice-start', disabled: state.busy.has(`voice:${summary.name}`), onclick: () => startVoice(summary.name) }, 'Start voice chat')] : [];
            card.append(composer(`chat:${summary.name}`, `Message to ${summary.agent || 'the agent'}`, (text) => sendMessage(summary.name, text, messages.length), busy, voiceStart));
            if (state.voiceNotes.has(summary.name)) card.append(h('div', { className: 'notice warning', role: 'status' }, state.voiceNotes.get(summary.name)));
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
            card.append(composer('chat:new', `First message to ${chatter.name}`, (text) => startChat(chatter.reference, text), state.busy.has('new-chat'), desktopIntent ? [h('button', { className: 'voice-start', disabled: state.busy.has('new-chat'), onclick: () => startVoiceInNewChat(chatter.reference) }, 'Start voice chat')] : []));
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
            card.append(composer('chat:new', 'First message', (text) => startChat(select.value, text), state.busy.has('new-chat'), desktopIntent ? [h('button', { className: 'voice-start', disabled: state.busy.has('new-chat'), onclick: () => startVoiceInNewChat(select.value) }, 'Start voice chat')] : []));
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

    /** What a harness session serves, in one phrase. */
    function sessionWorkLabel(session) {
        const work = session.work;
        if (work.kind === 'task') return `task "${work.task}"${work.occurrence ? ` (occurrence ${work.occurrence})` : ''}`;
        if (work.kind === 'chat') return `chat {${work.chat}}`;
        return work.purpose;
    }

    /** The common selected-session detail: it exists for every session, whatever its native support. Unknown stays unknown. */
    function renderSessionDetail(session) {
        const receiptsOf = (target) => ((state.snapshot && state.snapshot.taskControl && state.snapshot.taskControl.receipts) || []).filter((receipt) => receipt.session === target.handle || (!receipt.session && target.work.kind === 'task' && receipt.source === target.work.source));
        const usage = session.usage && Object.keys(session.usage).length ? Object.entries(session.usage).map(([field, value]) => `${field} ${value}`).join(' · ') : 'unknown for the latest turn';
        const billing = session.authentication === 'account' ? `native account${session.account ? ` (${session.account})` : ''}, its plan pays` : session.authentication === 'api' ? 'API key, billed through it' : session.authentication === 'none' ? 'no authentication' : 'unknown';
        const rows = [
            ['Agent', session.agent],
            ['Serves', sessionWorkLabel(session)],
            ['State', `${session.state} · observed ${time(session.observedAt)}${session.endedAt ? ` · ended ${time(session.endedAt)}` : ''}`],
            ...(session.detail ? [['Now', session.detail]] : []),
            ...(session.endReason ? [['Ended', session.endReason]] : []),
            ['Tool', `${session.tool || 'no named tool'} · ${session.harnessName}${session.harnessVersion ? ` ${session.harnessVersion}` : ''}`],
            ['Billing', billing],
            ['Model', session.model ? `${session.model} (reported)` : session.requestedModel ? `${session.requestedModel} (requested)` : 'harness default'],
            ...(session.thinkingLevel ? [['Thinking', session.thinkingLevel]] : []),
            ['Turns', `${session.turns}${session.lastOutcome ? ` · latest ${session.lastOutcome}` : ''}`],
            ['Usage', usage],
            ['Control', session.lease ? `${session.lease.mode} by ${session.lease.holder}` : 'Promptbook (autonomous)'],
            ...(session.heldInputs && session.heldInputs.length ? [['Held', session.heldInputs.join('; ')]] : []),
            ['Provider', session.providerIds.length ? session.providerIds.join(', ') : 'no session identifier reported'],
            ...(session.predecessor ? [['Replaces', `${session.predecessor.handle}: ${session.predecessor.reason}`]] : []),
        ];
        return [
            h('dl', { className: 'kv' }, rows.map(([key, value]) => [h('dt', {}, key), h('dd', {}, value)])),
            ...(receiptsOf(session).length ? [h('h3', {}, 'Instructions'), h('ul', { className: 'list' }, receiptsOf(session).map((receipt) => h('li', {}, `${receipt.state}: ${receipt.reason || ''}${receipt.next ? ` Next: ${receipt.next}` : ''}`)))] : []),
            session.capabilities && session.capabilities.notes.length ? h('ul', { className: 'list' }, session.capabilities.notes.map((note) => h('li', { className: 'muted' }, note))) : null,
            h('p', { className: 'muted' }, 'The browser has no terminal of the actual harness client: this read-only view is what it offers. Native entry is available in the terminal dashboard where the harness supports it.'),
            h('h3', {}, 'Events'),
            session.output.length ? h('pre', {}, session.output.join('\n')) : h('p', { className: 'muted' }, 'No events observed yet.'),
        ];
    }

    /** The Harnesses page: open sessions, retained ended evidence and the common detail of the selected one. */
    function renderHarnesses(snapshot) {
        const card = h('section', { className: 'card work', 'aria-label': 'Harnesses' });
        const inventory = snapshot.harnessSessions || { open: [], ended: [], counts: { open: 0, working: 0, idle: 0, waiting: 0 } };
        const rows = state.sessionsEnded ? inventory.ended : inventory.open;
        const selected = rows.find((session) => session.handle === state.sessionSelected) || rows[0];
        card.append(h('h2', {}, h('span', {}, state.sessionsEnded ? 'Ended sessions (retained evidence)' : 'Open sessions'), pill(`${inventory.counts.open} open`, inventory.counts.open ? 'ok' : '')));
        card.append(h('p', { className: 'muted' }, `${inventory.counts.working} working · ${inventory.counts.idle} idle · ${inventory.counts.waiting} waiting · `, h('a', { href: '#', onclick: (event) => (event.preventDefault(), (state.sessionsEnded = !state.sessionsEnded), (state.sessionSelected = undefined), render()) }, state.sessionsEnded ? 'Show open sessions' : `Show ended sessions (${inventory.ended.length})`)));
        if (rows.length) {
            card.append(
                h(
                    'ul',
                    { className: 'list work-units' },
                    rows.map((session) =>
                        h(
                            'li',
                            { className: selected && session.handle === selected.handle ? 'selected' : '' },
                            h('a', { href: '#', className: 'title', onclick: (event) => (event.preventDefault(), (state.sessionSelected = session.handle), render()) }, `${session.agent} · ${sessionWorkLabel(session)}`),
                            h('span', { className: 'muted' }, ` ${session.state}${session.lease ? ` · ${session.lease.mode} control` : ''} · ${session.harnessName}${session.tool ? ` (${session.tool})` : ''}`),
                        ),
                    ),
                ),
            );
        } else card.append(h('p', { className: 'muted' }, state.sessionsEnded ? 'No ended session retained.' : 'No session is open. A session opens when an agent starts work or replies in a chat.'));
        if (selected) card.append(...renderSessionDetail(selected).filter(Boolean));
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

    /** Every named browser tool the engine reports (older engines: the single project browser). */
    function browsersOf(snapshot) {
        return snapshot.browsers && snapshot.browsers.length ? snapshot.browsers : snapshot.browser ? [snapshot.browser] : [];
    }

    /** Whether a user-controlled tab is over (returned, ended or lost). */
    function controlOver(control) {
        return control.state === 'returned' || control.state === 'ended' || control.state === 'lost';
    }

    /**
     * The manual sign-in of a Wallet request (shared state only): tab ownership and the awaited handoff are shown apart
     * from the request's authentication; the live viewer and its choices are in the terminal or the desktop app.
     */
    function manualSignInNote(snapshot, action) {
        const control = (snapshot.tabControls || []).filter((candidate) => candidate.request === action.id).pop();
        if (!control) return null;
        if (controlOver(control)) return h('div', { className: 'muted' }, `Manual sign-in: ${control.outcome || control.problem || 'ended'}`);
        const parts = [`You are signing in manually in a tab of the ${control.browser} browser (${control.mode}); it stays with you until you return control to the agent.`];
        parts.push(control.viewer === 'connected' ? 'The viewer is open.' : 'No viewer is open; reopen it from the terminal or the desktop app.');
        if (control.signIn && control.signIn.detected) parts.push(`Sign-in to ${control.signIn.origin || action.origin} detected.`);
        if (control.offer) parts.push(`Wallet offers to ${control.offer.kind === 'update' ? 'update the saved password' : 'save the password'} of ${control.offer.account}; answer where you control the tab.`);
        return h('div', { className: 'notice' }, parts.join(' '));
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
                // Tabs a user controls live: who has each and that it awaits the explicit handoff (shown, not controlled, here).
                const controlled = (snapshot.tabControls || []).filter((control) => control.browser === browser.name && !controlOver(control));
                if (controlled.length) rows.push(['User control', controlled.map((control) => `${control.purpose === 'wallet' ? 'manual sign-in' : 'a tab'}${control.task ? ` taken from ${control.task}` : ''}${control.url ? ` at ${control.url}` : ''} · ${control.viewer === 'connected' ? 'viewer open' : 'no viewer open'} · awaiting the user's handoff${control.requestSettled ? ` · ${control.requestSettled}` : ''}`).join('; ')]);
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
            fields.push(formSelect(form, 'type', 'Type', [{ value: 'HARNESS', label: 'Harness' }, { value: 'BROWSER', label: 'Browser' }, { value: 'COMPUTER_CONTROL', label: 'Computer control' }]));
            fields.push(
                type === 'COMPUTER_CONTROL'
                    ? formSelect(form, 'variant', 'Variant', [{ value: 'NATIVE', label: 'Native desktop' }])
                    : type === 'BROWSER'
                    ? formSelect(form, 'variant', 'Variant', [{ value: 'CHROME', label: 'Chrome (or another Chrome-compatible browser)' }, { value: 'CHROMIUM', label: 'Chromium' }, { value: 'EDGE', label: 'Microsoft Edge' }])
                    : formSelect(form, 'variant', 'Variant', [{ group: 'Featured', options: featured.map(variantOf) }, ...(state.showAllVariants ? [{ group: 'More', options: more.map(variantOf) }] : [])]),
            );
            if (type === 'HARNESS') fields.push(h('button', { type: 'button', onclick: () => ((state.showAllVariants = !state.showAllVariants), render(state.snapshot)) }, state.showAllVariants ? 'Featured only' : 'More…'));
            fields.push(formField(form, 'name', 'Name (kebab-case)', { placeholder: type === 'BROWSER' ? 'work-browser' : 'codex-company' }));
        } else fields.push(formField(form, 'rename', 'Name', {}));
        fields.push(formField(form, 'description', 'Description (optional)', {}));
        if (type === 'BROWSER') {
            fields.push(formSelect(form, 'profileSource', 'Profile', [{ value: 'MANAGED_GLOBAL', label: 'Dedicated Promptbook profile (shared by your projects)' }, { value: 'PROJECT', label: 'Isolated project profile (.ptbk/)' }, { value: 'USER_EXISTING', label: 'Your existing Chrome profile' }, { value: 'CUSTOM', label: 'Custom path' }]));
            if (values.profileSource === 'CUSTOM') fields.push(formField(form, 'profilePath', 'Profile path', {}));
            fields.push(formSelect(form, 'isHeadless', 'Window', [{ value: 'true', label: 'Headless (no window)' }, { value: 'false', label: 'Visible window' }]));
        } else if (type === 'HARNESS') {
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
            const secret = type === 'HARNESS' && values.authentication === 'API_KEY' && values.apiKeyValue ? { variable: text('apiKeyEnv'), value: values.apiKeyValue } : undefined;
            const operation =
                form.mode === 'add'
                    ? { kind: 'add', tool: { type, variant: values.variant, name: text('name'), ...common, ...(type === 'COMPUTER_CONTROL' ? {} : type === 'BROWSER' ? browserFields : harnessFields) } }
                    : { kind: 'modify', name: form.name, ...(text('rename') && text('rename') !== form.name ? { rename: text('rename') } : {}), changes: { description: text('description') || null, ...(type === 'COMPUTER_CONTROL' ? {} : type === 'BROWSER' ? { ...browserFields, ...(values.profileSource !== 'CUSTOM' ? { profilePath: null } : {}) } : { ...harnessFields, baseUrl: text('baseUrl') || null }) } };
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
                            item.type === 'COMPUTER_CONTROL' ? h('a', { href: '/computer', target: '_blank', rel: 'noopener' }, 'Open desktop') : null,
                            item.type === 'COMPUTER_CONTROL' ? h('button', { onclick: () => control('computer-permissions') }, 'Permissions') : null,
                            item.type === 'COMPUTER_CONTROL' ? h('button', { onclick: () => control('computer-pause') }, 'Pause desktop') : null,
                            item.type === 'COMPUTER_CONTROL' ? h('button', { onclick: () => control('computer-resume') }, 'Resume desktop') : null,
                            item.type === 'COMPUTER_CONTROL' ? h('button', { className: 'danger', onclick: () => control('computer-stop') }, 'Stop desktop') : null,
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
                    ['Next attempt', sync.suspended || time(sync.nextAttemptAt) || 'unknown'],
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

    /**
     * The general operational log on the System page: runtime events, current/last errors and automatic repair
     * progress. Inspectable without attention; each task keeps its own outcome in Tasks.
     */
    function renderOperationalLog(snapshot) {
        const card = h('section', { className: 'card activity', 'aria-label': 'Operational log' });
        card.append(h('h2', {}, h('span', {}, 'Operational log'), h('span', { className: 'muted' }, `${snapshot.activity.length} events`)));
        const log = h('div', { className: 'log', role: 'log', 'aria-live': 'off' }, snapshot.activity.slice(-150).map((line) => h('div', { className: line.level }, `${time(line.at)}  ${line.text}`)));
        card.append(log);
        if (snapshot.errors.length) card.append(h('h3', {}, 'Recent errors'), h('ul', { className: 'list' }, snapshot.errors.slice(-5).map((error) => h('li', {}, h('span', { className: 'title' }, error.summary, h('span', { className: 'why' }, `${time(error.at)}${error.next ? ` · next: ${error.next}` : ''}`))))));
        requestAnimationFrame(() => {
            log.scrollTop = log.scrollHeight;
        });
        return card;
    }

    /** App connection states: label and tone, the same words as the terminal's App page. */
    const APP_STATES = {
        linked: ['Linked', 'ok'],
        connecting: ['Connecting', 'warn'],
        refused: ['Refused', 'bad'],
        problem: ['Problem', 'bad'],
        unlinked: ['Not linked', ''],
        offline: ['Offline (engine stopped)', ''],
    };

    /** The App connection's state as a label and a tone. */
    function appState(app) {
        const known = app && APP_STATES[app.state];
        return known ? { label: known[0], tone: known[1] } : { label: app ? 'Not connected in this run' : 'Not reported by this engine', tone: '' };
    }

    /** `n of m relays` of a linked project. */
    function relaySummary(app) {
        const connected = app.relays.filter((relay) => relay.state === 'connected').length;
        return `${connected} of ${app.relays.length} relay${app.relays.length === 1 ? '' : 's'}`;
    }

    /**
     * Whether the project opens from the App now, and what it still waits for (the terminal page says the same).
     */
    function browserAccessText(app) {
        if (app.browserAccess === 'available') return app.owner === 'none' ? 'Opening this project from the App works, but nobody can sign in yet: run `ptbk connect --setup-link` in this project to set up your passkey.' : 'Opening this project from the App works: sign in there with your passkey.';
        if (!app.relays.some((relay) => relay.state === 'connected')) return 'Opening this project from the App waits for a connected relay.';
        const certificate = app.certificate;
        if (certificate && certificate.state === 'failed') return `Opening this project from the App waits for the engine's own certificate: ${certificate.problem || 'issuing it failed'}${certificate.retryAt ? ` (retry ${time(certificate.retryAt)})` : ''}.`;
        return "Opening this project from the App waits for the engine's own certificate, which it is getting through the relay.";
    }

    /** One heartbeat outcome. */
    function heartbeatOutcome(beat) {
        if (beat.outcome === 'accepted') return h('span', { className: 'ok' }, 'accepted');
        if (beat.outcome === 'refused') return h('span', { className: 'bad' }, `refused${beat.status ? ` (HTTP ${beat.status}${beat.code ? `, ${beat.code}` : ''})` : ''}`);
        return h('span', { className: 'warn' }, 'not delivered');
    }

    /** Applies a pairing change through the authenticated local API. */
    async function appPairing(action, link) {
        if (state.busy.has('app-pairing')) return;
        state.busy.add('app-pairing');
        try {
            const result = await api('/api/app-pairing', { method: 'POST', body: { action, link } });
            toast(result.outcome);
        } catch (error) {
            toast(`Pairing change failed: ${error.message}`);
        } finally {
            state.busy.delete('app-pairing');
        }
    }

    /** Shows the App connection and its local operator actions. */
    function renderApp(snapshot) {
        const app = snapshot.app;
        const state = appState(app);
        const card = h('section', { className: 'card app', 'aria-label': 'App' }, h('h2', {}, h('span', {}, 'App'), pill(state.label, state.tone)));
        if (!app || app.state === 'disabled') {
            card.append(h('p', { className: 'muted' }, app ? 'This engine run keeps no App connection (maintenance).' : 'This engine does not report an App connection.'));
            return card;
        }
        if (app.problem) card.append(h('p', { className: 'bad' }, app.problem));
        const rows = [];
        if (app.engineId) rows.push(['Engine ID', h('code', {}, app.engineId)]);
        if (app.fingerprint) rows.push(['Fingerprint', h('span', {}, h('code', {}, app.fingerprint), h('span', { className: 'muted' }, ' · compare with the App dashboard'))]);
        const list = () => h('dl', { className: 'kv' }, rows.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value)]));
        if (!app.hostname && app.state !== 'connecting' && app.state !== 'offline') {
            if (rows.length) card.append(list());
            card.append(h('p', { className: 'muted' }, 'Get a link code at ', h('a', { href: app.dashboardUrl, target: '_blank', rel: 'noopener noreferrer' }, app.dashboardUrl.replace(/^https:\/\//, '').replace(/\/$/, '')), ', then paste the full pairing URL here.'));
            const input = h('input', { type: 'password', required: true, autocomplete: 'off', 'data-draft': 'app:pairing-url', 'aria-label': 'Pairing URL', placeholder: 'Paste pairing URL' });
            card.append(h('form', { onsubmit: (event) => {
                event.preventDefault();
                const link = input.value.trim();
                input.value = '';
                if (link) void appPairing('app-link', link);
            } }, input, h('button', { type: 'submit' }, 'Pair with App')));
            return card;
        }
        if (app.hostname && app.state !== 'offline') card.append(h('button', { className: 'secondary danger', onclick: () => {
            if (window.confirm('Remove this engine’s pairing and close remote access through the relay? The account can still list this engine.')) void appPairing('app-unpair');
        } }, 'Unpair from App'));
        if (app.url) rows.push(['Address', app.browserAccess === 'available' ? h('a', { href: app.url, target: '_blank', rel: 'noopener noreferrer' }, app.url) : h('span', {}, app.url)]);
        rows.push(['App', h('span', {}, h('a', { href: app.dashboardUrl, target: '_blank', rel: 'noopener noreferrer' }, app.dashboardUrl), app.linkedAt ? h('span', { className: 'muted' }, ` · linked ${time(app.linkedAt)}`) : null)]);
        if (app.relays.length) {
            rows.push(['Relays', h('div', {}, `Connected to ${relaySummary(app)}`, h('ul', { className: 'list' }, app.relays.map((relay) => h('li', {},
                h('span', { className: 'title' }, relay.relay, ' ', pill(relay.state, relay.state === 'connected' ? 'ok' : relay.refusal ? 'bad' : relay.state === 'stopped' ? '' : 'warn'),
                    h('span', { className: 'why' }, [relay.streams ? `${relay.streams} stream${relay.streams === 1 ? '' : 's'}` : '', relay.state === 'waiting' && relay.retryAt ? `retry ${time(relay.retryAt)}` : '', relay.state !== 'connected' && relay.problem ? relay.problem : ''].filter(Boolean).join(' · ')))))))]);
        }
        const beat = app.heartbeat;
        if (beat) {
            rows.push(['Heartbeat', h('div', {},
                h('span', {}, `${time(beat.at)} `, heartbeatOutcome(beat), beat.nextAt ? h('span', { className: 'muted' }, ` · next ${time(beat.nextAt)}`) : null),
                beat.message ? h('div', { className: 'muted' }, beat.message) : null,
                beat.skewMs !== undefined ? h('div', { className: 'warn' }, `This computer's clock is ${Math.round(Math.abs(beat.skewMs) / 1000)} s ${beat.skewMs > 0 ? 'ahead of' : 'behind'} the App. Fix the clock (NTP); heartbeats more than 2 minutes off are refused.`) : null,
                beat.body ? h('details', {}, h('summary', { className: 'muted' }, 'Everything the App learns'), h('pre', {}, beat.body)) : null)]);
        }
        card.append(list());
        if (app.state === 'offline') card.append(h('p', { className: 'muted' }, 'The engine is stopped, so the App shows this project unavailable. Start it with ', h('code', {}, 'ptbk start'), '.'));
        else card.append(h('p', { className: app.browserAccess === 'available' && app.owner === 'none' ? 'warn' : 'muted' }, browserAccessText(app)));
        return card;
    }

    /** Calls the engine's shared update operation (`policy` commits its own ptbk.json change; `check` only looks up). */
    async function updateAction(body, pending) {
        toast(pending);
        try {
            const view = await api('/api/update', { method: 'POST', body });
            toast(body.action === 'policy' ? `Automatic engine updates are ${view.policy.isAutoUpdateEnabled ? 'on' : 'off'} (saved in ptbk.json and committed).` : view.target ? `ptbk ${view.target} is available; it installs when the engine has free hands.` : view.reason);
        } catch (error) {
            toast(`Failed: ${error.message}`);
        }
    }

    /** The engine-owned update policy switch on the System page and its progress (progress itself is a task in Tasks). */
    function renderEngineUpdate(update) {
        const major = update.current.replace(/^v/, '').split('.')[0];
        const tone = update.phase === 'failed' || update.phase === 'recovering' ? 'warn' : '';
        const rows = [
            ['Automatic', h('span', {}, pill(update.policy.isAutoUpdateEnabled ? 'on' : 'off', update.policy.isAutoUpdateEnabled ? 'ok' : 'warn'), h('span', { className: 'muted' }, ` updates.isAutoUpdateEnabled (${update.policy.source})`))],
            ['Allowed', update.policy.versionRange ? `updates.versionRange ${update.policy.versionRange}` : `stable minor/patch releases within major ${major}${update.current.includes('-') ? '; this prerelease advances to its stable release' : ''}`],
            ['Running', `ptbk ${update.current} (${update.installation.scope} installation)`],
            ['Latest', update.latest ? `${update.latest}${update.checkedAt ? ` · checked ${time(update.checkedAt)}` : ''}` : update.lookupProblem ? `unknown (${update.lookupProblem})` : 'not looked up yet'],
            ['Status', h('span', { className: tone }, update.reason)],
        ];
        if (update.lastOutcome) rows.push(['Last', `${update.lastOutcome.outcome} ${update.lastOutcome.from} → ${update.lastOutcome.to} · ${time(update.lastOutcome.at)} · ${update.lastOutcome.detail}`]);
        return h('section', { className: 'card', 'aria-label': 'Engine updates' },
            h('h2', {}, h('span', {}, 'Engine updates'), h('span', { className: 'row' },
                h('button', { className: update.policy.isAutoUpdateEnabled ? '' : 'primary', onclick: () => updateAction({ action: 'policy', isAutoUpdateEnabled: !update.policy.isAutoUpdateEnabled }, `Turning automatic engine updates ${update.policy.isAutoUpdateEnabled ? 'off' : 'on'}…`) }, `Turn automatic updates ${update.policy.isAutoUpdateEnabled ? 'off' : 'on'}`),
                update.isSupported ? h('button', { onclick: () => updateAction({ action: 'check' }, 'Looking up engine releases…') }, 'Check now') : null)),
            h('dl', { className: 'kv' }, rows.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value)])),
            update.target ? h('p', { className: 'muted' }, 'A pending update is a low-priority engine-owned task in Tasks; ordinary work goes first and a manual pause or stop holds it.') : null);
    }

    /** The saved keep-awake choice in words. */
    function keepAwakeMode(view) {
        if (view.mode === 'limited') return `For two hours${view.expiresAt ? ` (until ${time(view.expiresAt)})` : ''}`;
        return view.mode === 'always' ? 'Always on external power' : 'Off';
    }

    /** Calls the engine's shared keep-awake operation (the same as the terminal System page and `ptbk keep-awake`). */
    async function keepAwakeAction(body, pending) {
        toast(pending);
        try {
            const view = await api('/api/keep-awake', { method: 'POST', body });
            const lid = view.closedLid && view.lid.capability === 'approval' ? ' Closed-lid operation needs the helper: run ptbk keep-awake --install-helper in a local terminal.' : '';
            toast(`Keep awake: ${keepAwakeMode(view)}${view.closedLid ? ', closed lid on' : ''}. ${view.holding ? 'Protection is active.' : view.mode === 'off' ? 'The OS power policy applies.' : view.idle.reason.text}${lid}`);
        } catch (error) {
            toast(`Failed: ${error.message}`);
        }
    }

    /**
     * Power on the engine host (System → Power): the saved choice separately from the observed protection, idle sleep
     * and the lid separately, the power source, why protection is inactive and the last work time. Viewing it never
     * acquires anything.
     */
    function renderKeepAwake(view, working) {
        const label = (protection) => ({ active: 'active', degraded: 'degraded', unavailable: 'unavailable', 'os-policy': 'OS policy' })[protection.state] || (protection.reason.code === 'approval' ? 'needs local approval' : 'inactive');
        const tone = (protection) => (protection.state === 'active' ? 'ok' : protection.state === 'degraded' || ['approval', 'failed'].includes(protection.reason.code) ? 'warn' : '');
        const state = (protection, extra) => h('span', {}, pill(label(protection), tone(protection)), h('span', { className: 'muted' }, ` ${protection.reason.text}`), extra ? h('div', { className: 'muted' }, extra) : null);
        const source = view.power.source === 'external' ? 'External power' : view.power.source === 'battery' ? 'Battery' : 'Unknown';
        const rows = [
            ['Saved', `${keepAwakeMode(view)}${view.closedLid ? ' · closed-lid operation chosen' : ''}`],
            ['Power', h('span', { className: view.power.source === 'external' ? '' : 'warn' }, `${source}${view.power.detail ? ` (${view.power.detail})` : ''}`, view.power.observedAt ? h('span', { className: 'muted' }, ` · read ${time(view.power.observedAt)}`) : null)],
            ['Idle sleep', state(view.idle)],
            ['Lid', state(view.lid, view.lid.validation && view.lid.capability !== 'unavailable' ? view.lid.validation.text : '')],
            ['Last work', working ? 'working now' : view.lastWorkAt ? time(view.lastWorkAt) : 'no task or chat activity known on this host'],
        ];
        if (view.handoff) rows.push(['Handoff', `carrying ${view.handoff.kinds.join(' and ')} protection from the previous engine until ${time(view.handoff.until)}`]);
        const choose = (mode) => {
            if (mode === view.mode) return;
            if (mode === 'always' && !window.confirm('Keep this computer awake whenever this engine runs on external power, until you turn it off? It stays on across restarts, updates and sign-in. The engine releases it while paused, stopped or on battery; the display may still sleep and the session may lock.')) return;
            void keepAwakeAction({ mode }, mode === 'off' ? 'Turning keep awake off…' : mode === 'limited' ? 'Keeping the computer awake for two hours…' : 'Keeping the computer awake on external power…');
        };
        const buttons = [['off', 'Off'], ['limited', 'Two hours'], ['always', 'Always on external power']].map(([mode, text]) => h('button', { className: view.mode === mode ? 'primary' : '', 'aria-pressed': String(view.mode === mode), onclick: () => choose(mode) }, text));
        if (view.lid.capability !== 'unavailable') buttons.push(h('button', { 'aria-pressed': String(view.closedLid), onclick: () => void keepAwakeAction({ closedLid: !view.closedLid }, view.closedLid ? 'Turning closed-lid operation off…' : 'Choosing closed-lid operation…') }, view.closedLid ? 'Closed lid: on' : 'Closed lid: off'));
        return h('section', { className: 'card', 'aria-label': 'Power' },
            h('h2', {}, h('span', {}, 'Power · Keep awake'), view.holding ? pill('keeping this computer awake', 'ok') : null),
            h('dl', { className: 'kv' }, rows.flatMap(([name, value]) => [h('dt', {}, name), h('dd', {}, value)])),
            h('div', { className: 'row', role: 'group', 'aria-label': 'Keep awake' }, buttons),
            view.closedLid && view.lid.capability === 'approval' ? h('p', { className: 'warn' }, 'Closed-lid operation needs local administrator approval: run ', h('code', {}, 'ptbk keep-awake --install-helper'), ' in a local terminal on this computer.') : null,
            h('p', { className: 'muted' }, 'Power on the engine host. The engine holds protection only while it runs on external power and releases it while paused, stopped or on battery. Opening this page never activates it.'));
    }

    /** Operational domains: home tiles and their pages (Synchronization only while autosync is enabled). */
    // No standalone Results/Activity tile: System keeps the operational log, each task its own outcomes.
    const DOMAINS = ['harnesses', 'system', 'health', 'chats', 'tasks', 'agents', 'tools', 'wallet', 'usage', 'actions', 'history', 'files', 'app', 'sync'];

    const TITLES = { harnesses: 'Harnesses', system: 'System', health: 'Health', chats: 'Chats', tasks: 'Tasks', agents: 'Agents', tools: 'Tools', wallet: 'Wallet', usage: 'Usage', actions: 'External activity log', history: 'History', files: 'Files', app: 'App', sync: 'Synchronization' };

    /** Loads the History window (read-only: the engine never fetches or changes Git for it). */
    async function loadHistory() {
        if (state.historyLoading) return;
        state.historyLoading = true;
        try {
            const seen = state.snapshot && state.snapshot.history ? state.snapshot.history.last.sha : null;
            // The desktop workspace adds the upstream and chosen local branches; the browser keeps the current branch.
            const branches = desktop ? (state.history && state.history.branches) || [] : [];
            const query = desktop ? `&upstream=1${branches.map((branch) => `&branch=${encodeURIComponent(branch)}`).join('')}` : '';
            const [view, changes] = await Promise.all([api(`/api/history?limit=300${query}`), desktop ? api('/api/history/changes').catch((error) => ({ changes: [], protected: 0, problem: error.message })) : null]);
            state.history = { ...(state.history || {}), view, changes, changesAt: Date.now(), error: null, seen };
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
        // Current changes follow the live working tree: refreshed with engine changes, at most every few seconds.
        else if (desktop && Date.now() - (history.changesAt || 0) > 3000) setTimeout(() => state.page === 'history' && loadHistory(), 0);
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
                h('button', { 'aria-expanded': String(open), onclick: () => (open ? ((state.history = { ...history, open: null }), render(state.snapshot)) : openCommit(commit.sha)) }, commit.kind === 'agent' ? `\`${commit.visual}\` ${commit.summary}` : commit.kind === 'legacy' ? `ptbk ${commit.summary}` : commit.summary),
                h('span', { className: 'muted' }, ` ${time(commit.at)}${commit.kind === 'foreign' ? ` · ${commit.author}` : ''}${commit.refs.length ? ` · ${commit.refs.join(', ')}` : ''}`),
                open
                    ? detail
                        ? detail.error
                            ? h('p', { className: 'warn' }, detail.error)
                            : h(
                                  'div',
                                  { className: 'commit-detail' },
                                  h('p', { className: 'muted' }, `${detail.sha} · ${detail.author} <${detail.email}> · ${detail.at}${detail.parents.length > 1 ? ` · merge of ${detail.parents.map((parent) => parent.slice(0, 10)).join(', ')}` : ''}`),
                                  ...detail.links.tasks.map((task) =>
                                      h('p', {}, `Task {${task.name}} `, ...(task.path ? [h('span', { className: 'ok' }, `${task.path} `), h('button', { onclick: () => (openFiles(task.path, 'file'), openPage('files')) }, 'Open'), ' ', h('button', { onclick: () => void openBook({ path: task.path }) }, 'Edit')] : [h('span', { className: 'muted' }, '(no longer in the project)')])),
                                  ),
                                  ...detail.links.chats.map((chat) => h('p', {}, `Chat {${chat.name}} `, chat.exists && chat.name !== 'Report' ? h('button', { onclick: () => (openPage('chats'), openChat(chat.name)) }, 'Open') : h('span', { className: 'muted' }, chat.exists ? 'report.book' : '(no longer in the project)'))),
                                  h('pre', { className: 'log' }, detail.message),
                              )
                        : h('p', { className: 'muted' }, 'Loading…')
                    : null,
            );
        });
        return pageFrame(
            'history',
            `${view.detached ? 'Detached HEAD' : view.branch || 'HEAD'} · messages and topology, read-only (never fetches)`,
            desktop ? renderCurrentChanges(history.changes) : null,
            desktop ? renderBranchScope(view) : null,
            h('ul', { className: 'list history' }, ...rows),
            view.more ? h('p', { className: 'muted' }, 'Older commits are not shown here.') : null,
            view.shallow ? h('p', { className: 'warn' }, 'This is a shallow clone: older history is not available locally.') : null,
        );
    }

    /** Labels of a current change's side. */
    const CHANGE_LABELS = { added: 'added', modified: 'modified', deleted: 'deleted', renamed: 'renamed', copied: 'copied', 'type-changed': 'type changed' };

    /**
     * Desktop History's **Current Changes**: the live working tree and index (no commit SHA), grouped by conflicted,
     * staged, unstaged and untracked. Read-only: no staging, discarding or checkout. Opening a path previews it in Files.
     */
    function renderCurrentChanges(view) {
        const section = h('section', { className: 'card changes', 'aria-label': 'Current changes' }, h('h2', {}, 'Current Changes'));
        if (!view) return section.append(h('p', { className: 'muted' }, 'Loading…')), section;
        if (view.problem) return section.append(h('p', { className: 'warn' }, view.problem)), section;
        const groups = [
            ['Conflicted', view.changes.filter((change) => change.conflicted), () => 'conflicted'],
            ['Staged', view.changes.filter((change) => change.staged), (change) => CHANGE_LABELS[change.staged]],
            ['Unstaged', view.changes.filter((change) => change.unstaged), (change) => CHANGE_LABELS[change.unstaged]],
            ['Untracked', view.changes.filter((change) => change.untracked), () => 'untracked'],
        ].filter(([, items]) => items.length);
        if (!groups.length) section.append(h('p', { className: 'muted' }, 'No uncommitted changes in the project.'));
        for (const [title, items, label] of groups) {
            section.append(
                h('h3', {}, `${title} (${items.length})`),
                h(
                    'ul',
                    { className: 'list inline' },
                    ...items.map((change) => {
                        const kind = label(change);
                        const removed = kind === 'deleted';
                        return h(
                            'li',
                            {},
                            h('span', { className: `pill ${change.conflicted ? 'bad' : removed ? 'warn' : ''}` }, kind),
                            ' ',
                            removed ? h('span', {}, change.path) : h('button', { onclick: () => (openFiles(change.path, 'file'), openPage('files')) }, change.path),
                            change.from ? h('span', { className: 'muted' }, ` ← ${change.from}`) : null,
                            change.origin ? h('span', { className: 'muted' }, ` · ${change.origin.kind === 'task' ? `owned by ${change.origin.label}` : change.origin.label}`) : null,
                        );
                    }),
                ),
            );
        }
        if (view.protected) section.append(h('p', { className: 'muted' }, `${view.protected} protected path(s) (repository, runtime state or secrets) changed; they are not listed.`));
        if (view.truncated) section.append(h('p', { className: 'muted' }, 'More changes exist than are listed here.'));
        return section;
    }

    /** Desktop History's branch scope: the current branch with its upstream, and other locally known branches added on request. */
    function renderBranchScope(view) {
        const upstream = view.upstream || { state: 'none' };
        const included = view.included || [];
        const describe = view.detached
            ? 'HEAD is detached: the graph shows the checked-out commit’s history; no upstream applies.'
            : upstream.state === 'shown'
              ? `${view.branch} and its upstream ${upstream.name} (local refs; History never fetches).`
              : upstream.state === 'missing'
                ? `${view.branch}: the configured upstream ${upstream.name} is not available locally.`
                : `${view.branch} has no configured upstream.`;
        const choose = h('select', { 'aria-label': 'Add a locally known branch' }, h('option', { value: '' }, 'Add a branch…'), ...(view.available || []).filter((name) => !included.includes(name)).map((name) => h('option', { value: name }, name)));
        choose.addEventListener('change', () => {
            if (!choose.value) return;
            state.history = { ...(state.history || {}), branches: [...included, choose.value] };
            loadHistory();
        });
        return h(
            'section',
            { className: 'card', 'aria-label': 'Branches in the graph' },
            h('p', { className: upstream.state === 'missing' || view.detached ? 'warn' : 'muted' }, describe),
            h(
                'div',
                { className: 'row' },
                ...included.map((name) => h('button', { 'aria-label': `Remove ${name} from the graph`, onclick: () => ((state.history = { ...state.history, branches: included.filter((other) => other !== name) }), loadHistory()) }, `${name} ×`)),
                (view.available || []).length ? choose : null,
            ),
        );
    }

    /** Opens a folder or file in Files (read-only, confined to nonhidden project paths). */
    async function openFiles(path, kind) {
        if (workspace.enabled && kind === 'file') return openDocument(documentKind(path), path, { preview: true });
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
        const selected = files.selected || new Set();
        const entries = files.folder ? files.folder.entries : [];
        // Desktop selection gestures (Shift for a range, Ctrl/⌘ to toggle) select for bulk operations without opening.
        const select = (event, entry, index) => {
            // The current selection (never one captured by an earlier render).
            const now = state.files || {};
            const next = new Set(event.ctrlKey || event.metaKey || event.shiftKey ? now.selected || [] : []);
            if (event.shiftKey && now.anchor !== undefined) {
                const [from, to] = [Math.min(now.anchor, index), Math.max(now.anchor, index)];
                for (const item of entries.slice(from, to + 1)) if (item.type !== 'link-outside') next.add(item.path);
            } else if (next.has(entry.path)) next.delete(entry.path);
            else next.add(entry.path);
            state.files = { ...state.files, selected: next, anchor: event.shiftKey ? now.anchor : index };
            render(state.snapshot);
        };
        const list = files.folder
            ? h(
                  'ul',
                  { className: `list${desktop ? ' files-list' : ''}`, ...(desktop ? { 'aria-multiselectable': 'true' } : {}) },
                  ...entries.map((entry, index) =>
                      h(
                          'li',
                          { className: selected.has(entry.path) ? 'selected' : undefined },
                          desktop && entry.type !== 'link-outside' ? h('input', { type: 'checkbox', 'aria-label': `Select ${entry.name}`, checked: selected.has(entry.path), onclick: (event) => (event.preventDefault(), select({ ctrlKey: true, shiftKey: event.shiftKey }, entry, index)) }) : null,
                          entry.type === 'link-outside'
                              ? h('span', { className: 'muted' }, `${entry.name} → outside the project (not followed)`)
                              : h(
                                    'button',
                                    {
                                        onclick: (event) => (desktop && (event.shiftKey || event.ctrlKey || event.metaKey) ? select(event, entry, index) : workspace.enabled && entry.type === 'file' ? void openDocument(entry.kind === 'book' ? 'book' : 'file', entry.path, { preview: true }) : openFiles(entry.path, entry.type === 'directory' ? 'folder' : 'file')),
                                        // Double-click (or starting an edit) opens an ordinary text file in its editor.
                                        ondblclick: desktop && entry.type === 'file' ? () => (workspace.enabled ? void openDocument(entry.kind === 'book' ? 'book' : 'file', entry.path) : entry.kind === 'book' ? void openBook({ path: entry.path }) : TEXT_EDIT_KINDS.has(entry.kind) ? void openTextFile(entry.path) : undefined) : undefined,
                                    },
                                    entry.type === 'directory' ? `${entry.name}/` : entry.name,
                                ),
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
                  h(
                      'p',
                      { className: 'muted' },
                      `${file.kind} · ${file.size} bytes · ${desktop ? 'preview' : 'read-only'}`,
                      file.kind === 'book' ? ' ' : null,
                      file.kind === 'book' ? h('button', { onclick: () => void openBook({ path: file.path }) }, desktop ? 'Edit Book' : 'Open in the Book editor') : null,
                      desktop && TEXT_EDIT_KINDS.has(file.kind) && !file.truncated ? ' ' : null,
                      desktop && TEXT_EDIT_KINDS.has(file.kind) && !file.truncated ? h('button', { onclick: () => void openTextFile(file.path) }, state.textDrafts.has(file.path) ? 'Edit (unsaved draft)' : 'Edit') : null,
                  ),
                  file.image ? h('img', { src: file.image, alt: file.name, className: 'file-image' }) : null,
                  file.kind === 'image' && !file.image ? h('p', { className: 'muted' }, 'The image is too large to display here.') : null,
                  file.kind === 'video' ? h('p', { className: 'muted' }, 'Video playback is not part of Files; the file is identified only.') : null,
                  file.kind === 'binary' ? h('p', { className: 'muted' }, 'Binary file; not shown as text.') : null,
                  // A Book shows the shared highlighting (ranges from the engine's one Book parser).
                  typeof file.text === 'string' ? h('pre', { className: file.highlight ? 'log book-view' : 'log' }, file.highlight ? highlightedBook(file.text, file.highlight) : file.text) : null,
                  file.truncated ? h('p', { className: 'warn' }, 'Only the beginning of this file is shown; the rest stays on disk.') : null,
              )
            : null;
        if (desktop) {
            return pageFrame(
                'files',
                'Engine-owned edits and bulk operations · hidden and protected paths (.git, .ptbk, .env …) are never shown or written',
                crumbs,
                renderFilesToolbar(path, selected),
                renderFilesPersistence(state.snapshot && state.snapshot.files),
                files.error ? h('p', { className: 'warn' }, files.error) : null,
                files.loading ? h('p', { className: 'muted' }, 'Loading…') : null,
                filesDropZone(path, list),
                viewer,
            );
        }
        return pageFrame('files', 'Read-only · hidden and protected paths (.git, .ptbk, .env …) are never shown; agent Book folders such as agents/.core are', crumbs, files.error ? h('p', { className: 'warn' }, files.error) : null, files.loading ? h('p', { className: 'muted' }, 'Loading…') : null, list, viewer);
    }

    /** Kinds the desktop text editor saves (Books keep their own editor and scoped commit). */
    const TEXT_EDIT_KINDS = new Set(['text', 'markdown', 'json']);

    /** Desktop Files actions for the current folder and the selection. */
    function renderFilesToolbar(path, selected) {
        const picker = (directory) => {
            const input = h('input', { type: 'file', multiple: true, hidden: true, ...(directory ? { webkitdirectory: true } : {}) });
            input.addEventListener('change', () => {
                const picked = [...input.files].map((file) => ({ path: file.webkitRelativePath || file.name, type: 'file', size: file.size, file }));
                // A picked folder also brings its subfolders (so empty ones exist after the import).
                const folders = new Set();
                for (const entry of picked) for (let index = entry.path.indexOf('/'); index > 0; index = entry.path.indexOf('/', index + 1)) folders.add(entry.path.slice(0, index));
                void importEntries([...[...folders].map((folder) => ({ path: folder, type: 'directory' })), ...picked], path);
            });
            return input;
        };
        const files = picker(false);
        const folder = picker(true);
        const count = selected.size;
        return h(
            'div',
            { className: 'row files-toolbar', role: 'toolbar', 'aria-label': 'Files actions' },
            files,
            folder,
            h('button', { onclick: () => files.click() }, 'Import files…'),
            h('button', { onclick: () => folder.click() }, 'Import folder…'),
            h('button', { disabled: !count, onclick: () => void copySelection([...selected], path) }, count ? `Copy ${count} selected…` : 'Copy selected…'),
            h('button', { className: 'danger', disabled: !count, onclick: () => void deleteSelection([...selected]) }, count ? `Delete ${count} selected…` : 'Delete selected…'),
            count ? h('button', { onclick: () => ((state.files = { ...state.files, selected: new Set() }), render(state.snapshot)) }, 'Clear selection') : null,
        );
    }

    /** The folder list accepts files and complete folders dropped from the operating system (imported by the engine). */
    function filesDropZone(path, list) {
        const zone = h('div', { className: 'files-drop', 'aria-label': `Drop files or folders to import them into /${path}` }, list, h('p', { className: 'muted' }, `Drop files or folders here to import them into /${path}. Sources stay where they are.`));
        zone.addEventListener('dragover', (event) => {
            if (![...event.dataTransfer.types].includes('Files')) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            zone.classList.add('drop-active');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drop-active'));
        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('drop-active');
            const roots = [...event.dataTransfer.items].map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)).filter(Boolean);
            void droppedEntries(roots).then((entries) => entries.length && importEntries(entries, path), (error) => toast(`Cannot read the dropped items: ${error.message}`));
        });
        return zone;
    }

    /** Reads dropped file system entries recursively into relative paths (folders included, contents as File objects). */
    async function droppedEntries(roots) {
        const entries = [];
        const visit = async (entry, prefix) => {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isFile) {
                const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                entries.push({ path, type: 'file', size: file.size, file });
            } else if (entry.isDirectory) {
                entries.push({ path, type: 'directory' });
                const reader = entry.createReader();
                // readEntries returns batches until an empty one.
                for (;;) {
                    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
                    if (!batch.length) break;
                    for (const child of batch) await visit(child, path);
                }
            }
        };
        for (const root of roots) await visit(root, '');
        return entries;
    }

    /**
     * The one review of an operation (collisions, rejected items or a deletion's scope). Resolves to the chosen
     * resolution, or null when cancelled.
     */
    function reviewOperation(review) {
        return new Promise((resolve) => {
            const deletion = review.kind === 'delete';
            const choices = new Map();
            const resolution = h('select', { 'aria-label': 'For existing names' }, h('option', { value: 'keep-both' }, 'Keep Both (default)'), h('option', { value: 'skip' }, 'Skip'), h('option', { value: 'replace' }, 'Replace'));
            const rows = review.items.map((item) => {
                const own = item.status === 'collision' ? h('select', { 'aria-label': `For ${item.path}` }, h('option', { value: '' }, 'As above'), h('option', { value: 'keep-both' }, 'Keep Both'), h('option', { value: 'skip' }, 'Skip'), h('option', { value: 'replace' }, 'Replace')) : null;
                own?.addEventListener('change', () => (own.value ? choices.set(item.path, own.value) : choices.delete(item.path)));
                const scope = [item.files ? `${item.files} file(s)` : '', item.folders ? `${item.folders} folder(s)` : '', item.hidden ? `${item.hidden} hidden` : ''].filter(Boolean).join(', ');
                return h(
                    'li',
                    {},
                    h('span', { className: `pill ${item.status === 'rejected' ? 'bad' : item.status === 'collision' ? 'warn' : 'ok'}` }, item.status === 'ok' ? (deletion ? 'delete' : 'new') : item.status),
                    ' ',
                    h('strong', {}, item.path),
                    item.target && item.target !== item.path ? h('span', { className: 'muted' }, ` → ${item.target}`) : null,
                    scope ? h('span', { className: 'muted' }, ` · ${scope}`) : null,
                    item.reason ? h('span', { className: item.status === 'rejected' ? 'warn' : 'muted' }, ` · ${item.reason}`) : null,
                    item.rejected && item.rejected.length ? h('div', { className: 'muted' }, `Not written: ${item.rejected.slice(0, 8).join(', ')}${item.rejected.length > 8 ? ', …' : ''}`) : null,
                    own,
                );
            });
            const acceptable = review.items.some((item) => item.status !== 'rejected');
            const confirm = h('button', { className: deletion ? 'danger' : 'primary', disabled: !acceptable }, deletion ? 'Delete' : 'Apply');
            const dialog = h(
                'dialog',
                { className: 'book-dialog review-dialog', 'aria-label': deletion ? 'Confirm deletion' : 'Review the operation' },
                h('h2', {}, h('span', {}, deletion ? 'Delete from the project' : review.kind === 'import' ? 'Import into the project' : 'Copy within the project')),
                h('p', {}, review.summary),
                deletion ? h('p', { className: 'warn' }, 'Deleted files are removed from the working tree and committed as their own operation. Agents, tasks and chats are removed through their own pages.') : null,
                !deletion && review.items.some((item) => item.status === 'collision') ? h('p', { className: 'row' }, 'For existing names: ', resolution) : null,
                h('ul', { className: 'list inline' }, ...rows),
                h('div', { className: 'row' }, confirm, h('button', { onclick: () => dialog.close() }, 'Cancel')),
            );
            let result = null;
            confirm.addEventListener('click', () => {
                result = deletion ? { confirm: true } : { choice: resolution.value, choices: Object.fromEntries(choices) };
                dialog.close();
            });
            dialog.addEventListener('close', () => {
                dialog.remove();
                resolve(result);
            });
            document.body.append(dialog);
            dialog.showModal();
        });
    }

    /** Imports dropped or picked entries into a folder: engine preflight, one review when needed, upload, completion. */
    async function importEntries(entries, destination) {
        try {
            const review = await api('/api/files/preflight', { method: 'POST', body: { kind: 'import', destination, view: state.filesView, entries: entries.map(({ path, type, size }) => ({ path, type, size })) } });
            const decision = review.needsReview ? await reviewOperation(review) : {};
            if (!decision) return toast('Import cancelled; nothing was written.');
            const applied = await api('/api/files/apply', { method: 'POST', body: { id: review.id, ...decision } });
            let failed = 0;
            for (const upload of applied.uploads || []) {
                const entry = entries[upload.index];
                const sent = await apiRaw(`/api/files/upload?operation=${encodeURIComponent(applied.id)}&index=${upload.index}`, { method: 'PUT', raw: entry.file });
                if (sent.status !== 200) failed++;
            }
            const outcome = applied.uploads ? await api('/api/files/complete', { method: 'POST', body: { id: applied.id } }) : applied;
            toast(`${outcome.summary}${applied.skipped.length ? ` Skipped ${applied.skipped.length}.` : ''}${applied.conflicting.length ? ` ${applied.conflicting.length} not written.` : ''}${failed ? ` ${failed} upload(s) failed.` : ''}`);
        } catch (error) {
            toast(`Import failed: ${error.message}`);
        }
        await openFiles(destination);
    }

    /** Copies the selection within the project into a chosen folder. */
    async function copySelection(paths, folder) {
        const destination = window.prompt('Copy the selection into which project folder?', folder);
        if (destination === null) return;
        try {
            const review = await api('/api/files/preflight', { method: 'POST', body: { kind: 'copy', destination: destination.trim(), view: state.filesView, entries: paths.map((path) => ({ path })) } });
            const decision = review.needsReview ? await reviewOperation(review) : {};
            if (!decision) return toast('Copy cancelled; nothing was written.');
            const outcome = await api('/api/files/apply', { method: 'POST', body: { id: review.id, ...decision } });
            toast(`${outcome.summary}${outcome.conflicting.length ? ` ${outcome.conflicting.length} not copied.` : ''}`);
        } catch (error) {
            toast(`Copy failed: ${error.message}`);
        }
        await openFiles(folder);
    }

    /** Deletes the selection after confirming its whole scope (protected content rejects its parent). */
    async function deleteSelection(paths) {
        const folder = state.files.path || '';
        try {
            const review = await api('/api/files/preflight', { method: 'POST', body: { kind: 'delete', entries: paths.map((path) => ({ path })) } });
            const decision = await reviewOperation(review);
            if (!decision) return toast('Nothing was deleted.');
            const outcome = await api('/api/files/apply', { method: 'POST', body: { id: review.id, ...decision } });
            toast(outcome.summary);
            state.files = { ...state.files, selected: new Set() };
        } catch (error) {
            toast(`Delete failed: ${error.message}`);
        }
        await openFiles(folder);
    }

    /** Persistence of desktop Files changes: Saved · Pending commit, blocked or failed with its cause, and recent commits. */
    function renderFilesPersistence(view) {
        if (!view || (!view.batches.length && !view.recent.length)) return null;
        const label = { pending: 'Saved · Pending commit', writing: 'Writing…', committing: 'Committing…', blocked: 'Blocked', failed: 'Saved · Commit failed', review: 'Interrupted · needs review' };
        const busy = (id) => state.busy.has(`files:${id}`);
        const act = async (id, action) => {
            state.busy.add(`files:${id}`);
            render(state.snapshot);
            try {
                const result = await api(`/api/files/${action}`, { method: 'POST', body: { id } });
                if (action === 'commit') toast(result.commits.length ? `Committed ${result.commits.map((sha) => sha.slice(0, 8)).join(', ')}.` : 'Nothing was committed.');
            } catch (error) {
                toast(error.message);
            } finally {
                state.busy.delete(`files:${id}`);
                render(state.snapshot);
            }
        };
        return h(
            'section',
            { className: 'card', 'aria-label': 'Persistence' },
            h('h2', {}, h('span', {}, 'Persistence'), view.batches.some((batch) => batch.state === 'pending') ? h('button', { disabled: busy(''), onclick: () => void act('', 'commit') }, 'Commit now') : null),
            h(
                'ul',
                { className: 'list inline' },
                ...view.batches.map((batch) =>
                    h(
                        'li',
                        {},
                        h('span', { className: `pill ${batch.state === 'pending' || batch.state === 'writing' ? '' : 'warn'}` }, label[batch.state] || batch.state),
                        ' ',
                        h('strong', {}, batch.subject),
                        batch.dueAt ? h('span', { className: 'muted' }, ` · ${batch.state === 'failed' ? 'retry' : 'commit'} ${time(batch.dueAt)}`) : null,
                        batch.reason ? h('div', { className: 'warn' }, batch.reason) : null,
                        h(
                            'div',
                            { className: 'row' },
                            batch.state === 'writing' ? null : h('button', { disabled: busy(batch.id), onclick: () => void act(batch.id, 'commit') }, batch.state === 'review' ? 'Commit applied items' : 'Commit now'),
                            ['blocked', 'failed', 'review'].includes(batch.state) ? h('button', { disabled: busy(batch.id), onclick: () => void act(batch.id, 'dismiss') }, 'Dismiss (keep uncommitted)') : null,
                        ),
                    ),
                ),
                ...view.recent.slice(0, 5).map((item) => h('li', { className: 'muted' }, `${item.outcome === 'committed' ? 'Committed' : item.outcome === 'uncommitted' ? 'Saved, not committed' : item.outcome === 'ignored' ? 'Saved, ignored by Git' : 'Dismissed'} · ${item.subject}${item.sha ? ` · ${item.sha.slice(0, 8)}` : ''} · ${time(item.at)}${item.detail ? ` · ${item.detail}` : ''}`)),
            ),
        );
    }

    /**
     * The desktop text editor for an ordinary project file: a modal outside the live-updating page. It saves through the
     * engine against the revision it opened (Ctrl/⌘+S); a conflict shows the current source beside the draft for an
     * explicit reconciliation, and a failed save or disconnect keeps the draft.
     */
    async function openTextFile(path) {
        if (workspace.enabled) return openDocument('file', path);
        let source;
        try {
            source = await api(`/api/files/text?path=${encodeURIComponent(path)}`);
        } catch (error) {
            toast(`Cannot open ${path}: ${error.message}`);
            return;
        }
        let draft = source.editable ? state.textDrafts.get(source.path) : undefined;
        let revision = draft ? draft.revision : source.revision;
        let baseline = source.text;
        let conflict = null;
        let busy = false;
        let notice = draft ? (draft.revision === source.revision ? 'Restored your unsaved draft.' : 'Restored your unsaved draft; the file changed meanwhile, so saving reports a conflict to reconcile.') : '';
        const field = h('textarea', { className: 'book-source', 'aria-label': `Text of ${source.path}`, spellcheck: 'false', wrap: 'off', readonly: !source.editable });
        field.value = draft ? draft.text : baseline;
        const current = h('pre', { className: 'log conflict-source', 'aria-label': 'Current source' });
        const panes = h('div', { className: 'conflict-panes' });
        const compare = h('div', { className: 'conflict' }, h('p', { className: 'warn' }, 'The file changed since you opened it. Your draft (left) is kept; the current source is on the right.'), panes);
        const editorSlot = h('div', { className: 'text-editor' }, field);
        let comparing = false;
        // The draft moves between the plain and the side-by-side layout only when a conflict starts or ends.
        const layout = () => {
            if (Boolean(conflict) === comparing) return;
            comparing = Boolean(conflict);
            if (comparing) {
                panes.replaceChildren(field, current);
                editorSlot.replaceChildren(compare);
            } else editorSlot.replaceChildren(field);
        };
        const status = h('p', { className: 'muted', role: 'status' });
        const dirty = () => source.editable && field.value !== baseline;
        const keep = () => (dirty() ? state.textDrafts.set(source.path, { text: field.value, revision }) : state.textDrafts.delete(source.path));
        const saveButton = source.editable ? h('button', { className: 'primary', onclick: () => void save() }, 'Save') : null;
        const takeCurrent = h('button', { hidden: true, onclick: () => {
            if (!conflict) return;
            if (dirty() && !window.confirm('Discard your draft and load the current source?')) return;
            baseline = conflict.text;
            revision = conflict.revision;
            field.value = baseline;
            conflict = null;
            notice = 'Loaded the current source.';
            show();
        } }, 'Use current source');
        const keepMine = h('button', { hidden: true, onclick: () => {
            if (!conflict || !window.confirm('Save your draft over the current source?')) return;
            revision = conflict.revision;
            conflict = null;
            void save();
        } }, 'Save my draft over it');
        const show = () => {
            const persistence = (state.snapshot && state.snapshot.files && state.snapshot.files.batches.find((batch) => batch.paths.includes(source.path))) || null;
            status.textContent = `${source.path}${source.editable ? ` · revision ${revision.slice(0, 8)}${dirty() ? ' · unsaved changes' : ''}` : ` · read-only${source.reason ? ` — ${source.reason}` : ''}`}${persistence ? ` · ${persistence.state === 'pending' ? 'Saved · Pending commit' : persistence.state}` : ''}${notice ? ` · ${notice}` : ''}`;
            if (saveButton) saveButton.disabled = busy;
            if (conflict) current.textContent = conflict.text;
            takeCurrent.hidden = keepMine.hidden = !conflict;
            layout();
        };
        const save = async () => {
            if (busy || !source.editable) return;
            busy = true;
            notice = 'Saving…';
            show();
            const text = field.value;
            try {
                const outcome = await apiRaw('/api/files/text', { method: 'POST', body: { path: source.path, text, revision } });
                if (outcome.status === 200 && outcome.data.status !== 'conflict') {
                    revision = outcome.data.revision;
                    baseline = text;
                    notice = textSaveNotice(outcome.data);
                } else if (outcome.data.status === 'conflict') {
                    notice = `Not saved: ${outcome.data.message}`;
                    if (outcome.data.current) conflict = outcome.data.current;
                } else notice = `Not saved: ${outcome.data.error || `HTTP ${outcome.status}`}; your draft is kept.`;
            } catch (error) {
                notice = `Not saved: ${error.message}; your draft is kept.`;
            } finally {
                busy = false;
                keep();
                show();
            }
        };
        const dialog = h(
            'dialog',
            { className: 'book-dialog', 'aria-label': `Text file: ${source.path}` },
            h('h2', {}, h('span', {}, source.path), h('span', { className: 'row' }, saveButton, takeCurrent, keepMine, h('button', { onclick: () => dialog.close() }, 'Close'))),
            status,
            editorSlot,
            h('p', { className: 'muted' }, source.editable ? 'Ctrl+S (⌘S) saves without closing · Esc closes and keeps unsaved changes' : 'Read-only · Esc closes'),
        );
        field.addEventListener('input', () => {
            if (notice && !busy) notice = '';
            keep();
            show();
        });
        dialog.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void save();
            }
        });
        dialog.addEventListener('close', () => {
            keep();
            dialog.remove();
            render(state.snapshot);
        });
        document.body.append(dialog);
        show();
        dialog.showModal();
        field.focus();
    }

    /** The outcome of an accepted desktop text save (its commit is batched). */
    function textSaveNotice(outcome) {
        return outcome.status === 'unchanged' ? 'Nothing changed; no commit.' : outcome.persistence === 'pending' ? 'Saved · Pending commit.' : outcome.persistence === 'ignored' ? 'Saved (ignored by Git; no commit).' : 'Saved (this project does not commit).';
    }

    /** The outcome of an accepted Book save, with its scoped commit and detected problems. */
    function bookSaveNotice(outcome) {
        return outcome.unchanged ? 'Nothing changed; no commit.' : `Saved${outcome.commit ? ` and committed ${outcome.commit.slice(0, 8)}` : ' (not committed)'}${outcome.diagnostics.length ? ` with ${outcome.diagnostics.length} warning(s)${outcome.repair ? '; Fixer got a repair task' : '; Fixer already has a repair task'}` : ''}.`;
    }

    /** An external action's outcome as a styled word (partial and uncertain stay explicit). */
    function outcomeBadge(outcome) {
        const className = outcome === 'success' ? 'ok' : outcome === 'failed' ? 'bad' : outcome === 'partial' || outcome === 'uncertain' || outcome === 'pending' ? 'warn' : 'muted';
        return h('span', { className }, outcome === 'not-performed' ? 'not performed' : outcome);
    }

    /** Loads one saved external-action record for the External activity log page (read-only). */
    async function openActionRecord(path) {
        state.actionRecord = { path, loading: true };
        render(state.snapshot);
        try {
            const record = await api(`/api/actions/record?path=${encodeURIComponent(path)}`);
            if (state.actionRecord && state.actionRecord.path === path) state.actionRecord = { path, content: record.content, links: record.links || {} };
        } catch (error) {
            if (state.actionRecord && state.actionRecord.path === path) state.actionRecord = { path, error: error.message };
        }
        render(state.snapshot);
    }

    /**
     * Verified links of an opened action record: its task Book and evidence in Files (only when they exist in the
     * project) and its receipt (only a plain http(s) URL). Following them never retries the action.
     */
    function actionLinks(links) {
        // Files is loading the target before the page switches, so it never falls back to the project root.
        const show = (path, kind) => (openFiles(path, kind), openPage('files'));
        const items = [
            links.task ? h('button', { onclick: () => void openBook({ path: links.task }) }, 'Task Book') : null,
            links.evidence ? h('button', { onclick: () => show(links.evidence, 'folder') }, 'Evidence') : null,
            links.harness ? h('button', { onclick: () => openActionSession(links.harness) }, 'Harness session') : null,
            links.receipt ? h('a', { href: links.receipt, target: '_blank', rel: 'noopener noreferrer' }, 'Receipt') : null,
        ].filter(Boolean);
        return items.length ? h('div', { className: 'row', role: 'group', 'aria-label': 'Record links' }, ...items) : null;
    }

    /** Opens the harness session of an action record, wherever it is listed now. */
    function openActionSession(handle) {
        const sessions = (state.snapshot && state.snapshot.harnessSessions) || { ended: [] };
        state.sessionsEnded = sessions.ended.some((session) => session.handle === handle);
        state.sessionSelected = handle;
        openPage('harnesses');
    }

    /** The views of the External activity log. */
    const ACTIVITY_VIEWS = { default: 'Default (batches collapsed)', ungrouped: 'Fully ungrouped', task: 'By task', agent: 'By agent' };

    /** The orders of the External activity log; smart is the default. */
    const ACTIVITY_ORDERS = { smart: 'Smart (impact and age)', time: 'Time', impact: 'Impact' };

    /** The observed outcomes the log can filter by. */
    const ACTIVITY_OUTCOMES = ['success', 'failed', 'pending', 'partial', 'uncertain', 'not-performed'];

    /** Rows asked for at a time. */
    const ACTIVITY_STEP = 200;

    /** The External activity log's state in this viewer; its choices are restored from the last visit (storage may be unavailable). */
    function activityState() {
        if (state.activity) return state.activity;
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem('ptbk-activity-view') || '{}') || {};
        } catch {
            // Private windows may refuse storage; the default view still works.
        }
        state.activity = {
            grouping: saved.grouping in ACTIVITY_VIEWS ? saved.grouping : 'default',
            sort: saved.sort in ACTIVITY_ORDERS ? saved.sort : 'smart',
            showAll: saved.showAll === true,
            outcome: ACTIVITY_OUTCOMES.includes(saved.outcome) ? saved.outcome : '',
            position: {},
            stack: [],
            view: null,
            error: null,
            loaded: null,
            loading: false,
        };
        return state.activity;
    }

    /** Identity of what the log should currently show: a change of choice, position or saved records reloads it. */
    function activityWanted(activity, revision) {
        return JSON.stringify([activity.grouping, activity.sort, activity.showAll, activity.outcome, activity.position, revision]);
    }

    /** Loads rows of the current level (read-only: saved records and derived caches, never a retry, model call or commit). */
    async function loadActivity(more) {
        const activity = activityState();
        if (activity.loading) return;
        activity.loading = true;
        const revision = state.snapshot && state.snapshot.actions ? state.snapshot.actions.revision : undefined;
        const wanted = activityWanted(activity, revision);
        const shown = activity.view ? activity.view.rows.length : 0;
        // A task reached directly (from its detail) lists its own batches and actions, whatever the top view is.
        const grouping = activity.position.task && !activity.position.agent ? 'task' : activity.grouping;
        const query = new URLSearchParams({ grouping, sort: activity.sort, offset: String(more ? shown : 0), limit: String(more ? ACTIVITY_STEP : Math.max(ACTIVITY_STEP, shown)) });
        if (activity.showAll) query.set('showAll', 'true');
        if (activity.outcome) query.set('outcome', activity.outcome);
        for (const [name, value] of Object.entries(activity.position)) query.set(name, value);
        try {
            const view = await api(`/api/actions/view?${query}`);
            activity.view = more && activity.view ? { ...view, rows: [...activity.view.rows, ...view.rows] } : view;
            activity.error = null;
        } catch (error) {
            activity.error = error.message;
        }
        activity.loaded = wanted;
        activity.loading = false;
        render(state.snapshot);
    }

    /** Changes a presentation choice and remembers it locally (never a project setting). */
    function changeActivity(change) {
        const activity = activityState();
        Object.assign(activity, change);
        try {
            localStorage.setItem('ptbk-activity-view', JSON.stringify({ grouping: activity.grouping, sort: activity.sort, showAll: activity.showAll, outcome: activity.outcome }));
        } catch {
            // Private windows may refuse storage; the view still works.
        }
        render(state.snapshot);
    }

    /** Opens the next level of the log; the browser's Back, the page's Back and Escape return one level. */
    function activityInto(row) {
        const activity = activityState();
        activity.stack.push({ position: activity.position, view: activity.view, loaded: activity.loaded, scroll: window.scrollY, selected: row.key });
        activity.position = { ...activity.position, ...(row.agent ? { agent: row.agent } : {}), ...(row.task ? { task: row.task } : {}), ...(row.batch ? { batch: row.batch } : {}) };
        activity.view = null;
        activity.loaded = null;
        state.actionRecord = null;
        history.pushState({ page: 'actions', depth: activity.stack.length }, '', '#/actions');
        render(state.snapshot);
        window.scrollTo(0, 0);
    }

    /** Returns the log to a level, with its rows, selection and scroll as they were. */
    function activityBackTo(depth) {
        const activity = state.activity;
        if (!activity || activity.stack.length <= depth) return;
        let level;
        while (activity.stack.length > depth) level = activity.stack.pop();
        Object.assign(activity, { position: level.position, view: level.view, loaded: level.loaded });
        state.actionRecord = null;
        render(state.snapshot);
        window.scrollTo(0, level.scroll);
        const row = app.querySelector(`[data-activity="${CSS.escape(`row:${level.selected}`)}"]`);
        if (row) row.focus({ preventScroll: true });
    }

    /** The External activity log of one task, reachable from its detail. */
    function openTaskActivity(source) {
        const task = source.split('/').pop().replace(/\.(book|md)$/i, '');
        const activity = activityState();
        openPage('actions');
        Object.assign(activity, { position: { task }, stack: [{ position: {}, view: null, loaded: null, scroll: 0, selected: `task:${task}` }], view: null, loaded: null });
        history.replaceState({ page: 'actions', depth: 1 }, '', '#/actions');
        render(state.snapshot);
    }

    /** One row of the log: an action with its observed outcome, or a summary that never claims all its members succeeded. */
    function activityRow(row, open) {
        const totals = row.totals;
        if (row.action) {
            const item = row.action;
            const isOpen = open && open.path === item.path;
            return h(
                'li',
                { className: 'activity-row' },
                h(
                    'div',
                    { className: 'activity-head' },
                    h('button', { 'data-activity': `row:${row.key}`, className: isOpen ? 'primary' : '', 'aria-expanded': String(Boolean(isOpen)), onclick: () => (isOpen ? ((state.actionRecord = null), render(state.snapshot)) : openActionRecord(item.path)) }, row.label),
                    h('span', {}, outcomeBadge(item.outcome), item.pending ? h('span', { className: 'warn' }, ' · not committed yet') : null),
                ),
                h('div', { className: 'muted' }, [item.at ? time(item.at) : '', `impact ${totals.display}`, item.attempts > 1 ? `${item.attempts} attempts` : '', ...(item.system ? [`engine · ${item.system}`] : [item.agent || '', item.taskName || item.task])].filter(Boolean).join(' · ')),
                isOpen ? h('pre', { className: 'log', 'aria-label': `Record ${item.path}` }, open.loading ? 'Loading…' : open.error ? `The record could not be read: ${open.error}` : open.content) : null,
                isOpen && open.links ? actionLinks(open.links) : null,
            );
        }
        const outcomes = Object.entries(totals.outcomes)
            .sort(([a], [b]) => a.localeCompare(b))
            .flatMap(([outcome, count], index) => [index ? ', ' : '', `${count} `, outcomeBadge(outcome)]);
        const count = totals.filtered ? `${totals.count} of ${totals.unfiltered} actions` : `${totals.count} action${totals.count === 1 ? '' : 's'}`;
        return h(
            'li',
            { className: 'activity-row' },
            h('div', { className: 'activity-head' }, h('button', { 'data-activity': `row:${row.key}`, onclick: () => activityInto(row) }, row.label), h('span', {}, h('span', { className: 'muted' }, `${count} · `), ...outcomes)),
            h('div', { className: 'muted' }, [totals.latestAt ? `latest ${time(totals.latestAt)}` : '', `impact ${totals.display}`, row.note || ''].filter(Boolean).join(' · ')),
        );
    }

    /** The External activity log page: saved records of external actions, separate from runtime activity, traces and Git history. */
    function renderActionsPage(snapshot) {
        const actions = snapshot.actions;
        if (!actions) return pageFrame('actions', 'External actions', h('p', { className: 'muted' }, 'This engine does not report external actions yet.'));
        const activity = activityState();
        if (!activity.loading && activity.loaded !== activityWanted(activity, actions.revision)) void loadActivity();
        const view = activity.view;
        const top = !activity.stack.length;
        const select = (label, name, options, value, disabled) => h('label', { className: 'field' }, h('span', {}, label), h('select', { 'aria-label': label, 'data-activity': name, disabled: disabled || undefined, onchange: (event) => changeActivity({ [name]: event.target.value }) }, options.map(([key, text]) => h('option', { value: key, selected: key === value || undefined }, text))));
        const controls = h(
            'div',
            { className: 'activity-controls', role: 'group', 'aria-label': 'View of the log' },
            top ? select('View', 'grouping', Object.entries(ACTIVITY_VIEWS), activity.grouping) : null,
            select('Order', 'sort', Object.entries(ACTIVITY_ORDERS), activity.sort),
            select('Outcome', 'outcome', [['', 'Every outcome'], ...ACTIVITY_OUTCOMES.map((outcome) => [outcome, outcome === 'not-performed' ? 'not performed' : outcome])], activity.outcome),
            top ? h('button', { 'data-activity': 'show-all', 'aria-pressed': String(activity.showAll), onclick: () => changeActivity({ showAll: !activity.showAll }) }, activity.showAll ? 'Showing all impacts' : 'Show all') : null,
        );
        const pendingNotes = `${actions.pending ? ` · ${actions.pending} not committed` : ''}${actions.unresolved ? ` · ${actions.unresolved} without a reported outcome` : ''}`;
        if (activity.error) return pageFrame('actions', `Saved Markdown in actions/${pendingNotes}`, controls, h('p', { className: 'bad' }, `The log could not be read: ${activity.error}`));
        if (!view) return pageFrame('actions', 'Reading saved records…', controls, h('p', { className: 'muted' }, 'Loading…'));
        const totals = view.totals;
        const summary = `${totals.filtered ? `${totals.count} of ${totals.unfiltered}` : totals.count} action${totals.unfiltered === 1 ? '' : 's'}, impact ${totals.display}${view.cutoff === undefined ? '' : ` · impact ≥ ${view.cutoff}${view.hidden ? ` (${view.hidden} below)` : ''}`}${pendingNotes}`;
        const items = [];
        let unranked = false;
        for (const row of view.rows) {
            // Unknown has its own labelled position instead of a fabricated rank.
            if (view.sort !== 'time' && !unranked && (view.sort === 'smart' ? row.totals.priority : row.totals.impact) === undefined) {
                unranked = true;
                items.push(h('li', { className: 'group-heading' }, 'Unknown impact · not ranked by a number'));
            }
            items.push(activityRow(row, state.actionRecord));
        }
        const empty = view.hidden ? `${view.hidden} row${view.hidden === 1 ? ' is' : 's are'} below impact ${view.cutoff}. Show all lists them.` : view.outcome ? `No action has the outcome ${view.outcome}.` : 'No external action has been recorded. Records are captured from now on; earlier tasks may have external work without a record.';
        const left = view.totalRows - view.rows.length;
        return pageFrame(
            'actions',
            summary,
            view.path.length ? h('p', { className: 'muted', 'aria-label': 'Position in the log' }, view.path.map((level) => level.label).join(' › ')) : null,
            controls,
            items.length ? h('ul', { className: 'list' }, ...items) : h('p', { className: 'muted' }, empty),
            left > 0 ? h('button', { 'data-activity': 'more', onclick: () => void loadActivity(true) }, `Show more (${left} left)`) : null,
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

    /** Breakdowns of the Usage page; each is also a filter field of the shared usage view. */
    const USAGE_GROUPINGS = { agent: 'Agent', harness: 'Harness', model: 'Model', work: 'Kind of work', task: 'Task', chat: 'Chat', tool: 'Tool' };

    /** The Usage view of this viewer, kept in memory and restored from the last visit (storage may be unavailable). */
    function usageView() {
        if (state.usageView) return state.usageView;
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem('ptbk-usage-view') || '{}') || {};
        } catch {
            // Private windows may refuse storage; the default view still works.
        }
        const filter = saved.filter && typeof saved.filter === 'object' ? Object.fromEntries(Object.entries(saved.filter).filter(([field, value]) => field in USAGE_GROUPINGS && typeof value === 'string')) : {};
        state.usageView = { grouping: saved.grouping in USAGE_GROUPINGS ? saved.grouping : 'agent', inclusive: saved.inclusive === true, filter };
        return state.usageView;
    }

    /** Changes the Usage view, remembers it locally (never a project setting) and loads what it needs. */
    function rememberUsageView(view) {
        state.usageView = view;
        try {
            localStorage.setItem('ptbk-usage-view', JSON.stringify(view));
        } catch {
            // Private windows may refuse storage; the view still works.
        }
        render(state.snapshot);
        loadUsage(true);
    }

    /** Whether the Usage view needs the engine's on-demand summary (a filter, or a breakdown the snapshot lacks). */
    function usageNeedsQuery(view) {
        return Object.keys(view.filter).length > 0 || !['agent', 'harness', 'model', 'work'].includes(view.grouping);
    }

    /** Loads the shared usage summary for the current view (again when the engine's overview was recomputed). */
    async function loadUsage(force) {
        const view = usageView();
        if (!usageNeedsQuery(view)) return;
        const computedAt = state.snapshot && state.snapshot.usage ? state.snapshot.usage.computedAt : '';
        if (!force && state.usageResult && state.usageResult.computedAt === computedAt) return;
        const query = new URLSearchParams({ group: view.grouping, scope: view.inclusive ? 'inclusive' : 'self', ...view.filter });
        const request = (state.usageRequest = (state.usageRequest || 0) + 1);
        try {
            const summary = await api(`/api/usage?${query}`);
            // A slower answer to an earlier view never replaces the current one.
            if (request === state.usageRequest) state.usageResult = { key: query.toString(), computedAt, summary, problem: null };
        } catch (error) {
            if (request === state.usageRequest) state.usageResult = { key: query.toString(), computedAt, summary: null, problem: error.message };
        }
        if (state.page === 'usage') render(state.snapshot);
    }

    /** The Usage page: a simple seven-day summary with the chosen breakdown; billing mode and certainty stay visible. */
    function renderUsagePage(snapshot) {
        const view = usageView();
        const query = new URLSearchParams({ group: view.grouping, scope: view.inclusive ? 'inclusive' : 'self', ...view.filter }).toString();
        const loaded = state.usageResult && state.usageResult.key === query ? state.usageResult : null;
        const filters = Object.entries(view.filter);
        const describe = filters.map(([field, value]) => `${field === 'work' ? 'kind' : field} ${value}`).join(', ');
        const choose = (changes) => rememberUsageView({ ...view, ...changes });
        // Narrowing to a row combines with the current filter and moves on to the next breakdown not narrowed yet.
        const narrow = (filter) => {
            const combined = { ...view.filter, ...filter };
            const order = Object.keys(USAGE_GROUPINGS);
            // Work of one task is rarely in a chat and the other way round.
            const narrowed = (grouping) => grouping in combined || (grouping === 'chat' && combined.task) || (grouping === 'task' && combined.chat);
            const next = [...order.slice(order.indexOf(view.grouping) + 1), ...order].find((grouping) => !narrowed(grouping)) || view.grouping;
            choose({ filter: combined, grouping: next });
        };
        const scoped = ['agent', 'task', 'chat'].includes(view.grouping) || view.filter.agent || view.filter.task || view.filter.chat;
        const controls = h(
            'div',
            { className: 'row', role: 'group', 'aria-label': 'Group usage by' },
            ...Object.entries(USAGE_GROUPINGS).map(([value, label]) => h('button', { className: value === view.grouping ? 'primary' : '', 'aria-pressed': String(value === view.grouping), onclick: () => choose({ grouping: value }) }, label)),
            scoped ? h('button', { 'aria-pressed': String(view.inclusive), onclick: () => choose({ inclusive: !view.inclusive }) }, view.inclusive ? 'Own work only' : 'Include initiated work') : null,
        );
        const filterBar = filters.length ? h('div', { className: 'row', role: 'group', 'aria-label': 'Usage filter' }, h('span', {}, `Only ${describe}${view.inclusive ? ' (including work it initiated)' : ''}`), h('button', { onclick: () => choose({ filter: {} }) }, 'Clear filter')) : null;
        const usage = usageNeedsQuery(view) ? (loaded && loaded.summary) || null : snapshot.usage;
        if (!usage) {
            const waiting = loaded && loaded.problem ? `The usage summary could not be read: ${loaded.problem}` : usageNeedsQuery(view) ? 'Loading the usage summary…' : 'This engine does not report usage yet.';
            return pageFrame('usage', 'Model usage of this project', controls, filterBar, h('p', { className: 'muted' }, waiting));
        }
        const rows = usageNeedsQuery(view) ? usage.rows : view.grouping === 'agent' ? (view.inclusive ? usage.breakdowns.agentInclusive : usage.breakdowns.agent) : usage.breakdowns[view.grouping];
        const tokens = (row) => `${compactCount(row.input)} in · ${compactCount(row.output)} out${row.cachedInput ? ` · ${compactCount(row.cachedInput)} cached` : ''}${row.reasoning ? ` · ${compactCount(row.reasoning)} reasoning` : ''}`;
        const money = (row) => [row.coverage.costReported ? `$${row.reportedCostUsd.toFixed(2)} reported by providers` : '', row.calculated.apiUsd ? `$${row.calculated.apiUsd.toFixed(2)} API${row.calculated.estimated ? ' (partly estimated)' : ''}` : '', row.calculated.subscriptionEquivalentUsd ? `$${row.calculated.subscriptionEquivalentUsd.toFixed(2)} token-price equivalent of subscription work` : ''].filter(Boolean).join(' · ');
        const total = h('section', { className: 'card', 'aria-label': 'Total' }, h('h2', {}, `Last ${usage.days} days`), h('p', {}, usage.total.units ? `${tokens(usage.total)} · ${usage.total.units} runs` : 'No model usage.'), money(usage.total) ? h('p', {}, money(usage.total)) : null, h('p', { className: 'muted' }, billingMix(usage.total)));
        const table = h(
            'section',
            { className: 'card', 'aria-label': 'Breakdown' },
            h('h2', {}, scoped && view.inclusive ? `By ${USAGE_GROUPINGS[view.grouping].toLowerCase()}, including work it initiated (rows overlap)` : `By ${USAGE_GROUPINGS[view.grouping].toLowerCase()}`),
            rows.length
                ? h(
                      'ul',
                      { className: 'list' },
                      // A row of missing attribution is shown as such and cannot be narrowed further (never guessed).
                      ...rows.map((row) => h('li', {}, row.filter ? h('button', { className: 'link', title: `Only ${row.label}`, onclick: () => narrow(row.filter) }, h('strong', {}, row.label)) : h('strong', { className: 'muted' }, row.label), h('span', {}, ` ${tokens(row)} · ${row.units} runs`), h('div', { className: 'muted' }, [money(row), billingMix(row)].filter(Boolean).join(' · ')))),
                  )
                : h('p', { className: 'muted' }, filters.length ? 'Nothing matches this filter in this period.' : 'Nothing in this period.'),
        );
        return pageFrame('usage', 'Totals count every consumption once, from durable raw usage; missing usage is shown, never counted as zero', controls, filterBar, total, table);
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

    /** Opens a domain page: a workspace tab in a desktop window, otherwise the page itself. */
    function openPage(domain) {
        if (workspace.enabled) workspaceUpdate(W.open(workspace.model, pageTab(domain)));
        else showPage(domain);
    }

    /** Shows a domain page (a history entry, so browser Back returns home); viewing never changes the engine. */
    function showPage(domain) {
        const item = state.attention.get(domain);
        if (item) item.seen = true;
        state.focus = domain;
        state.page = domain;
        history.pushState({ page: domain }, '', `#/${domain}`);
        if (domain === 'tasks') loadTasks(true);
        if (domain === 'usage') loadUsage(true);
        // Opening the log starts at its top level, with the viewer's choices.
        if (domain === 'actions' && state.activity && state.activity.stack.length) Object.assign(state.activity, { position: {}, stack: [], view: null, loaded: null });
        render(state.snapshot);
        window.scrollTo(0, 0);
        if (desktop) app.querySelector('.page-header button')?.focus({ preventScroll: true });
    }

    /** Returns to the home screen (Back control, Escape or browser history); a desktop window keeps its tabs. */
    function goHome() {
        if (workspace.enabled) return workspaceUpdate(W.activate(workspace.model, null));
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
        state.lastInput = Date.now();
        acknowledgeVisibleChat();
        state.interactions++;
        let changed = false;
        for (const [domain, item] of state.attention) {
            if (!item.seen && state.interactions - item.since >= ATTENTION_SETTLE_INTERACTIONS) {
                item.seen = true;
                changed = true;
                if (desktop && !state.page) {
                    // Keep the original button under the pointer until its click is delivered.
                    const tile = app.querySelector(`[data-tile="${CSS.escape(domain)}"]`);
                    tile?.classList.replace('new', 'seen');
                    tile?.querySelector('.new-label')?.remove();
                    tile?.setAttribute('aria-label', tileLabel(domain, item));
                }
            }
        }
        if (changed && !state.page && !desktop) render(state.snapshot);
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
            case 'harnesses': {
                const sessions = snapshot.harnessSessions;
                const counts = sessions && sessions.counts;
                const busy = sessions ? sessions.open.filter((session) => session.state !== 'idle') : [];
                return [
                    counts ? h('strong', {}, `${counts.open} open${counts.working ? ` · ${counts.working} working` : ''}${counts.idle ? ` · ${counts.idle} idle` : ''}${counts.waiting ? ` · ${counts.waiting} waiting` : ''}`) : h('strong', {}, snapshot.phase),
                    ...busy.slice(0, 3).map((session) => h('span', { className: 'muted' }, `${session.agent}: ${sessionWorkLabel(session)}`)),
                    snapshot.blockers.length ? h('strong', { className: 'bad' }, snapshot.blockers[0].title) : null,
                    snapshot.blockers.length ? h('span', { className: 'muted' }, snapshot.blockers[0].action || snapshot.blockers[0].reason) : snapshot.wait ? h('span', { className: 'muted' }, snapshot.wait.reason) : null,
                ];
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
                // Content work is emphasized: supporting system work is "next" only when nothing else is ready.
                const next = snapshot.queue.find((item) => item.readiness === 'ready' && item.purpose !== 'system') || snapshot.queue.find((item) => item.readiness === 'ready') || snapshot.queue[0];
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
                return [`Harnesses ${count('HARNESS')} · Browsers ${count('BROWSER')} · Desktop ${count('COMPUTER_CONTROL')}`, tools.waiting ? h('span', { className: 'warn' }, `New work waits: ${tools.waiting.reason}`) : null];
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
            case 'app': {
                const app = snapshot.app;
                const state = appState(app);
                if (!app || app.state === 'disabled' || app.state === 'offline') return [h('span', { className: 'muted' }, state.label)];
                if (app.state === 'unlinked') return [h('span', { className: 'muted' }, 'Not linked to the Promptbook App'), h('span', { className: 'muted' }, 'Open App to pair')];
                if (app.state === 'problem') return [h('strong', { className: 'bad' }, 'Problem')];
                const replaced = app.relays.some((relay) => relay.refusal === 'replaced');
                return [h('span', {}, h('strong', { className: state.tone }, state.label), h('span', { className: 'muted' }, ` · ${relaySummary(app)}`)), replaced ? h('span', { className: 'bad' }, 'another copy holds the key') : app.heartbeat && app.heartbeat.skewMs !== undefined ? h('span', { className: 'warn' }, 'clock skew') : app.fingerprint ? h('span', { className: 'muted' }, app.fingerprint) : null];
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

    /** Announces attention without relying on the visual marker or color. */
    function tileLabel(domain, attention) {
        return `${TITLES[domain]}${attention ? ` — needs attention${attention.seen ? '' : ' (new)'}` : ''}`;
    }

    /** Renders the same brief, tiles and attention in both the browser and desktop layouts. */
    function renderHome(snapshot) {
        const tiles = homeTiles(snapshot);
        if (!tiles.includes(state.focus)) state.focus = 'harnesses';
        const columns = desktop ? undefined : homeColumns(tiles.length);
        const lines = desktop ? undefined : tileLineBudget(tiles.length);
        const grid = h('section', {
            className: 'home',
            role: desktop ? undefined : 'grid',
            'aria-label': 'Dashboard home',
            style: columns ? `--columns:${columns};--rows:${Math.ceil(tiles.length / columns)}` : undefined,
        });
        for (const domain of tiles) {
            const attention = state.attention.get(domain);
            const classes = ['tile', attention ? `attention ${attention.tone === 'error' ? 'error' : ''} ${attention.seen ? 'seen' : 'new'}` : '', !desktop && state.focus === domain ? 'focused' : ''].filter(Boolean).join(' ');
            grid.append(
                h(
                    'button',
                    {
                        className: classes,
                        'data-tile': domain,
                        tabindex: desktop ? undefined : state.focus === domain ? '0' : '-1',
                        'aria-label': tileLabel(domain, attention),
                        onclick: () => openPage(domain),
                        onfocus: () => (state.focus = domain),
                    },
                    h('span', { className: 'tile-title' }, attention ? h('span', { className: 'mark', 'aria-hidden': 'true' }, '▲') : null, TITLES[domain], attention && !attention.seen ? h('span', { className: 'new-label' }, 'new') : null),
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
        return pageFrame('system', 'Engine identity, lifecycle, every active pause reason, manual controls, automatic updates, keep awake and the operational log', controls, pause, engine, snapshot.update ? renderEngineUpdate(snapshot.update) : null, snapshot.keepAwake ? renderKeepAwake(snapshot.keepAwake, Boolean(snapshot.active && snapshot.active.length)) : null, renderOperationalLog(snapshot));
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
            const impact = incident.pauses ? 'pauses new background work' : incident.overriddenAt ? `overridden ${time(incident.overriddenAt)} — work continues below the limit` : 'observed only (no pause)';
            incidents.append(
                h(
                    'div',
                    { className: `notice ${incident.severity === 'hard' ? 'error' : ''}` },
                    h('strong', {}, `${incident.severity.toUpperCase()} · ${incident.summary}`),
                    h('div', { className: 'muted' }, `since ${time(incident.openedAt)} · ${impact}${incident.severity === 'hard' ? ' · cannot be overridden; it clears once the condition is gone' : ''}`),
                    // What was done by itself, and only then what a person must do (the attention request).
                    incident.remedy ? h('div', { className: 'muted' }, `Automatic: ${incident.remedy}`) : null,
                    incident.needsAction ? h('div', {}, h('strong', {}, 'Needs you: '), incident.needsAction) : null,
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
        // The warning is the engine's own text, the same in every client.
        if (management.canReset) actions.append(h('button', { className: 'danger', onclick: () => walletReset(management.resetWarning || 'Resetting discards ALL old Wallet data for good.') }, 'Reset Wallet'));
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
                    h('div', { className: 'muted' }, `${action.reason} ${action.tasks.length ? `For ${action.tasks.join(', ')}.` : ''} Since ${time(action.createdAt)}${action.requests > 1 ? ` · requested ${action.requests}×` : ''}.${action.seenAt ? ` Seen ${time(action.seenAt)}, still waiting.` : ''}`),
                    manualSignInNote(snapshot, action),
                    h('div', { className: 'row' }, action.problem === 'code' ? h('button', { className: 'primary', onclick: () => walletCodeDialog(action) }, 'Enter the code') : action.problem === 'field' && wallet.state === 'ready' ? h('button', { className: 'primary', onclick: () => walletFieldDialog(action) }, 'Add the fields') : wallet.state === 'ready' ? h('button', { className: 'primary', onclick: () => walletLoginDialog({ origin: action.origin, action: action.id }) }, 'Add this login') : null,
                        // Mark as seen ends only this request's alert (it keeps waiting); Reject request denies and ends it.
                        // Both name the step the owner saw, so a request that moved on in the meantime is not changed.
                        action.seenAt ? null : h('button', { onclick: () => walletCall('wallet-seen', { request: action.id, step: action.step ?? 0 }) }, 'Mark as seen'),
                        h('button', { onclick: () => walletCall('wallet-reject', { request: action.id, step: action.step ?? 0 }, `Reject the login request for ${action.origin}? The waiting work is told that nothing was provided (it is not signed in) and this request is not asked again for it. To keep it waiting without its alert, choose Mark as seen instead.`) }, 'Reject request'),
                    ),
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
                        h(
                            'span',
                            { className: 'title' },
                            `${record.origin} · ${record.account}`,
                            h('span', { className: 'why' }, `${record.lastUsedAt ? `used ${time(record.lastUsedAt)}` : 'not used yet'}${record.lastOutcome === 'rejected' ? ' · rejected by the site' : ''}${record.fields && record.fields.length ? ` · also fills ${record.fields.map((item) => `${item.label}${item.uncertain ? ' (may change)' : ''}`).join(', ')}` : ''}`),
                            walletVerification(record),
                        ),
                        h(
                            'span',
                            { className: 'row' },
                            h('button', { onclick: () => walletLoginDialog({ origin: record.origin, label: record.account, id: record.id, fields: record.fields }) }, 'Update'),
                            record.testAwaits === 'code' ? h('button', { className: 'primary', onclick: () => walletCodeDialog({ origin: record.origin, test: record.id }) }, 'Enter the code') : null,
                            record.testing ? h('button', { onclick: () => walletCall('wallet-test-cancel', { id: record.id }) }, 'Cancel test') : h('button', { disabled: wallet.state !== 'ready', onclick: () => walletCall('wallet-test', { id: record.id }) }, 'Test'),
                            h('button', { className: 'danger', onclick: () => walletCall('wallet-remove', { id: record.id }, `Remove the saved login "${record.account}" for ${record.origin}?`) }, 'Remove'),
                        ),
                    ),
                ),
            ),
        );
        records.append(h('p', { className: 'muted' }, 'Agents never receive passwords: the Wallet signs in for them. Passwords, the 12 words for recovery and keys are never shown here.'));
        return pageFrame('wallet', 'Encrypted website logins of this project, applied for agents without showing them the credentials', status, requests, records);
    }

    /**
     * The latest credential test of a saved login: live progress while it runs, otherwise its redacted result and time
     * (historical evidence) or "unverified" when it was never tested.
     */
    function walletVerification(record) {
        const verification = record.verification;
        // Waiting for the owner (a code, an approval or a takeover) is no ongoing activity.
        if (record.testing) return h('span', { className: 'why warn', role: 'status' }, `Testing: ${record.testing}${record.testAwaits ? '' : '…'}`);
        if (!verification) return h('span', { className: 'why' }, 'Unverified: not tested yet.');
        const label = verification.state === 'verified' ? 'Verified' : verification.state === 'rejected' ? 'Test rejected' : 'Unverified (test incomplete)';
        return h('span', { className: `why ${verification.state === 'verified' ? 'ok' : verification.state === 'rejected' ? 'bad' : 'warn'}` }, `${label} ${time(verification.at)} · ${verification.reason}`);
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

    /** A written agent reference for a name (`@Name`, or `{Name}` when the name needs braces), as the engine formats it. */
    function agentReference(name) {
        return /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(name) && !/[-_]$/.test(name) ? `@${name}` : `{${name}}`;
    }

    /** The engine's detected problems of a Book as a list; clicking one moves the cursor to its line. */
    function bookProblems(diagnostics, field) {
        return bookProblemList(diagnostics, (line) => {
            const lines = field.value.split('\n');
            const offset = lines.slice(0, Math.max(0, line - 1)).reduce((sum, text) => sum + text.length + 1, 0);
            field.focus();
            field.setSelectionRange(offset, offset + (lines[line - 1] || '').length);
        });
    }

    /** Detected problems with line links handled by `goTo(line)` (a textarea or the workspace editor). */
    function bookProblemList(diagnostics, goTo) {
        if (!diagnostics.length) return [];
        return [
            h('p', { className: 'warn' }, `Detected problems (${diagnostics.length}) — saving stays allowed; Fixer repairs them`),
            h(
                'ul',
                { className: 'book-problems' },
                diagnostics.slice(0, 20).map((diagnostic) =>
                    h('li', {}, h('span', { className: diagnostic.severity === 'error' ? 'bad' : 'warn' }, diagnostic.severity === 'error' ? '✗ ' : '▲ '), diagnostic.line ? h('button', { className: 'link', onclick: () => goTo(diagnostic.line) }, `line ${diagnostic.line}`) : null, diagnostic.line ? ': ' : '', diagnostic.message),
                ),
                diagnostics.length > 20 ? h('li', { className: 'muted' }, `… ${diagnostics.length - 20} more`) : null,
            ),
        ];
    }

    /**
     * Book text with the engine's shared highlight ranges (from the one Book parser; never re-parsed here). Ranges of an
     * older text are clipped to the current lines, so the shown text is always exactly the current one.
     */
    function highlightedBook(text, spans) {
        const byLine = new Map();
        for (const span of spans || []) {
            if (!byLine.has(span.line)) byLine.set(span.line, []);
            byLine.get(span.line).push(span);
        }
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const nodes = [];
            let at = 0;
            for (const span of byLine.get(index) || []) {
                const start = Math.max(at, Math.min(span.start, line.length));
                const end = Math.min(span.end, line.length);
                if (end <= start) continue;
                if (start > at) nodes.push(line.slice(at, start));
                nodes.push(h('span', { className: `hl-${span.kind}` }, line.slice(start, end)));
                at = end;
            }
            if (at < line.length) nodes.push(line.slice(at));
            return [nodes, index < lines.length - 1 ? '\n' : ''];
        });
    }

    /**
     * The Book source viewer/editor: a modal outside the live-updating page over the engine's shared Book operations
     * (`/api/books`), showing the literal source with the engine's detected problems. Enter only inserts a line and
     * Ctrl+S (⌘S) saves without closing. Problematic content still saves (Fixer gets a repair task); a save based on
     * another revision is a conflict that keeps the draft. Engine-owned Expert is read-only. Closing keeps an unsaved
     * draft for the next opening.
     */
    async function openBook(target) {
        if (workspace.enabled && target.path) return openDocument('book', target.path);
        let source;
        try {
            source = await api(`/api/books?${target.path ? `path=${encodeURIComponent(target.path)}` : `ref=${encodeURIComponent(target.reference)}`}`);
        } catch (error) {
            toast(`Cannot open the Book: ${error.message}`);
            return;
        }
        if (workspace.enabled) return openDocument('book', source.path, { title: source.name });
        const editable = source.editable;
        const reason = source.reason;
        let draft = editable ? state.bookDrafts.get(source.path) : undefined;
        // A stale draft is offered as the content, but its base revision makes the save a visible conflict.
        let revision = draft ? draft.revision : source.revision;
        // Line endings are edited as LF and restored to the source's own style on save.
        const crlf = source.text.includes('\r\n');
        let baseline = source.text.replace(/\r\n/g, '\n');
        let notice = draft ? (draft.revision === source.revision ? 'Restored your unsaved draft.' : 'Restored your unsaved draft; the Book changed meanwhile, so saving reports a conflict to reconcile.') : '';
        let busy = false;
        let closed = false;
        const field = h('textarea', { className: 'book-source', 'aria-label': `Source of ${source.name || source.path}`, spellcheck: 'false', wrap: 'off', readonly: !editable });
        field.value = draft ? draft.text : baseline;
        // Shared syntax highlighting: a decorative layer under the transparent text of the textarea, painted with
        // the current text and the latest ranges the engine computed (an older engine sends none: plain textarea).
        const layer = h('pre', { className: 'book-highlight', 'aria-hidden': 'true' });
        const editor = h('div', { className: `book-editor${source.highlight ? ' highlighted' : ''}` }, layer, field);
        let spans = source.highlight || [];
        let highlightTimer = null;
        const paint = () => {
            if (!source.highlight) return;
            layer.replaceChildren(...highlightedBook(field.value, spans).flat(Infinity));
            layer.scrollTop = field.scrollTop;
            layer.scrollLeft = field.scrollLeft;
        };
        const rehighlight = () => {
            clearTimeout(highlightTimer);
            if (!source.highlight) return;
            highlightTimer = setTimeout(async () => {
                const text = field.value;
                const result = await api('/api/books/highlight', { method: 'POST', body: { text } }).catch(() => null);
                if (result && field.value === text) {
                    spans = result.highlight;
                    paint();
                }
            }, 150);
        };
        field.addEventListener('scroll', () => {
            layer.scrollTop = field.scrollTop;
            layer.scrollLeft = field.scrollLeft;
        });
        paint();
        if (field.value !== baseline) rehighlight();
        const dirty = () => editable && field.value !== baseline;
        // The kept draft follows the latest saved revision, also when a save finishes after the editor was closed.
        const keepDraft = () => {
            if (dirty()) state.bookDrafts.set(source.path, { text: field.value, revision });
            else if (editable) state.bookDrafts.delete(source.path);
        };
        const status = h('p', { className: 'muted', role: 'status' });
        const problems = h('div', {});
        const saveButton = editable ? h('button', { className: 'primary', onclick: () => void save() }, 'Save') : null;
        // Reconciling a stale draft: load the current source instead (the draft is dropped only on this choice).
        const discard = h('button', {
            onclick: async () => {
                if (dirty() && !window.confirm('Discard your unsaved changes and load the current source?')) return;
                try {
                    source = await api(`/api/books?path=${encodeURIComponent(source.path)}`);
                } catch (error) {
                    notice = `Cannot reload: ${error.message}`;
                    return show();
                }
                state.bookDrafts.delete(source.path);
                draft = undefined;
                baseline = source.text.replace(/\r\n/g, '\n');
                field.value = baseline;
                revision = source.revision;
                spans = source.highlight || [];
                paint();
                notice = 'Loaded the current source.';
                show();
            },
        }, 'Load current source');
        const show = () => {
            status.textContent = `${source.path}${editable ? ` · revision ${revision.slice(0, 8)}${dirty() ? ' · unsaved changes' : ''}` : ` · read-only${reason ? ` — ${reason}` : ''}`}${notice ? ` · ${notice}` : ''}`;
            problems.replaceChildren(...bookProblems(source.diagnostics, field));
            if (saveButton) saveButton.disabled = busy;
            discard.hidden = !editable || (!draft && !notice.startsWith('Not saved'));
        };
        const save = async () => {
            if (busy) return;
            busy = true;
            notice = 'Saving…';
            show();
            const edited = field.value;
            try {
                const outcome = await api('/api/books', { method: 'POST', body: { path: source.path, text: crlf ? edited.replace(/\n/g, '\r\n') : edited, revision } });
                revision = outcome.revision;
                source = { ...source, revision: outcome.revision, diagnostics: outcome.diagnostics };
                baseline = edited;
                draft = undefined;
                keepDraft();
                if (closed) toast(`Saved ${source.path}${outcome.commit ? ` (${outcome.commit.slice(0, 8)})` : ''}.`);
                notice = bookSaveNotice(outcome);
            } catch (error) {
                // Disk, permission, conflict or persistence failures keep the draft; they are not content warnings.
                notice = `Not saved: ${error.message}`;
                if (closed) toast(`${source.path} was not saved (${error.message}); your draft is kept.`);
            } finally {
                busy = false;
                show();
            }
        };
        const kind = source.kind === 'engine' ? 'Expert (engine-owned)' : source.kind === 'invalid' ? 'Book source' : `${source.kind[0].toUpperCase()}${source.kind.slice(1)} source`;
        const dialog = h(
            'dialog',
            { className: 'book-dialog', 'aria-label': `${kind}: ${source.name || source.path}` },
            h('h2', {}, h('span', {}, `${kind}: ${source.name || '(unnamed)'}`), h('span', { className: 'row' }, saveButton, discard, h('button', { onclick: () => dialog.close() }, 'Close'))),
            status,
            problems,
            editor,
            h('p', { className: 'muted' }, editable ? 'Enter adds a line · Ctrl+S (⌘S) saves without closing · Esc closes and keeps unsaved changes' : 'Read-only · Esc closes'),
        );
        field.addEventListener('input', () => {
            if (notice && !busy) notice = '';
            paint();
            rehighlight();
            show();
        });
        dialog.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (editable) void save();
                else {
                    notice = reason || 'This Book is read-only here.';
                    show();
                }
            }
        });
        dialog.addEventListener('close', () => {
            closed = true;
            keepDraft();
            if (dirty() && !busy) toast(`Unsaved changes to ${source.path} are kept; open the Book again to continue.`);
            dialog.remove();
        });
        show();
        document.body.append(dialog);
        dialog.showModal();
        field.focus();
        field.setSelectionRange(0, 0);
    }


    /*
     * The desktop workspace (Windows and macOS app): project pages and documents open as tabs of this window, with one
     * reusable preview, regular tabs and pinned tabs (the tab model is `workspace.js`). Text files and Books are edited in
     * Monaco with Promptbook's shared Book language logic, served by the desktop shell; drafts stay in this client and
     * every save goes through the engine's operations with revision and ownership checks. The shell keeps the workspace
     * for a restart and hands documents to the same project's dashboard in another window. Without the desktop shell's
     * workspace capability (the standalone browser, an older app) the modal editors remain.
     */
    const W = window.PtbkWorkspace;
    const workspace = {
        enabled: desktop && Boolean(window.desktopWorkspace) && Boolean(W),
        model: W ? W.empty() : null,
        /** Controllers of documents shown at least once, by tab key. */
        docs: new Map(),
        /** Restored drafts and editor positions of tabs not shown yet, by key. */
        pending: new Map(),
        /** Documents leaving this window, by move id → tab key. */
        outgoing: new Map(),
        /** The tab being dragged from this window's strip: { key, token }. */
        drag: null,
        strip: null,
        area: null,
        /** Whether the desktop app serves its Monaco editor to this page. */
        editorAvailable: false,
        /** Resolves to the Monaco editor factory, or null for the plain editor (loaded with the first document). */
        editor: null,
        saveTimer: null,
    };
    /** The drag type of a document tab dragged to another window's tab strip (its value is a one-time move id). */
    const DOCUMENT_DRAG = 'application/x-ptbk-document';

    /** A page tab of a dashboard domain. */
    function pageTab(domain) {
        return { key: `page:${domain}`, kind: 'page', page: domain, title: TITLES[domain] || domain };
    }

    /** The document kind of a project path (Books have their own editor and scoped commit). */
    function documentKind(path) {
        return /\.(book|ptbk)(\.md)?$/i.test(path) ? 'book' : 'file';
    }

    /**
     * The desktop's Monaco editor (from the shell's private scheme), loaded once when the first document needs it so the
     * dashboard itself never waits for it; null when unavailable.
     */
    function loadEditor() {
        if (workspace.editor) return workspace.editor;
        if (!workspace.editorAvailable) return (workspace.editor = Promise.resolve(null));
        return (workspace.editor = new Promise((resolve) => {
            document.head.append(h('link', { rel: 'stylesheet', href: 'ptbk-editor://editor/editor.css' }));
            const script = h('script', { src: 'ptbk-editor://editor/editor.js' });
            script.addEventListener('load', () => resolve(window.PromptbookEditor && window.PromptbookEditor.version === 1 ? window.PromptbookEditor : null));
            script.addEventListener('error', () => resolve(null));
            document.head.append(script);
        }));
    }

    /** Applies a new workspace: released documents close, the active page shows, and the workspace is kept. */
    function workspaceUpdate(next) {
        workspace.model = next;
        for (const [key, doc] of [...workspace.docs]) {
            if (W.find(next, key)) continue;
            doc.close();
            workspace.docs.delete(key);
        }
        for (const key of [...workspace.pending.keys()]) if (!W.find(next, key)) workspace.pending.delete(key);
        const active = next.active && W.find(next, next.active);
        if (active && active.kind === 'page' && state.page !== active.page) showPage(active.page);
        else if (!active && state.page) {
            state.page = null;
            history.replaceState(null, '', location.pathname + location.search);
            render(state.snapshot);
        }
        showWorkspace();
        scheduleWorkspaceSave();
    }

    /** Shows the active tab: a page in the dashboard area, a document in its own view (created on first show). */
    function showWorkspace() {
        if (!workspace.enabled || !workspace.strip) return;
        const active = workspace.model.active && W.find(workspace.model, workspace.model.active);
        const documentActive = Boolean(active && active.kind !== 'page');
        if (documentActive) ensureDocument(active);
        app.hidden = documentActive;
        workspace.area.hidden = !documentActive;
        for (const [key, doc] of workspace.docs) doc.element.hidden = !documentActive || key !== active.key;
        if (documentActive) workspace.docs.get(active.key).shown();
        renderStrip();
    }

    /** The open tab's controller, created with its restored or moved state. */
    function ensureDocument(tab, init) {
        let doc = workspace.docs.get(tab.key);
        if (!doc) {
            doc = createDocument(tab, init || workspace.pending.get(tab.key) || {});
            workspace.pending.delete(tab.key);
            workspace.docs.set(tab.key, doc);
        }
        return doc;
    }

    /** Keeps this window's workspace shortly after a change (tabs, drafts and editor positions; never a preview). */
    function scheduleWorkspaceSave() {
        if (!workspace.enabled) return;
        clearTimeout(workspace.saveTimer);
        workspace.saveTimer = setTimeout(saveWorkspaceNow, 300);
    }

    /** Hands the persisted part of the workspace to the desktop shell. */
    function saveWorkspaceNow() {
        if (!workspace.enabled) return;
        clearTimeout(workspace.saveTimer);
        const kept = W.persisted(workspace.model);
        const documents = {};
        for (const tab of kept.tabs) {
            const doc = workspace.docs.get(tab.key);
            const value = doc ? doc.persisted() : workspace.pending.get(tab.key);
            if (value && (value.draft || value.viewState)) documents[tab.key] = { ...(value.draft ? { draft: value.draft } : {}), ...(value.viewState ? { viewState: value.viewState } : {}) };
        }
        window.desktopWorkspace.save({ ...kept, documents });
    }

    /**
     * Opens a document tab: a preview (single click) or a regular tab (double-click, Edit, Edit Book). A document already
     * open in another window of this project is focused there instead.
     */
    async function openDocument(kind, path, options = {}) {
        const key = `${kind}:${path}`;
        if (!W.find(workspace.model, key) && (await window.desktopWorkspace.locate(key).catch(() => false))) return;
        workspaceUpdate(W.open(workspace.model, { key, kind, path, title: options.title || path.split('/').pop() || path }, { preview: Boolean(options.preview) }));
        const doc = workspace.docs.get(key);
        if (doc && !options.preview) doc.startEditing();
    }

    /** Opens the Book a reference names (Ctrl/Cmd+click in the editor), resolved by the engine. */
    async function openReference(name) {
        try {
            const source = await api(`/api/books?ref=${encodeURIComponent(agentReference(name))}`);
            await openDocument('book', source.path, { title: source.name });
        } catch (error) {
            toast(`Cannot open ${agentReference(name)}: ${error.message}`);
        }
    }

    /** Closes a tab; an unsaved draft stays in this window for the next opening (unless the document moved away). */
    function closeTab(key) {
        workspaceUpdate(W.close(workspace.model, key));
    }

    /** Moves a document to a new window or the main window; this window keeps it until the target takes it. */
    async function moveDocument(key, target) {
        const tab = W.find(workspace.model, key);
        if (!tab || tab.kind === 'page') return;
        const doc = ensureDocument(tab);
        if (doc.moving) return;
        await doc.ready;
        try {
            const { id } = await window.desktopWorkspace.move({ tab, document: doc.exportState() }, target);
            workspace.outgoing.set(id, key);
            doc.setMoving(id);
        } catch (error) {
            toast(`Not moved: ${error.message}`);
        }
    }

    /** Takes a document handed over by another window, then confirms ownership (or refuses, so the source keeps it). */
    async function adoptIncoming(id, moved) {
        const tab = moved && moved.tab;
        if (!tab || typeof tab.key !== 'string') return window.desktopWorkspace.reject(id, 'The document was not readable.');
        if (W.find(workspace.model, tab.key)) {
            workspaceUpdate(W.activate(workspace.model, tab.key));
            return window.desktopWorkspace.reject(id, 'The other window already has this document open.');
        }
        const opened = W.open(workspace.model, tab, { pinned: tab.mode === 'pinned' });
        const doc = ensureDocument(W.find(opened, tab.key), moved.document ? { transfer: moved.document } : {});
        workspaceUpdate(opened);
        if (!(await doc.ready)) {
            closeTab(tab.key);
            return window.desktopWorkspace.reject(id, 'The document could not be opened in the other window.');
        }
        try {
            await window.desktopWorkspace.accept(id);
        } catch (error) {
            // The source kept the document (the move ended): this copy is not an owner and closes without a draft.
            doc.discard = true;
            closeTab(tab.key);
            toast(`Not moved: ${error.message}`);
        }
    }

    /** Workspace events of the desktop shell: documents arriving, leaving or failing to leave, and focus requests. */
    function onWorkspaceEvent(event) {
        if (!event || typeof event !== 'object') return;
        if (event.type === 'incoming') void adoptIncoming(event.id, event.document);
        else if (event.type === 'activate' && W.find(workspace.model, event.key)) workspaceUpdate(W.activate(workspace.model, event.key));
        else if (event.type === 'moved' || event.type === 'move-failed') {
            const key = workspace.outgoing.get(event.id);
            workspace.outgoing.delete(event.id);
            const doc = key && workspace.docs.get(key);
            if (!doc) return;
            if (event.type === 'moved') {
                // The other window owns the document now, including its draft and undo history.
                doc.discard = true;
                closeTab(key);
            } else {
                doc.setMoving(null);
                if (event.reason && (!workspace.drag || workspace.drag.token !== event.id)) toast(`Not moved: ${event.reason}`);
            }
        }
    }

    /** One tab of the strip: its title, state, close button and keyboard-accessible tab actions. */
    function renderTab(tab, index) {
        const active = workspace.model.active === tab.key;
        const doc = workspace.docs.get(tab.key);
        const dirty = Boolean(doc && doc.dirty()) || Boolean(workspace.pending.get(tab.key) && workspace.pending.get(tab.key).draft);
        const label = `${tab.title}${tab.mode === 'preview' ? ' (preview)' : ''}${tab.mode === 'pinned' ? ' (pinned)' : ''}${dirty ? ' · unsaved' : ''}`;
        const actions = [
            tab.mode === 'preview' ? ['keep', 'Keep Open'] : null,
            tab.mode === 'pinned' ? ['unpin', 'Unpin'] : ['pin', 'Pin'],
            ['close', 'Close'],
            ['others', 'Close Others'],
            ['unpinned', 'Close Unpinned Tabs'],
            tab.kind !== 'page' ? ['new-window', 'Move to New Window'] : null,
            tab.kind !== 'page' ? ['main-window', 'Move to Main Window'] : null,
        ].filter(Boolean);
        const menu = h('select', { className: 'ws-actions', 'aria-label': `Actions for ${tab.title}`, title: 'Tab actions' }, h('option', { value: '' }, '⋯'), ...actions.map(([value, text]) => h('option', { value }, text)));
        menu.addEventListener('change', () => {
            const action = menu.value;
            menu.value = '';
            if (action === 'keep') workspaceUpdate(W.promote(workspace.model, tab.key));
            else if (action === 'pin') workspaceUpdate(W.pin(workspace.model, tab.key));
            else if (action === 'unpin') workspaceUpdate(W.unpin(workspace.model, tab.key));
            else if (action === 'close') closeTab(tab.key);
            else if (action === 'others') workspaceUpdate(W.closeOthers(workspace.model, tab.key));
            else if (action === 'unpinned') workspaceUpdate(W.closeUnpinned(workspace.model));
            else if (action === 'new-window') void moveDocument(tab.key, 'new');
            else if (action === 'main-window') void moveDocument(tab.key, 'main');
        });
        const title = h(
            'button',
            {
                className: 'ws-title',
                role: 'tab',
                id: `ws-tab-${index}`,
                'aria-selected': String(active),
                'aria-label': label,
                title: tab.path || tab.title,
                'data-tab': tab.key,
                onclick: () => workspaceUpdate(W.activate(workspace.model, tab.key)),
                // Double-clicking a preview's tab keeps it open.
                ondblclick: () => tab.mode === 'preview' && workspaceUpdate(W.promote(workspace.model, tab.key)),
            },
            tab.mode === 'pinned' ? h('span', { 'aria-hidden': 'true' }, '📌 ') : null,
            tab.title,
            dirty ? h('span', { className: 'ws-dirty', 'aria-hidden': 'true' }, ' ●') : null,
        );
        const element = h(
            'div',
            { className: `ws-tab ${tab.mode}${active ? ' active' : ''}`, draggable: tab.kind !== 'page' ? 'true' : undefined },
            title,
            menu,
            h('button', { className: 'ws-close', 'aria-label': `Close ${tab.title}`, title: 'Close', onclick: () => closeTab(tab.key) }, '×'),
        );
        if (tab.kind !== 'page') {
            // Dragging a document tab out of this window opens it in a new one; dropping it on another window's strip docks it.
            element.addEventListener('dragstart', (event) => {
                const token = `drag-${crypto.randomUUID()}`;
                event.dataTransfer.setData(DOCUMENT_DRAG, token);
                event.dataTransfer.effectAllowed = 'move';
                workspace.drag = { key: tab.key, token };
                workspace.outgoing.set(token, tab.key);
                const doc = ensureDocument(tab);
                void doc.ready.then(() => window.desktopWorkspace.offer({ tab, document: doc.exportState() }, token)).catch(() => undefined);
            });
            element.addEventListener('dragend', (event) => {
                const drag = workspace.drag;
                workspace.drag = null;
                if (!drag || event.dataTransfer.dropEffect === 'move') return;
                // Not docked anywhere: the offer ends; outside this window the document opens in a new window.
                window.desktopWorkspace.reject(drag.token, 'The drag ended.');
                const outside = event.screenX < window.screenX || event.screenY < window.screenY || event.screenX > window.screenX + window.outerWidth || event.screenY > window.screenY + window.outerHeight;
                if (outside) void moveDocument(drag.key, 'new');
            });
        }
        return element;
    }

    /** The tab strip: the project overview (the empty workspace) and the open pages and documents. */
    function renderStrip() {
        if (!workspace.strip) return;
        // Live updates rebuild the strip only when it changes (an open tab-actions menu stays open).
        const signature = JSON.stringify([workspace.model, [...workspace.docs].map(([key, doc]) => [key, doc.dirty()]), [...workspace.pending.keys()]]);
        if (signature === workspace.stripSignature) return;
        workspace.stripSignature = signature;
        const focused = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-tab');
        workspace.strip.replaceChildren(
            h('button', { className: `ws-overview${workspace.model.active === null ? ' active' : ''}`, 'data-tab': 'overview', 'aria-pressed': String(workspace.model.active === null), onclick: () => workspaceUpdate(W.activate(workspace.model, null)) }, 'Overview'),
            h('div', { className: 'ws-list', role: 'tablist', 'aria-label': 'Open pages and documents' }, ...workspace.model.tabs.map(renderTab)),
        );
        if (focused) workspace.strip.querySelector(`[data-tab="${CSS.escape(focused)}"]`)?.focus();
        document.documentElement.style.setProperty('--tabs-height', `${workspace.strip.offsetHeight}px`);
    }

    /** A plain editor with the Monaco editor's interface (when the desktop app cannot provide Monaco). */
    function plainEditor(container, options) {
        const field = h('textarea', { className: 'book-source', 'aria-label': options.label, spellcheck: 'false', wrap: 'off', readonly: Boolean(options.readOnly) });
        field.value = options.text;
        container.append(field);
        field.addEventListener('input', () => options.onChange && options.onChange(field.value));
        field.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (options.onSave) options.onSave();
            }
        });
        return {
            getText: () => field.value,
            setText: (text) => { field.value = text; },
            setReadOnly: (readOnly) => { field.readOnly = readOnly; },
            focus: () => field.focus(),
            layout: () => undefined,
            revealLine(line) {
                const lines = field.value.split('\n');
                const offset = lines.slice(0, Math.max(0, line - 1)).reduce((sum, text) => sum + text.length + 1, 0);
                field.focus();
                field.setSelectionRange(offset, offset + (lines[line - 1] || '').length);
            },
            exportState: () => ({ text: field.value }),
            viewState: () => null,
            dispose: () => field.remove(),
        };
    }

    /**
     * A document tab: a text file or Book in an editor, or the read-only view of another file. A preview is read-only
     * until an edit starts (Edit, Edit Book, double-click or Keep Open). Saves go through the engine against the revision
     * the draft is based on; a conflict shows the current source beside the draft until it is reconciled explicitly.
     */
    function createDocument(tab, init) {
        const status = h('p', { className: 'muted doc-status', role: 'status' });
        const actions = h('span', { className: 'row' });
        const problems = h('div', { className: 'doc-problems' });
        const body = h('div', { className: 'doc-body' }, h('p', { className: 'muted' }, 'Loading…'));
        const element = h('section', { className: 'document-view', 'aria-label': tab.path, hidden: true }, h('header', { className: 'doc-header' }, h('h2', {}, tab.title, h('small', { className: 'muted' }, ` ${tab.path}`)), actions), status, problems, body);
        workspace.area.append(element);
        const BOM = '﻿';
        const doc = {
            key: tab.key,
            element,
            editor: null,
            current: null,
            source: null,
            file: null,
            revision: null,
            baseline: null,
            bom: false,
            editing: false,
            wantEdit: false,
            moving: null,
            conflict: null,
            busy: false,
            notice: '',
            discard: false,
            closed: false,
            loaded: false,
        };
        const host = h('div', { className: 'doc-editor' });
        const currentHost = h('div', { className: 'doc-editor' });
        const editable = () => Boolean(doc.source && doc.source.editable);
        doc.dirty = () => Boolean(doc.loaded && doc.editor && editable() && doc.editor.getText() !== doc.baseline);
        doc.persisted = () => (doc.loaded ? { ...(doc.dirty() ? { draft: { text: doc.editor.getText(), revision: doc.revision } } : {}), ...(doc.editor && doc.editor.viewState() ? { viewState: doc.editor.viewState() } : {}) } : init);
        doc.exportState = () => (doc.loaded && doc.editor ? { ...doc.editor.exportState(), revision: doc.revision, baseline: doc.baseline, editing: doc.editing } : undefined);
        const readOnly = () => !editable() || !doc.editing || Boolean(doc.moving);
        const reveal = (line) => doc.editor && doc.editor.revealLine(line);
        const show = () => {
            if (doc.closed) return;
            const current = W.find(workspace.model, tab.key) || tab;
            const persistence = tab.kind === 'file' && state.snapshot && state.snapshot.files ? state.snapshot.files.batches.find((batch) => batch.paths.includes(tab.path)) : null;
            status.textContent = !doc.source
                ? doc.file ? `${doc.file.kind} · ${doc.file.size} bytes · preview` : ''
                : `${editable() ? `revision ${doc.revision.slice(0, 8)}${doc.dirty() ? ' · unsaved changes' : ''}` : `read-only${doc.source.reason ? ` — ${doc.source.reason}` : ''}`}${persistence ? ` · ${persistence.state === 'pending' ? 'Saved · Pending commit' : persistence.state}` : ''}${doc.moving ? ' · moving to another window…' : ''}${doc.notice ? ` · ${doc.notice}` : ''}`;
            const buttons = [];
            if (current.mode === 'preview') buttons.push(h('button', { onclick: () => workspaceUpdate(W.promote(workspace.model, tab.key)) }, 'Keep Open'));
            if (doc.source && editable() && !doc.editing) buttons.push(h('button', { className: 'primary', onclick: () => doc.startEditing() }, tab.kind === 'book' ? 'Edit Book' : 'Edit'));
            if (doc.source && editable() && doc.editing) buttons.push(h('button', { className: 'primary', disabled: doc.busy || Boolean(doc.moving), onclick: () => void save() }, 'Save'));
            if (doc.conflict) {
                buttons.push(h('button', { onclick: useCurrent }, 'Use current source'));
                buttons.push(h('button', { onclick: () => { if (window.confirm('Save your draft over the current source?')) { doc.revision = doc.conflict.revision; endConflict(); void save(); } } }, 'Save my draft over it'));
            }
            actions.replaceChildren(...buttons);
            problems.replaceChildren(...(tab.kind === 'book' && doc.source ? bookProblemList(doc.source.diagnostics || [], reveal) : []));
            if (doc.editor) doc.editor.setReadOnly(readOnly());
        };
        const strip = (text) => (text.startsWith(BOM) ? text.slice(1) : text);
        const startConflict = (current) => {
            doc.conflict = { text: strip(current.text), revision: current.revision };
            loadEditor().then((Editor) => {
                if (doc.closed || !doc.conflict) return;
                doc.current?.dispose();
                currentHost.replaceChildren();
                doc.current = (Editor ? Editor.create.bind(Editor) : plainEditor)(currentHost, { text: doc.conflict.text, kind: tab.kind, path: tab.path, readOnly: true, label: `Current source of ${tab.path}` });
                body.replaceChildren(h('div', { className: 'conflict' }, h('p', { className: 'warn' }, 'The source changed since your draft was based on it. Your draft (left) is kept; the current source is on the right.'), h('div', { className: 'doc-compare' }, host, currentHost)));
                show();
            });
        };
        const endConflict = () => {
            doc.conflict = null;
            doc.current?.dispose();
            doc.current = null;
            body.replaceChildren(host);
        };
        function useCurrent() {
            if (!doc.conflict) return;
            if (doc.dirty() && !window.confirm('Discard your draft and load the current source?')) return;
            doc.baseline = doc.conflict.text;
            doc.revision = doc.conflict.revision;
            doc.editor.setText(doc.baseline);
            endConflict();
            doc.notice = 'Loaded the current source.';
            show();
            scheduleWorkspaceSave();
        }
        const save = async () => {
            if (doc.busy || !editable() || !doc.editing || doc.moving || doc.conflict) return;
            doc.busy = true;
            doc.notice = 'Saving…';
            show();
            const text = doc.editor.getText();
            const request = { path: tab.path, text: doc.bom ? BOM + text : text, revision: doc.revision };
            try {
                if (tab.kind === 'book') {
                    const outcome = await api('/api/books', { method: 'POST', body: request });
                    doc.revision = outcome.revision;
                    doc.baseline = text;
                    doc.source = { ...doc.source, revision: outcome.revision, diagnostics: outcome.diagnostics };
                    doc.notice = bookSaveNotice(outcome);
                } else {
                    const outcome = await apiRaw('/api/files/text', { method: 'POST', body: request });
                    if (outcome.status === 200 && outcome.data.status !== 'conflict') {
                        doc.revision = outcome.data.revision;
                        doc.baseline = text;
                        doc.notice = textSaveNotice(outcome.data);
                    } else if (outcome.data.status === 'conflict') {
                        doc.notice = `Not saved: ${outcome.data.message}`;
                        if (outcome.data.current) startConflict(outcome.data.current);
                    } else doc.notice = `Not saved: ${outcome.data.error || `HTTP ${outcome.status}`}; your draft is kept.`;
                }
            } catch (error) {
                // Disk, permission, conflict or persistence failures keep the draft; a newer revision is reconciled.
                doc.notice = `Not saved: ${error.message}; your draft is kept.`;
                if (tab.kind === 'book') {
                    const current = await api(`/api/books?path=${encodeURIComponent(tab.path)}`).catch(() => null);
                    if (current && current.revision !== doc.revision) startConflict(current);
                }
            } finally {
                doc.busy = false;
                show();
                renderStrip();
                scheduleWorkspaceSave();
            }
        };
        doc.startEditing = () => {
            doc.wantEdit = true;
            if (!doc.loaded) return;
            if (!editable()) {
                doc.notice = (doc.source && doc.source.reason) || 'This document is read-only here.';
                return show();
            }
            if ((W.find(workspace.model, tab.key) || {}).mode === 'preview') workspaceUpdate(W.promote(workspace.model, tab.key));
            doc.editing = true;
            show();
            doc.editor.focus();
        };
        doc.setMoving = (id) => {
            doc.moving = id;
            show();
        };
        doc.shown = () => {
            show();
            if (doc.editor) requestAnimationFrame(() => doc.editor && doc.editor.layout());
        };
        doc.close = () => {
            if (doc.closed) return;
            doc.closed = true;
            // Closing keeps an unsaved draft for the next opening in this window, as the editors always did.
            const drafts = tab.kind === 'book' ? state.bookDrafts : state.textDrafts;
            if (!doc.discard && doc.dirty()) {
                drafts.set(tab.path, { text: doc.editor.getText(), revision: doc.revision });
                toast(`Unsaved changes to ${tab.path} are kept; open it again to continue.`);
            }
            doc.editor?.dispose();
            doc.current?.dispose();
            element.remove();
        };
        doc.ready = (async () => {
            try {
                if (tab.kind === 'book') doc.source = await api(`/api/books?path=${encodeURIComponent(tab.path)}`);
                else {
                    doc.file = await api(`/api/files/file?path=${encodeURIComponent(tab.path)}`);
                    if (TEXT_EDIT_KINDS.has(doc.file.kind) && !doc.file.truncated) doc.source = await api(`/api/files/text?path=${encodeURIComponent(tab.path)}`);
                }
            } catch (error) {
                body.replaceChildren(h('p', { className: 'warn' }, `Cannot open ${tab.path}: ${error.message}`));
                return false;
            }
            if (doc.closed) return false;
            if (!doc.source) {
                body.replaceChildren(fileView(doc.file));
                doc.loaded = true;
                show();
                return true;
            }
            doc.bom = doc.source.text.startsWith(BOM);
            doc.baseline = strip(doc.source.text);
            doc.revision = doc.source.revision;
            let text = doc.baseline;
            let history;
            const moved = init.transfer;
            const drafts = tab.kind === 'book' ? state.bookDrafts : state.textDrafts;
            const draft = editable() ? init.draft || drafts.get(tab.path) : undefined;
            drafts.delete(tab.path);
            if (moved && typeof moved.text === 'string') {
                text = moved.text;
                history = moved.history;
                doc.revision = typeof moved.revision === 'string' ? moved.revision : doc.revision;
                doc.baseline = typeof moved.baseline === 'string' ? moved.baseline : doc.baseline;
                doc.editing = Boolean(moved.editing);
                if (doc.revision !== doc.source.revision) doc.notice = 'Moved with its unsaved changes; the source changed meanwhile, so saving reports a conflict to reconcile.';
            } else if (draft && typeof draft.text === 'string') {
                text = draft.text;
                doc.revision = draft.revision;
                doc.editing = true;
                doc.notice = draft.revision === doc.source.revision ? 'Restored your unsaved draft.' : 'Restored your unsaved draft; the source changed meanwhile, so saving reports a conflict to reconcile.';
            }
            doc.editing = doc.editing || doc.wantEdit || (W.find(workspace.model, tab.key) || tab).mode !== 'preview';
            const Editor = await loadEditor();
            if (doc.closed) return false;
            body.replaceChildren(host);
            const options = {
                text, history, viewState: (moved && moved.viewState) || init.viewState, kind: tab.kind === 'book' ? 'book' : doc.file && doc.file.kind, path: tab.path, readOnly: readOnly(), label: `${tab.kind === 'book' ? 'Source' : 'Text'} of ${tab.path}`,
                onChange: () => {
                    if (doc.notice && !doc.busy) doc.notice = '';
                    show();
                    renderStrip();
                    scheduleWorkspaceSave();
                },
                onSave: () => (doc.editing ? void save() : doc.startEditing()),
                onOpenReference: (name) => void openReference(name),
            };
            try {
                doc.editor = Editor ? Editor.create(host, options) : plainEditor(host, options);
            } catch {
                doc.editor = plainEditor(host, options);
            }
            doc.loaded = true;
            show();
            renderStrip();
            return true;
        })();
        return doc;
    }

    /** The read-only view of a file that is not edited as text (an image, a large or binary file). */
    function fileView(file) {
        return h(
            'div',
            { className: 'doc-file' },
            file.image ? h('img', { src: file.image, alt: file.name, className: 'file-image' }) : null,
            file.kind === 'image' && !file.image ? h('p', { className: 'muted' }, 'The image is too large to display here.') : null,
            file.kind === 'video' ? h('p', { className: 'muted' }, 'Video playback is not part of Files; the file is identified only.') : null,
            file.kind === 'binary' ? h('p', { className: 'muted' }, 'Binary file; not shown as text.') : null,
            typeof file.text === 'string' ? h('pre', { className: 'log' }, file.text) : null,
            file.truncated ? h('p', { className: 'warn' }, 'Only the beginning of this file is shown; the rest stays on disk.') : null,
        );
    }

    /** Starts this window's workspace: restored tabs and drafts, drafts of closed windows, and documents moving in. */
    async function startWorkspace() {
        workspace.strip = h('nav', { className: 'workspace-tabs', 'aria-label': 'Workspace' });
        workspace.area = h('div', { className: 'documents', hidden: true });
        app.before(workspace.strip);
        app.after(workspace.area);
        workspace.strip.addEventListener('dragover', (event) => {
            if (!event.dataTransfer.types.includes(DOCUMENT_DRAG)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        });
        workspace.strip.addEventListener('drop', (event) => {
            const token = event.dataTransfer.getData(DOCUMENT_DRAG);
            if (!token) return;
            event.preventDefault();
            if (workspace.drag && workspace.drag.token === token) return;
            void window.desktopWorkspace.claim(token).then((claimed) => adoptIncoming(claimed.id, claimed.document), (error) => toast(`Not docked: ${error.message}`));
        });
        window.desktopWorkspace.onEvent(onWorkspaceEvent);
        window.addEventListener('pagehide', saveWorkspaceNow);
        let restored = {};
        try {
            restored = (await window.desktopWorkspace.restore()) || {};
        } catch {
            // A workspace that cannot be restored starts empty.
        }
        workspace.editorAvailable = Boolean(restored.editor);
        let next = W.restored(restored.state);
        for (const [key, value] of Object.entries((restored.state && restored.state.documents) || {})) workspace.pending.set(key, value);
        // Unsaved drafts of a closed window are offered in tabs; saving checks their base revision first.
        const recovered = [];
        for (const [key, item] of Object.entries(restored.recovered || {})) {
            if (!item || !item.tab || !item.draft || W.find(next, key)) continue;
            next = { ...W.open(next, item.tab, { pinned: item.tab.mode === 'pinned' }), active: next.active };
            workspace.pending.set(key, { draft: item.draft });
            recovered.push(item.tab.title || key);
        }
        if (recovered.length) toast(`Recovered unsaved drafts: ${recovered.join(', ')}. Saving checks the current source first.`);
        if (state.page) next = W.open(next, pageTab(state.page));
        else if (next.active && W.find(next, next.active).kind === 'page') state.page = W.find(next, next.active).page;
        workspaceUpdate(next);
        for (const item of restored.incoming || []) void adoptIncoming(item.id, item.document);
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
        // Additional login fields (date of birth, security answer, …): a saved one stays unless changed or removed.
        const extras = [];
        const extraList = h('div', {});
        const addExtra = (name, saved) => {
            const nameInput = h('input', { type: 'text', value: name || '', autocomplete: 'off', placeholder: 'e.g. Date of birth', readOnly: Boolean(saved) });
            const valueInput = h('input', { type: 'password', autocomplete: 'off', placeholder: saved ? 'saved; type to change' : '' });
            const remove = h('input', { type: 'checkbox' });
            extras.push({ nameInput, valueInput, remove, saved });
            extraList.append(h('div', { className: 'row' }, nameInput, walletCredentialField('Value', valueInput), saved ? h('label', {}, remove, ' Remove') : null));
        };
        for (const saved of initial.fields || []) addExtra(saved.label, true);
        let dialog;
        const form = h(
            'form',
            {
                method: 'dialog',
                autocomplete: 'off',
                onsubmit: async (event) => {
                    event.preventDefault();
                    // Saving is verified by the same credential test as the Test button (its result follows separately).
                    const fields = extras.filter((extra) => extra.nameInput.value.trim() && (extra.remove.checked || extra.valueInput.value)).map((extra) => ({ label: extra.nameInput.value.trim(), value: extra.remove.checked ? '' : extra.valueInput.value }));
                    const body = { origin: origin.value, username: username.value, password: password.value, label: label.value, test: true, ...(fields.length ? { fields } : {}), ...(initial.action ? { request: initial.action } : {}), ...(initial.id ? { id: initial.id } : {}) };
                    password.value = '';
                    for (const extra of extras) extra.valueInput.value = '';
                    const result = await walletCall('wallet-save', body);
                    body.password = '';
                    body.fields = undefined;
                    if (result) dialog.close();
                },
            },
            h('p', { className: 'muted' }, 'The username starts visible and the password masked. Show or hide each field while entering it; saved passwords cannot be revealed. Agents never receive them.'),
            field('Website', origin),
            walletCredentialField('Username or email', username),
            walletCredentialField('Password', password),
            field('Label (editable name of this login)', label),
            h('fieldset', {}, h('legend', {}, 'Additional login fields'), h('p', { className: 'muted' }, 'Only when the website asks for more than the username and password, for example a date of birth or a security answer. Values are saved encrypted and never shown.'), extraList, h('button', { type: 'button', onclick: () => addExtra('', false) }, 'Add a field')),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Save login'), h('button', { type: 'button', onclick: () => ((password.value = ''), dialog.close()) }, 'Cancel')),
        );
        dialog = walletDialog(initial.id ? 'Update a website login' : 'Add a website login', form);
        (initial.origin ? username : origin).focus();
    }

    /**
     * Protected entry of a one-time code for a pending code request (used once by the waiting work) or for a running
     * credential test (`action.test`: entered once into its login context); never stored.
     */
    function walletCodeDialog(action) {
        const code = h('input', { type: 'password', autocomplete: 'one-time-code', inputMode: 'numeric', required: true });
        let dialog;
        const form = h(
            'form',
            {
                method: 'dialog',
                autocomplete: 'off',
                onsubmit: async (event) => {
                    event.preventDefault();
                    // A pending code request of waiting work, or a running credential test of one login.
                    const body = action.test ? { id: action.test, code: code.value } : { request: action.id, code: code.value };
                    code.value = '';
                    const result = await walletCall(action.test ? 'wallet-test-code' : 'wallet-code', body);
                    body.code = '';
                    if (result) dialog.close();
                },
            },
            h('p', { className: 'muted' }, `Enter the one-time code ${action.origin} sent you. ${action.test ? 'The test enters it once into its own login context; it is not saved.' : 'The Wallet enters it once for the waiting work; agents never see it and it is not saved.'}`),
            walletCredentialField('One-time code', code),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Enter the code'), h('button', { type: 'button', onclick: () => ((code.value = ''), dialog.close()) }, 'Cancel')),
        );
        dialog = walletDialog('Enter a one-time code', form);
        code.focus();
    }

    /**
     * Protected entry of the additional login fields a website's form asked for: saved encrypted with the login (marked
     * uncertain when they may change) and filled for later sign-ins; never shown again.
     */
    function walletFieldDialog(action) {
        const inputs = (action.fields || []).map((label) => ({ label, input: h('input', { type: 'password', autocomplete: 'off' }) }));
        const uncertain = h('input', { type: 'checkbox' });
        let dialog;
        const form = h(
            'form',
            {
                method: 'dialog',
                autocomplete: 'off',
                onsubmit: async (event) => {
                    event.preventDefault();
                    const body = { request: action.id, fields: inputs.filter((item) => item.input.value).map((item) => ({ label: item.label, value: item.input.value, uncertain: uncertain.checked })) };
                    for (const item of inputs) item.input.value = '';
                    const result = await walletCall('wallet-field', body);
                    body.fields = [];
                    if (result) dialog.close();
                },
            },
            h('p', { className: 'muted' }, `The login form of ${action.origin} asks for more than the username and password. The Wallet saves these values encrypted with the login and fills them for later sign-ins; agents never see them.`),
            ...inputs.map((item) => walletCredentialField(item.label, item.input)),
            h('label', {}, uncertain, ' Not sure these stay the same for later logins (saved, marked uncertain)'),
            h('div', { className: 'row' }, h('button', { type: 'submit', className: 'primary' }, 'Save the fields'), h('button', { type: 'button', onclick: () => (inputs.forEach((item) => (item.input.value = '')), dialog.close()) }, 'Cancel')),
        );
        dialog = walletDialog('Add login fields', form);
        if (inputs[0]) inputs[0].input.focus();
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

    /** Empty reset after total key loss: the engine's all-data-loss warning, a typed RESET, then the new Wallet's words. */
    async function walletReset(warning) {
        const typed = window.prompt(`No key on this computer and no 12 words can unlock this Wallet, so its old data cannot be recovered.\n\n${warning}\n\nType RESET to continue (anything else cancels):`);
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
                return h('li', {}, h('label', {}, box, ` ${candidate.label}`), h('div', { className: 'muted' }, `${candidate.origin} · ${candidate.account}${candidate.unsupported?.length ? ` · not imported: ${candidate.unsupported.join(', ')} (not supported yet)` : ''}${candidate.state === 'duplicate' ? ' · identical to a saved login (kept)' : candidate.state === 'conflict' ? ' · differs from the saved login' : ''}`), replace ? h('label', { className: 'muted' }, replace, ' replace the saved values with the exported ones') : null);
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

    /** Loads the complete task inventory in the viewer's order and filter (the engine applies the shared ones). */
    async function loadTasks(force) {
        if (!force && state.tasks.revision === state.revision) return;
        state.tasks.revision = state.revision;
        try {
            const query = new URLSearchParams({ sort: state.tasks.sort });
            if (state.tasks.descending) query.set('descending', '1');
            for (const [field, value] of Object.entries(state.tasks.filter)) if (value.trim()) query.set(field, value.trim());
            // The engine groups supporting system work below content work (collapsed unless shown).
            query.set('supporting', state.tasks.showSupporting ? 'show' : 'hide');
            const request = ++state.tasks.request;
            const result = await api(`/api/tasks?${query}`);
            // A slower answer to an earlier filter never replaces the current one.
            if (request !== state.tasks.request) return;
            state.tasks.items = result.tasks;
            // An older engine filters nothing and reports neither the total nor the choices.
            state.tasks.total = typeof result.total === 'number' ? result.total : result.tasks.length;
            state.tasks.choices = result.choices || null;
            state.tasks.supporting = result.supporting || 0;
            state.tasks.firstSupporting = typeof result.firstSupporting === 'number' ? result.firstSupporting : null;
        } catch (error) {
            toast(`Tasks unavailable: ${error.message}`);
        }
        if (state.page === 'tasks') render(state.snapshot);
    }

    /** Opens a new chat with one agent preselected in the ordinary new-chat entry and shared composer. */
    function chatWithAgent(name) {
        state.newChatAgent = name;
        state.newChat = name.toLowerCase() === 'chatter' ? 'chatter' : 'all';
        state.chat = null;
        openPage('chats');
        showNewChatAgents();
    }

    /** Whether the viewer's task filter selects anything (an empty filter shows the complete inventory). */
    function isTaskFilterActive() {
        return Object.values(state.tasks.filter).some((value) => value.trim());
    }

    /** Changes one field of the viewer's task filter and reloads the inventory (typed text waits for a pause). */
    let taskFindTimer = null;
    function setTaskFilter(field, value) {
        state.tasks.filter = { ...state.tasks.filter, [field]: value };
        clearTimeout(taskFindTimer);
        if (field === 'text') taskFindTimer = setTimeout(() => loadTasks(true), 250);
        else loadTasks(true);
    }

    /** Filter controls of the Tasks page: text and the status, agent, kind and purpose values present in the inventory. */
    function taskFilterControls() {
        const choices = state.tasks.choices;
        const filter = state.tasks.filter;
        const find = h('input', { type: 'search', 'data-draft': 'tasks:find', 'aria-label': 'Find tasks', placeholder: 'Find in title, source, agent or status…', autocomplete: 'off' });
        find.value = filter.text;
        find.addEventListener('input', () => setTaskFilter('text', find.value));
        /** One select over the present values, with "any" first; a chosen value stays listed even after it vanishes. */
        const select = (field, label, any, values) => {
            const options = [...new Set([...(values || []), ...(filter[field] ? [filter[field]] : [])])];
            const element = h('select', { 'aria-label': label }, h('option', { value: '' }, any), options.map((value) => h('option', { value }, value)));
            element.value = filter[field];
            element.addEventListener('change', () => setTaskFilter(field, element.value));
            return element;
        };
        return h(
            'div',
            { className: 'row task-filters' },
            find,
            select('readiness', 'Status', 'Any status', choices && choices.readiness),
            select('agent', 'Agent', 'Any agent', choices && choices.agents),
            select('kind', 'Kind', 'Source-backed and engine-owned', choices && choices.kinds),
            select('purpose', 'Purpose', 'Any purpose', choices && choices.purposes),
            isTaskFilterActive() ? h('button', { onclick: clearTaskFilter }, 'Clear filter') : null,
        );
    }

    /** The latest outcome of a task in this session, from the shared snapshot (null when it has none). */
    function taskResultLine(item) {
        const result = state.snapshot && state.snapshot.results.recent.find((candidate) => candidate.ref === item.ref);
        return result ? h('span', { className: 'why' }, `Last result: ${result.outcome} ${time(result.endedAt)} · ${result.summary}${result.commit ? ` · ${result.commit.slice(0, 8)}` : ''}`) : null;
    }

    /** Clears the viewer's task filter: every task (distant and completed ones included) is shown again. */
    function clearTaskFilter() {
        clearTimeout(taskFindTimer);
        state.tasks.filter = { text: '', readiness: '', agent: '', kind: '', purpose: '' };
        loadTasks(true);
    }

    /** The Tasks page: the complete inventory with smart default order and user-selected sorting and filtering. */
    function renderTasksPage() {
        const card = h('section', { className: 'card queue', 'aria-label': 'Tasks' });
        const sort = h('select', { 'aria-label': 'Sort by' }, ['smart', 'priority', 'time', 'status', 'agent', 'name'].map((field) => h('option', { value: field }, field === 'smart' ? 'smart (current, coming up, recent, history)' : field)));
        sort.value = state.tasks.sort;
        sort.addEventListener('change', () => ((state.tasks.sort = sort.value), loadTasks(true)));
        const direction = h('button', { onclick: () => ((state.tasks.descending = !state.tasks.descending), loadTasks(true)) }, state.tasks.descending ? 'Descending' : 'Ascending');
        // Talking to Tasker is the main authoring action (the ordinary chat); sorting is only a view.
        const tasker = h('button', { className: 'primary', onclick: () => chatWithAgent('Tasker') }, 'Talk to Tasker');
        // Supporting system work is muted and grouped lower; this shows or collapses that group (presentation only).
        const supporting = state.tasks.supporting ? h('button', { 'aria-pressed': String(state.tasks.showSupporting), onclick: () => ((state.tasks.showSupporting = !state.tasks.showSupporting), loadTasks(true)) }, state.tasks.showSupporting ? 'Hide system work' : `Show system work (${state.tasks.supporting})`) : null;
        const filtered = isTaskFilterActive();
        const count = !state.tasks.items ? 'All tasks (…)' : filtered ? `Tasks (${state.tasks.items.length} of ${state.tasks.total})` : `All tasks (${state.tasks.items.length})`;
        card.append(h('h2', {}, h('span', {}, count), h('span', { className: 'row' }, tasker, supporting, h('label', {}, 'Sort ', sort), direction)), taskFilterControls());
        if (!state.tasks.items) {
            card.append(h('p', { className: 'muted' }, 'Loading the task inventory…'));
            return pageFrame('tasks', 'Every task in every state', card);
        }
        const tone = { ready: 'ok', active: 'ok', 'needs-assignment': 'warn', assigning: 'warn', blocked: 'bad', failed: 'bad', 'needs-recovery': 'bad', 'awaiting-user': 'warn' };
        card.append(
            h(
                'ul',
                { className: 'list' },
                state.tasks.items.flatMap((item, index) => [
                    index === state.tasks.firstSupporting ? h('li', { className: 'group-heading muted' }, `Supporting system work (${state.tasks.supporting}) — muted, scheduled as usual`) : null,
                    h(
                        'li',
                        // Supporting system work is muted; a human request on it stays conspicuous.
                        { className: item.purpose === 'system' && item.readiness !== 'awaiting-user' ? 'supporting' : '' },
                        // An engine-owned task shows its kind and actual executor instead of a project source.
                        item.kind === 'engine'
                            ? h(
                                  'span',
                                  { className: 'title' },
                                  pill('engine', ''),
                                  ' ',
                                  item.title,
                                  // Definition, this run's retry and the latest finished run stay distinct.
                                  h('span', { className: 'why' }, `${item.reason} · ${item.executor || 'the engine'}${item.priorityText ? ` · ${item.priorityText} priority` : ''}${item.until ? ` · next ${time(item.until)}` : item.lastDone ? ` · done ${time(item.lastDone)}` : ''}`),
                                  item.definition ? h('span', { className: 'why' }, `Run of "${item.definition}"${item.retry ? ` · retry ${item.retry} after failed runs` : ''}${item.runs && item.runs.length ? ` · last run ${item.runs[0].title} ${item.runs[0].outcome} ${time(item.runs[0].at)}` : ''}`) : null,
                              )
                            : h('span', { className: 'title' }, item.title, h('span', { className: 'why' }, `${item.reason}${item.agent ? ` · ${item.agent}` : ''}${item.core ? ' (core)' : ''}${item.priority ? ` · priority ${item.priority}` : ''}${item.repeat ? ` · every ${item.repeat}` : ''}${item.until ? ` · next ${time(item.until)}` : item.lastDone ? ` · done ${time(item.lastDone)}` : ''} · ${item.source}${item.purpose ? ` · ${item.purpose}` : ''}`)),
                        // Each task keeps its own latest outcome or error (there is no separate results page).
                        taskResultLine(item),
                        // The task's question is the one in its chat: answering opens that conversation.
                        item.waitingChat ? h('button', { className: 'primary', onclick: () => openChat(item.waitingChat) }, 'Answer') : null,
                        // Only a task with a project source has a Book to edit (an engine-owned task has none).
                        item.kind !== 'engine' && item.source ? h('button', { onclick: () => void openBook({ path: item.source }) }, 'Source') : null,
                        item.kind !== 'engine' && item.source ? h('button', { onclick: () => openTaskActivity(item.source) }, 'External activity') : null,
                        pill(item.readiness, tone[item.readiness]),
                    ),
                ]),
            ),
        );
        if (state.tasks.supporting && state.tasks.firstSupporting === null && !state.tasks.filter.purpose) card.append(h('p', { className: 'muted' }, `${state.tasks.supporting} supporting system task${state.tasks.supporting === 1 ? '' : 's'} hidden. `, h('button', { className: 'link', onclick: () => ((state.tasks.showSupporting = true), loadTasks(true)) }, 'Show system work'), '.'));
        // Filtering is a view only: clearing it makes every task reachable again.
        if (!state.tasks.items.length && filtered) card.append(h('p', { className: 'muted' }, `No task matches the filter. `, h('button', { className: 'link', onclick: clearTaskFilter }, `Clear it to show all ${state.tasks.total} tasks`), '.'));
        else if (!state.tasks.items.length && !state.tasks.supporting) card.append(h('p', { className: 'muted' }, 'No tasks yet. Talk to Tasker to create one.'));
        return pageFrame('tasks', 'Viewer order and filter only — they never change engine scheduling', card);
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
                        h('button', { onclick: () => chatWithAgent(agent.name) }, 'Chat'),
                        // The agent's Book: an editable project source, or the engine-owned Expert read-only.
                        h('button', { onclick: () => void openBook({ reference: agentReference(agent.name) }) }, 'Book'),
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
            case 'harnesses':
                return pageFrame('harnesses', 'Every open harness session of your agents, including idle ones; selecting one shows it in detail', renderHarnesses(snapshot));
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
            case 'usage':
                return renderUsagePage(snapshot);
            case 'actions':
                return renderActionsPage(snapshot);
            case 'history':
                return renderHistoryPage(snapshot);
            case 'files':
                return renderFilesPage();
            case 'app':
                return pageFrame('app', 'This project’s link to the Promptbook App (app.ptbk.io)', renderApp(snapshot));
            case 'sync':
                return pageFrame('sync', 'Git autosync through the engine’s one coordinator', renderSync(snapshot));
            default:
                return renderHome(snapshot);
        }
    }

    /** Renders the home screen or the open page, preserving focus, drafts and scroll. */
    function render(snapshot) {
        if (!snapshot) return;
        // Leaving the chat view that started voice closes its owning view: the shell ends that call (the chat and its
        // work continue), exactly as closing a terminal chat does.
        if (state.voiceOwner && !(state.page === 'chats' && !state.newChat && state.chat && state.chat.name === state.voiceOwner)) {
            const owner = state.voiceOwner;
            state.voiceOwner = null;
            desktopVoice('leave', owner);
        }
        const previousThread = app.querySelector('.messages[data-chat]');
        if (previousThread) state.chatScroll.set(previousThread.dataset.chat, { top: previousThread.scrollTop, bottom: previousThread.scrollHeight - previousThread.scrollTop - previousThread.clientHeight < 24 });
        state.chatObserver?.disconnect();
        state.chatObserver = null;
        if (state.page && !homeTiles(snapshot).includes(state.page)) state.page = null;
        const active = document.activeElement;
        const focusDraft = active && active.getAttribute && active.getAttribute('data-draft');
        const focusTile = active && active.getAttribute && active.getAttribute('data-tile');
        const focusActivity = active && active.getAttribute && active.getAttribute('data-activity');
        const selection = focusDraft ? [active.selectionStart, active.selectionEnd] : null;
        const scroll = window.scrollY;
        document.body.classList.toggle('home-view', !state.page);
        const pairingField = app.querySelector('[data-draft="app:pairing-url"]');
        const pairingUrl = state.page === 'app' ? pairingField?.value : undefined;
        app.replaceChildren(state.page ? renderPage(snapshot, state.page) : renderHome(snapshot));
        const nextPairingField = app.querySelector('[data-draft="app:pairing-url"]');
        if (pairingUrl && nextPairingField) nextPairingField.value = pairingUrl;
        const thread = app.querySelector('.messages[data-chat]');
        if (thread) {
            const position = state.chatScroll.get(thread.dataset.chat);
            thread.scrollTop = !position || position.bottom ? thread.scrollHeight : position.top;
        }
        if (focusDraft) {
            const field = app.querySelector(`[data-draft="${CSS.escape(focusDraft)}"]`);
            if (field) {
                field.focus();
                if (selection) field.setSelectionRange(selection[0], selection[1]);
            }
        } else if (focusTile && !state.page) {
            const tile = app.querySelector(`[data-tile="${CSS.escape(state.focus)}"]`);
            if (tile) tile.focus({ preventScroll: desktop });
        } else if (focusActivity) {
            // Arrivals rebuild the page: keyboard selection stays on the same row or control.
            const control = app.querySelector(`[data-activity="${CSS.escape(focusActivity)}"]`);
            if (control) control.focus({ preventScroll: true });
        }
        if (desktop || state.page) window.scrollTo(0, scroll);
        // The sticky page header sits right below the (possibly wrapped) top bar.
        const topbar = document.querySelector('.topbar');
        if (topbar) document.documentElement.style.setProperty('--topbar-height', `${topbar.offsetHeight}px`);
        const live = state.connected ? 'live' : 'disconnected — showing last known state';
        const attention = state.attention.size;
        // The shared application header: Promptbook / ptbk (brand) and the project, with attention and freshness as
        // secondary details; it is never a tile. Lifecycle/pause state lives in the System and related tiles.
        headerStatus.replaceChildren(
            h('strong', { className: 'header-project' }, snapshot.project.name),
            snapshot.service.commitMode === 'no-commit' ? h('span', { className: 'pill warn' }, 'NO-COMMIT') : '',
            h('span', { className: 'header-details' }, attention ? h('span', { className: 'warn' }, `▲ ${attention} need${attention === 1 ? 's' : ''} attention · `) : '', live),
        );
        document.title = `${snapshot.chats.waiting.length ? `(${snapshot.chats.waiting.length}) ` : ''}ptbk · ${snapshot.project.name}`;
        if (workspace.enabled) {
            renderStrip();
            const doc = workspace.model.active && workspace.docs.get(workspace.model.active);
            if (doc) doc.shown();
        }
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
                if (state.page === 'usage') loadUsage(false);
                render(snapshot);
                // New messages in the open chat arrive without stealing focus or drafts.
                if (state.chat && state.chat.detail) {
                    const summary = snapshot.chats.recent.find((chat) => chat.name === state.chat.name);
                    // A reply in progress streams its progress: refetch while it lasts and once more when it ends.
                    const replying = (snapshot.chats.replying || []).includes(state.chat.name) || Boolean(state.chat.detail.live);
                    const recheck = (snapshot.chats.rechecks || []).find((item) => item.chat === state.chat.name);
                    const recheckChanged = (recheck && recheck.nextAt) !== (state.chat.detail.recheck && state.chat.detail.recheck.nextAt);
                    // A live call changes state, captions and recordings without new messages.
                    const calling = (snapshot.chats.voice || []).includes(state.chat.name) || voiceLive(state.chat.detail.voice);
                    if (summary && (replying || calling || recheckChanged || summary.messages !== state.chat.detail.messages.length || summary.status !== state.chat.detail.summary.status)) loadChat(state.chat.name);
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
        if (workspace.enabled) await startWorkspace();
        window.addEventListener('popstate', () => {
            state.page = routeFromHash();
            if (workspace.enabled) {
                workspace.model = state.page ? W.open(workspace.model, pageTab(state.page)) : W.activate(workspace.model, null);
                showWorkspace();
            }
            // Back/Forward into Tasks loads the current inventory, as opening the page does.
            if (state.page === 'tasks') loadTasks(true);
            if (state.page === 'usage') loadUsage(true);
            render(state.snapshot);
            if (desktop && !state.page) app.querySelector(`[data-tile="${CSS.escape(state.focus)}"]`)?.focus();
            // Within the External activity log, Back returns one level with its selection and scroll.
            if (state.page === 'actions') activityBackTo((history.state && history.state.depth) || 0);
        });
        if (!desktop) {
            // The compact browser grid follows the viewport, including its height.
            let layout = '';
            new ResizeObserver(() => {
                const tiles = state.snapshot ? homeTiles(state.snapshot).length : 0;
                const next = `${homeColumns(tiles)}:${tileLineBudget(tiles)}`;
                if (!state.page && state.snapshot && next !== layout) render(state.snapshot);
                layout = next;
            }).observe(document.documentElement);
        }
        document.addEventListener('pointerdown', interacted);
        document.addEventListener('wheel', interacted, { passive: true });
        document.addEventListener('touchstart', interacted, { passive: true });
        document.addEventListener('keydown', (event) => {
            interacted();
            // Editors type into an edit context as well as text fields; keys in a workspace document stay with it.
            const typing = event.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable || Boolean(event.target.closest && event.target.closest('.monaco-editor, .documents')));
            if (event.key === 'Escape' && state.page && !typing) {
                event.preventDefault();
                goHome();
            } else if (!desktop && !state.page && !typing && (event.key.startsWith('Arrow') || event.key === 'Enter')) {
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
