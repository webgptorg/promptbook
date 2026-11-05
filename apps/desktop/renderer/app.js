import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { createRichInput } from './rich-input.js';

/** Local view state contains no credentials, project business rules or engine ownership. */
const api = window.desktop;
const $ = (id) => document.getElementById(id);
const themeButtons = [...$('appearance').querySelectorAll('button')];
const terminals = new Map();
const earlyEvents = new Map();
let host = { rows: [] };
let selected;
let mode = 'overview';
let activeTerminal;
let launch;
let observed = false;
let refreshing = false;
let busy = false;
/** Live views presented in this window (a controlled tab's viewer, a voice call's media page), by feature id. */
const features = new Map();
const earlyFeatureEvents = new Map();
let activeFeature;
/** The selected project's live-control context: pending sign-ins, controlled tabs, browsers and chats. */
let featureContext;
let featureForm;
let featureSignature;
let voiceCall;

/** DOM helper: project names, errors and prompt text are always text nodes. */
function element(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else if (key === 'className') node.className = value;
        else if (key === 'checked') node.checked = value;
        else if (value !== undefined && value !== false) node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
}

/** Reports actual outcomes without interpreting accepted shutdown as completed. */
function notice(message, error = false) {
    $('notice').hidden = !message;
    $('notice').classList.toggle('error', error);
    $('notice').textContent = message || '';
    layout();
}

/** Keeps the appearance selector in sync with the app-wide preference. */
function showTheme(source) {
    for (const button of themeButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.theme === source));
        button.disabled = false;
    }
}

/** Fits client-owned terminal content and the native unprivileged dashboard view. */
function layout() {
    if (mode === 'dashboard') {
        const bounds = $('dashboard-pane').getBoundingClientRect();
        api.bounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    }
    if (mode === 'terminal') {
        const item = terminals.get(activeTerminal);
        if (item) { item.fit.fit(); api.resize(activeTerminal, { cols: item.term.cols, rows: item.term.rows }); }
    }
    // Only the selected live view is visible; the others keep running with zero size.
    const pane = $('feature-pane').getBoundingClientRect();
    for (const id of features.keys()) api.featureBounds(id, mode === 'feature' && id === activeFeature ? { x: pane.x, y: pane.y, width: pane.width, height: pane.height } : { x: 0, y: 0, width: 0, height: 0 });
}

/** A local panel edge supports pointer drag and the standard separator keyboard controls. */
function resizePane(divider, pane, { axis, variable, range }) {
    const horizontal = axis === 'x';
    const size = () => pane.getBoundingClientRect()[horizontal ? 'width' : 'height'];
    const coordinate = (event) => horizontal ? event.clientX : event.clientY;
    const reflect = () => {
        if (!pane.getClientRects().length) return;
        const [min, max] = range();
        divider.setAttribute('aria-valuemin', min);
        divider.setAttribute('aria-valuemax', max);
        divider.setAttribute('aria-valuenow', Math.round(size()));
    };
    const set = (value) => {
        const [min, max] = range();
        pane.style.setProperty(variable, `${Math.min(max, Math.max(min, value))}px`);
    };
    let drag;
    divider.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || drag) return;
        divider.focus();
        divider.setPointerCapture(event.pointerId);
        drag = { id: event.pointerId, start: coordinate(event), size: size() };
        event.preventDefault();
    });
    divider.addEventListener('pointermove', (event) => {
        if (drag?.id === event.pointerId) set(drag.size + coordinate(event) - drag.start);
    });
    divider.addEventListener('lostpointercapture', () => { drag = undefined; });
    divider.addEventListener('keydown', (event) => {
        const [min, max] = range();
        const backward = horizontal ? 'ArrowLeft' : 'ArrowUp';
        const forward = horizontal ? 'ArrowRight' : 'ArrowDown';
        const value = { [backward]: size() - 16, [forward]: size() + 16, Home: min, End: max }[event.key];
        if (value === undefined) return;
        event.preventDefault();
        set(value);
    });
    new ResizeObserver(reflect).observe(pane);
    window.addEventListener('resize', reflect);
}

/** Shows the host's current lifecycle and, separately, any existing attention signal. */
function projectStatus(row) {
    const state = row.status === 'live' ? row.state || 'unknown' : row.status;
    const attention = row.needsAttention ?? (row.waitingChats > 0);
    const tone = attention && row.status === 'live' ? 'attention' : state;
    const label = tone === 'attention' ? `${state} · needs attention` : state;
    return { dot: element('span', { className: 'status-dot', 'data-status': tone, 'aria-hidden': 'true' }), label };
}

/** Changing views never invokes a lifecycle operation or closes another terminal. */
function show(next) {
    if (next !== 'dashboard') api.hideDashboard();
    mode = next;
    for (const pane of ['overview', 'dashboard', 'terminal', 'feature']) $(`${pane}-pane`).hidden = pane !== mode;
    const heading = $('heading');
    heading.textContent = next === 'overview' ? 'Your projects' : host.rows.find((row) => row.projectRoot === selected)?.projectName || 'Promptbook';
    heading.title = heading.textContent;
    renderFeatureBar(true);
    requestAnimationFrame(layout);
}

/** Whether a tab control is over (handed back, ended or lost). */
function controlOver(control) {
    return ['returned', 'ended', 'lost'].includes(control.state);
}

/** A short name of a live view for its switcher. */
function featureLabel(item) {
    if (item.kind === 'voice') return `Voice · ${item.chat}`;
    const view = item.view || {};
    let where = view.title || '';
    if (!where && view.url) { try { where = new URL(view.url).host; } catch { where = view.url; } }
    return `Tab · ${where || view.browser || 'browser'}`;
}

/** Reads the selected project's live-control context (nothing when its engine is stopped or older). */
async function refreshFeatures() {
    const root = selected;
    if (!root || mode === 'overview' || mode === 'terminal') return;
    try { featureContext = { root, ...await api.featureContext(root) }; }
    catch { featureContext = undefined; }
    renderFeatureBar();
}

/** Opens a live view in this window: a controlled tab (new, reopened or a manual sign-in) or voice. */
async function openFeature(request) {
    if (!selected) return;
    const root = selected;
    notice('');
    try {
        const result = await api.openFeature({ ...request, root, bounds: { x: 0, y: 0, width: 0, height: 0 } });
        if (!features.has(result.feature)) features.set(result.feature, { kind: request.kind, root, chat: request.chat, control: result.control?.id, view: result.control, state: 'waiting' });
        for (const event of earlyFeatureEvents.get(result.feature) || []) featureEvent(event);
        earlyFeatureEvents.delete(result.feature);
        featureForm = undefined;
        if (features.has(result.feature)) selectFeature(result.feature);
    } catch (error) { notice(error.message, true); }
    void refreshFeatures();
}

/** Shows one live view in place of the dashboard (the dashboard reopens when chosen again). */
function selectFeature(id) {
    activeFeature = id;
    show('feature');
}

/** Closes a live view: voice ends; a tab viewer only closes (the tab stays with you until you return it). */
async function closeFeature(id) {
    const item = features.get(id);
    if (item?.kind === 'voice' && !window.confirm('End this voice call? The chat and its work continue.')) return;
    try { await api.closeFeature(id); } catch (error) { notice(error.message, true); }
    void refreshFeatures();
}

/** Returns the tab to the agent, ends use, or answers the Wallet's save offer. */
async function tabAction(control, action, answer) {
    if (action === 'end' && !window.confirm('End your use of this tab? It closes, and the waiting work continues without it.')) return;
    try {
        const result = await api.tabAction({ root: selected, id: control.id, action, ...(action === 'offer' ? { offer: control.offer.id, answer } : {}) });
        const outcome = result?.outcome || result?.control?.outcome || result?.control?.problem;
        if (outcome) notice(outcome);
    } catch (error) { notice(error.message, true); }
    void refreshFeatures();
}

/** Voice call controls of this window's live call. */
async function voiceAction(item, action) {
    try { voiceCall = await api.voiceControl(item.root, item.chat, action); }
    catch (error) { notice(error.message, true); }
    renderFeatureBar(true);
}

/** The form choosing a tab to control (an existing tab of a browser, or a new tab at an address). */
function tabForm(context) {
    const browser = element('select', { 'aria-label': 'Browser' }, ...context.browsers.map((name) => element('option', { value: name }, name)));
    const tab = element('select', { 'aria-label': 'Tab' }, element('option', { value: '' }, 'New tab at the address'));
    const url = element('input', { type: 'url', placeholder: 'https://…', 'aria-label': 'Address of a new tab' });
    const load = async () => {
        tab.replaceChildren(element('option', { value: '' }, 'New tab at the address'));
        try {
            const tabs = await api.tabTabs(selected, browser.value);
            for (const item of tabs?.tabs || []) tab.append(element('option', { value: item.targetId, disabled: item.reserved ? true : undefined }, `${item.title || item.url || item.targetId}${item.task ? ` · used by ${item.task}` : ''}${item.reserved ? ' · already controlled' : ''}`));
        } catch (error) { notice(error.message, true); }
        url.hidden = !!tab.value;
    };
    browser.onchange = () => void load();
    tab.onchange = () => { url.hidden = !!tab.value; };
    void load();
    const form = element('form', { className: 'feature-form' }, element('span', {}, 'Take control of'), browser, tab, url,
        element('button', { type: 'submit', className: 'primary' }, 'Take control'), element('button', { type: 'button', onclick: () => { featureForm = undefined; renderFeatureBar(true); } }, 'Cancel'));
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        void openFeature({ kind: 'tab', browser: browser.value, ...(tab.value ? { target: tab.value } : url.value.trim() ? { url: url.value.trim() } : {}) });
    });
    return form;
}

/** The form starting voice in a chosen chat. */
function voiceForm(context) {
    const chat = element('select', { 'aria-label': 'Chat' }, ...context.chats.map((item) => element('option', { value: item.name }, `${item.name}${item.agent ? ` · ${item.agent}` : ''}`)));
    const form = element('form', { className: 'feature-form' }, element('span', {}, 'Talk in'), chat, element('button', { type: 'submit', className: 'primary' }, 'Start voice'), element('button', { type: 'button', onclick: () => { featureForm = undefined; renderFeatureBar(true); } }, 'Cancel'));
    form.addEventListener('submit', (event) => { event.preventDefault(); void openFeature({ kind: 'voice', chat: chat.value }); });
    return form;
}

/**
 * The trusted controls of live views, kept in the shell outside the embedded pages: switching views, returning a tab
 * to the agent, ending use, the Wallet's save offer, manual sign-in of pending Wallet requests, and voice controls.
 */
function renderFeatureBar(force = false) {
    const bar = $('feature-bar');
    const context = featureContext?.root === selected ? featureContext : undefined;
    const own = [...features].filter(([, item]) => item.root === selected);
    const visible = !!selected && (mode === 'dashboard' || mode === 'feature') && (!!context || own.length > 0);
    const signature = JSON.stringify({ visible, mode, activeFeature, context, own, featureForm, voiceCall });
    if (!force && signature === featureSignature) return;
    featureSignature = signature;
    // An open form keeps its selection while the context refreshes.
    if (!force && featureForm && bar.querySelector('.feature-form') && visible) return;
    bar.hidden = !visible;
    if (!visible) { bar.replaceChildren(); requestAnimationFrame(layout); return; }
    const controls = (context?.controls || []).filter((control) => !controlOver(control));
    const voice = own.find(([, item]) => item.kind === 'voice');
    const switcher = element('div', { className: 'feature-switch', role: 'tablist', 'aria-label': 'Views' },
        own.length ? element('button', { role: 'tab', 'aria-selected': String(mode === 'dashboard'), className: mode === 'dashboard' ? 'active' : '', onclick: () => void openProject(selected) }, 'Dashboard') : null,
        ...own.map(([id, item]) => element('button', { role: 'tab', 'aria-selected': String(mode === 'feature' && activeFeature === id), className: mode === 'feature' && activeFeature === id ? 'active' : '', title: item.view?.url || '', onclick: () => selectFeature(id) },
            featureLabel(item), element('span', { role: 'button', tabindex: '0', 'aria-label': `Close ${featureLabel(item)}`, onclick: (event) => { event.stopPropagation(); void closeFeature(id); } }, '  ×'))),
        element('span', { className: 'spacer' }),
        context?.browsers?.length ? element('button', { onclick: () => { featureForm = featureForm === 'tab' ? undefined : 'tab'; renderFeatureBar(true); } }, 'Take control of a tab…') : null,
        context?.chats?.length && !voice ? element('button', { onclick: () => { featureForm = featureForm === 'voice' ? undefined : 'voice'; renderFeatureBar(true); } }, 'Start voice…') : null,
    );
    const rows = [];
    for (const control of controls) {
        const shown = own.find(([, item]) => item.control === control.id);
        const viewer = shown ? 'open in this window' : control.viewer === 'connected' ? 'open in another window' : 'no viewer open';
        rows.push(element('div', { className: 'feature-row' },
            element('span', {}, element('strong', {}, 'You control this tab'), ` · ${control.browser} · ${control.mode} · viewer ${viewer} · awaiting your handoff`, control.url ? element('small', {}, control.url) : null),
            element('span', { className: 'feature-buttons' },
                shown ? (mode === 'feature' && activeFeature === shown[0] ? null : element('button', { onclick: () => selectFeature(shown[0]) }, 'Show')) : element('button', { onclick: () => void openFeature({ kind: 'tab', id: control.id }) }, 'Open viewer'),
                element('button', { className: 'primary', onclick: () => void tabAction(control, 'handback') }, 'Return control to agent'),
                element('button', { onclick: () => void tabAction(control, 'end') }, 'End use'))));
        for (const limitation of control.limitations || []) rows.push(element('div', { className: 'feature-row warning' }, limitation));
        if (control.signIn?.detected) rows.push(element('div', { className: 'feature-row success' }, `Sign-in to ${control.signIn.origin || 'the service'} detected. The tab stays with you until you return it.`));
        if (control.offer) rows.push(element('div', { className: 'feature-row offer' },
            element('span', {}, element('strong', {}, control.offer.kind === 'update' ? 'Update the password in Wallet?' : 'Save this login to Wallet?'), ` ${control.offer.account} for ${control.offer.origin}`),
            element('span', { className: 'feature-buttons' }, element('button', { className: 'primary', onclick: () => void tabAction(control, 'offer', 'yes') }, 'Yes'), element('button', { onclick: () => void tabAction(control, 'offer', 'no') }, 'No'))));
        if (control.problem) rows.push(element('div', { className: 'feature-row warning' }, control.problem));
    }
    for (const request of context?.pending || []) {
        if (controls.some((control) => control.request === request.id)) continue;
        rows.push(element('div', { className: 'feature-row' },
            element('span', {}, element('strong', {}, 'Sign-in needed'), ` · ${request.origin}${request.account ? ` · ${request.account}` : ''}`),
            element('span', { className: 'feature-buttons' }, element('button', { onclick: () => void openFeature({ kind: 'tab', request: request.id }) }, 'Sign in manually'))));
    }
    if (voice) {
        const [id, item] = voice;
        const call = voiceCall?.chat === item.chat ? voiceCall : undefined;
        rows.push(element('div', { className: 'feature-row' },
            element('span', {}, element('strong', {}, 'Voice is live'), ` · ${item.chat}`),
            element('span', { className: 'feature-buttons' },
                element('button', { onclick: () => void voiceAction(item, call?.micMuted ? 'unmute-mic' : 'mute-mic') }, call?.micMuted ? 'Unmute microphone' : 'Mute microphone'),
                element('button', { onclick: () => void voiceAction(item, call?.outputMuted ? 'unmute-output' : 'mute-output') }, call?.outputMuted ? 'Unmute output' : 'Mute output'),
                element('button', { onclick: () => void closeFeature(id) }, 'End voice'))));
    }
    if (featureForm === 'tab' && context?.browsers?.length) rows.push(tabForm(context));
    if (featureForm === 'voice' && context?.chats?.length) rows.push(voiceForm(context));
    bar.replaceChildren(switcher, ...rows);
    requestAnimationFrame(layout);
}

/** Feature state and views from the main process (only this window's own features). */
function featureEvent(event) {
    const item = features.get(event.feature);
    if (!item) { const queue = earlyFeatureEvents.get(event.feature) || []; if (queue.length < 100) queue.push(event); earlyFeatureEvents.set(event.feature, queue); return; }
    if (event.view) item.view = event.view;
    if (event.state) item.state = event.state;
    if (event.state === 'closed') {
        features.delete(event.feature);
        if (item.kind === 'voice') voiceCall = undefined;
        if (event.reason) notice(event.reason);
        if (activeFeature === event.feature) {
            activeFeature = undefined;
            if (mode === 'feature' && selected) void openProject(selected);
        }
        void refreshFeatures();
    }
    renderFeatureBar();
}

/** Lists the host's durable projects, including stopped ones. */
function renderProjects() {
    $('projects').replaceChildren(...host.rows.map((row) => {
        const { dot, label } = projectStatus(row);
        return element('button', { className: selected === row.projectRoot ? 'selected' : '', onclick: () => void openProject(row.projectRoot) },
            element('span', { className: 'project-name' }, dot, row.projectName), element('small', {}, label));
    }));
    $('version').textContent = `ptbk ${host.version || ''}`;
}

/** All overview actions call the same global controller as the CLI. */
async function applyAction(action, roots) {
    if (busy || !roots.length) return;
    busy = true;
    try {
        const results = await api.action(action, roots);
        if (results.length) notice(results.map((result) => `${result.projectName}: ${result.status} — ${result.message}`).join('\n'), results.some((result) => ['failed', 'unconfirmed', 'needs-confirmation'].includes(result.status)));
    } catch (error) { notice(error.message, true); }
    finally { busy = false; await refresh(); }
}

/** A host overview with per-project outcomes and explicit individual/bulk controls. */
function renderOverview() {
    const selectedRoots = () => [...document.querySelectorAll('[data-project]:checked')].map((input) => input.dataset.project);
    const actions = [['start', 'Start'], ['start-paused', 'Start paused'], ['pause', 'Pause'], ['resume', 'Resume'], ['stop', 'Stop'], ['force-stop', 'Force stop…'], ['remove', 'Forget…']];
    const toolbar = element('div', { className: 'toolbar' }, ...actions.map(([action, label]) => element('button', { onclick: () => {
        const roots = selectedRoots();
        if (!roots.length) notice('Select one or more project rows first.');
        else void applyAction(action, roots);
    } }, label)));
    const body = element('tbody', {}, ...host.rows.map((row) => {
        const { dot, label } = projectStatus(row);
        return element('tr', {},
            element('td', {}, element('input', { type: 'checkbox', 'data-project': row.projectRoot, 'aria-label': `Select ${row.projectName}` })),
            element('td', {}, element('strong', {}, row.projectName), element('small', {}, row.projectRoot), row.reason ? element('small', {}, row.reason) : ''),
            element('td', {}, element('span', { className: 'state' }, dot, label)),
            element('td', {}, row.work || '—'),
            element('td', {}, element('button', { onclick: () => void openProject(row.projectRoot) }, 'Open'), ' ', element('button', { onclick: () => void applyAction(row.status === 'live' ? 'stop' : 'start', [row.projectRoot]), disabled: row.status === 'unreachable' || row.status === 'missing' }, row.status === 'live' ? 'Stop' : 'Start')),
        );
    }));
    const table = element('table', {}, element('thead', {}, element('tr', {}, element('th', {}, element('input', { type: 'checkbox', 'aria-label': 'Select all projects', onchange: (event) => document.querySelectorAll('[data-project]').forEach((input) => { input.checked = event.target.checked; }) })), ...['Project', 'State', 'Current work', ''].map((label) => element('th', {}, label)))), body);
    const checked = selectedRoots();
    const empty = element('div', { className: 'empty' },
        element('img', { src: 'vendor/promptbook-robot.svg', alt: '', width: 72, height: 72 }),
        element('h2', {}, 'Start your first project'),
        element('p', {}, 'The setup assistant uses the same workflow as ptbk init.'),
        element('button', { className: 'primary', onclick: () => void newProject() }, 'Create a project'),
    );
    $('overview-pane').replaceChildren(element('h1', {}, 'Your projects'), element('p', {}, 'One engine per project. Any number of views.'), ...(host.problem ? [element('p', { className: 'error-text' }, host.problem)] : []), toolbar, host.rows.length ? table : empty);
    for (const input of document.querySelectorAll('[data-project]')) input.checked = checked.includes(input.dataset.project);
}

/** Refreshes observations only; project startup is always explicit. */
async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        host = await api.observe();
        renderProjects();
        if (mode === 'overview') renderOverview();
        void refreshFeatures();
        if (!observed) { observed = true; await applyLaunch(); }
    } catch (error) { notice(error.message, true); }
    finally { refreshing = false; }
}

/** Opens the shared graphical dashboard of a verified live engine. */
async function openProject(root) {
    selected = root;
    $('cli').disabled = true;
    notice('');
    if (featureContext?.root !== root) { featureContext = undefined; featureForm = undefined; }
    show('dashboard');
    renderProjects();
    void refreshFeatures();
    try {
        const rect = $('dashboard-pane').getBoundingClientRect();
        await api.dashboard(root, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    } catch (error) {
        show('overview');
        notice(`${error.message} Use Start in the overview, or open the CLI dashboard.`, true);
    } finally { $('cli').disabled = false; }
}

/** Each native terminal is a separate CLI client; xterm only presents its actual PTY. */
async function openTerminal(kind, root, page) {
    try {
        const result = await api.terminal(kind, root, page, { cols: 100, rows: 28 });
        const container = element('div', { className: 'terminal' });
        $('terminal-host').append(container);
        const term = new Terminal({ cursorBlink: true, fontSize: 14, fontFamily: 'Consolas, "Cascadia Mono", monospace', scrollback: 5000, theme: { background: '#0c1017', foreground: '#e7edf6', cursor: '#5bd0ef' }, allowProposedApi: false });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(container);
        term.onData((data) => api.input(result.id, data));
        terminals.set(result.id, { term, fit, container, kind, root, title: kind === 'init' ? 'Project setup' : kind === 'global' ? 'All projects · CLI' : `${page || 'Dashboard'} · CLI`, prompt: null });
        for (const event of earlyEvents.get(result.id) || []) terminalEvent(event);
        earlyEvents.delete(result.id);
        selectTerminal(result.id);
        return result.id;
    } catch (error) { notice(error.message, true); }
}

/** Selects a client view without restarting its process or initializer. */
function selectTerminal(id) {
    activeTerminal = id;
    show('terminal');
    for (const [key, item] of terminals) item.container.hidden = key !== id;
    renderTabs();
    renderPrompt();
    requestAnimationFrame(() => { layout(); terminals.get(id)?.term.focus(); });
}

/** Keeps existing terminal sessions discoverable until the user closes them. */
function renderTabs() {
    $('terminal-tabs').replaceChildren(...[...terminals].map(([id, item]) => element('button', { className: id === activeTerminal ? 'active' : '', onclick: () => selectTerminal(id) }, item.title, element('span', { role: 'button', tabindex: '0', 'aria-label': `Close ${item.title}`, onclick: (event) => { event.stopPropagation(); void removeTerminal(id); } }, '  ×'))));
    const active = terminals.get(activeTerminal);
    const retryRoot = active?.completion?.root || active?.root;
    if (active?.kind === 'init' && active.ended && retryRoot && (!active.completion?.ready || !active.completion?.running)) $('terminal-tabs').append(element('button', { onclick: () => void openTerminal('init', retryRoot) }, 'Resume setup'));
}

/** Closing an initializer requests its normal cancellation; closing a dashboard detaches only that client. */
async function removeTerminal(id) {
    const item = terminals.get(id);
    if (!item) return;
    if (item.kind === 'init' && !item.ended && !window.confirm('Close this setup assistant? Applied setup steps stay; no project engine is stopped.')) return;
    await api.closeTerminal(id);
    item.term.dispose(); item.container.remove(); terminals.delete(id);
    if (activeTerminal === id) {
        const next = [...terminals.keys()].pop();
        if (next) selectTerminal(next);
        else { $('prompt-pane').hidden = true; show('overview'); renderOverview(); }
    } else renderTabs();
}

/** A second presentation of the original CLI prompt, with no duplicated setup state machine. */
function renderPrompt() {
    const item = terminals.get(activeTerminal);
    const prompt = item?.prompt;
    const pane = $('prompt-pane');
    pane.hidden = !prompt;
    $('prompt-divider').hidden = !prompt;
    if (!prompt) { pane.replaceChildren(); requestAnimationFrame(() => { layout(); if (mode === 'terminal') item?.term.focus(); }); return; }
    const form = element('form');
    const controls = [];
    let rich;
    if (prompt.kind === 'text') {
        rich = createRichInput({ initial: Array.isArray(prompt.initial) ? prompt.initial : [], singleLine: prompt.singleLine, placeholder: prompt.placeholder || '', question: prompt.question, clipboardImage: () => api.clipboardImage().catch((error) => { notice(error.message, true); return []; }) });
        controls.push(rich.field);
        form.append(rich.field);
        if (prompt.attachments !== false && !prompt.singleLine) form.append(element('button', { type: 'button', onclick: async () => rich.attach(await api.chooseAttachments()) }, 'Attach files…'));
        if (prompt.singleLine && /folder|directory|path/i.test(prompt.question)) form.append(element('button', { type: 'button', onclick: async () => {
            const path = await api.chooseDirectory();
            if (path) { rich.field.replaceChildren(document.createTextNode(path)); }
        } }, 'Browse…'));
    } else {
        const initial = prompt.initial;
        form.append(element('div', { className: 'choices' }, ...(prompt.choices || []).map((choice) => {
            const checked = prompt.kind === 'one' ? initial === choice.value : prompt.kind === 'many' ? initial?.includes(choice.value) : initial?.[choice.value];
            const input = element('input', { type: prompt.kind === 'one' ? 'radio' : 'checkbox', name: 'answer', value: String(choice.value), checked: !!checked, disabled: choice.disabled });
            controls.push({ input, value: choice.value });
            return element('label', { className: 'choice' }, input, element('span', {}, choice.label, element('small', {}, choice.description || '')));
        })));
    }
    const send = async (answer) => {
        try {
            for (const button of form.querySelectorAll('button')) button.disabled = true;
            await api.answer(activeTerminal, prompt.id, answer);
            if (item.prompt?.id === prompt.id) { item.prompt = null; renderPrompt(); }
        } catch (error) { notice(error.message, true); for (const button of form.querySelectorAll('button')) button.disabled = false; }
    };
    const value = () => {
        if (prompt.kind === 'text') return rich.segments();
        if (prompt.kind === 'one') return controls.find((control) => control.input.checked)?.value;
        if (prompt.kind === 'many') return controls.filter((control) => control.input.checked).map((control) => control.value);
        return Object.fromEntries(controls.map((control) => [control.value, control.input.checked]));
    };
    form.append(element('div', { className: 'toolbar' }, element('button', { type: 'button', onclick: () => void send({ action: 'back' }) }, 'Back'), element('button', { type: 'submit', className: 'primary' }, 'Continue'), element('button', { type: 'button', onclick: () => void send({ action: 'terminal', value: value() }) }, 'Use terminal for this step'), element('button', { type: 'button', onclick: () => void send({ action: 'cancel' }) }, 'Cancel setup')));
    form.addEventListener('submit', (event) => { event.preventDefault(); void send({ action: 'answer', value: value() }); });
    pane.replaceChildren(element('div', { className: 'step' }, prompt.frame?.step || prompt.frame?.title || 'Project setup'), element('div', { className: 'summary' }, (prompt.frame?.summary || []).join('\n')), element('h2', {}, prompt.question), element('p', { className: 'hint' }, prompt.hint || ''), ...(prompt.error ? [element('p', { className: 'error-text' }, prompt.error)] : []), form, element('p', { className: 'terminal-caption' }, 'Native sign-in and setup diagnostics continue in the terminal below.'));
    controls[0]?.focus?.();
    requestAnimationFrame(layout);
}

/** Starts the ordinary initializer against a chosen location without pre-creating project files. */
async function newProject(root) {
    notice('');
    await openTerminal('init', root);
}

/** Launch arguments are applied once after host discovery. */
async function applyLaunch() {
    if (!launch || launch.applied) return;
    launch.applied = true;
    if (launch.init) await newProject(launch.root);
    else if (launch.root) await openProject(launch.root);
    else if (!host.rows.length && !launch.skipInit) await newProject();
}

/** Keeps terminal bytes, prompts and process outcomes associated with their actual client. */
function terminalEvent(event) {
    const item = terminals.get(event.terminal);
    if (!item) { const queue = earlyEvents.get(event.terminal) || []; if (queue.length < 100) queue.push(event); earlyEvents.set(event.terminal, queue); return; }
    if (event.type === 'data') item.term.write(event.data, () => api.acknowledge(event.terminal, event.data.length));
    else if (event.type === 'initialized') item.completion = event.completion;
    else if (event.type === 'prompt') { item.prompt = event.prompt; if (event.terminal === activeTerminal) renderPrompt(); }
    else if (event.type === 'prompt-closed') { if (item.prompt?.id === event.promptId) { item.prompt = null; if (event.terminal === activeTerminal) renderPrompt(); } }
    else if (event.type === 'exit') {
        item.ended = true; item.prompt = null;
        renderTabs();
        item.term.writeln(`\r\n[CLI exited with ${event.exitCode}. The terminal client is closed; engines have their own lifetime.]`);
        if (event.terminal === activeTerminal) renderPrompt();
        void refresh();
        if (event.exitCode === 0 && item.completion?.ready && item.completion?.running && item.completion.root) void openProject(item.completion.root);
    }
}

api.onEvent((event) => {
    if (event.type === 'launch') { launch = event; if (observed) void applyLaunch(); }
    else if (event.type === 'theme') showTheme(event.source);
    else if (event.type === 'error') { api.hideDashboard(); notice(event.message, true); }
    else if (event.type === 'feature') featureEvent(event);
    else if (event.terminal) terminalEvent(event);
});
for (const button of themeButtons) {
    button.onclick = () => {
        void api.theme(button.dataset.theme).catch((error) => {
            notice(`Could not save the appearance setting. ${error.message}`, true);
        });
    };
}
void api.theme().then(showTheme).catch((error) => notice(error.message, true));
$('overview').onclick = () => { show('overview'); renderOverview(); };
$('new-project').onclick = () => void newProject();
$('new-window').onclick = () => void api.newWindow(selected);
$('global-cli').onclick = () => void openTerminal('global');
$('cli').onclick = () => {
    // The main process retains the current graphical page and validates its corresponding CLI name.
    void openTerminal(mode === 'overview' || !selected ? 'global' : 'dashboard', selected);
};
resizePane($('sidebar-divider'), $('project-sidebar'), { axis: 'x', variable: '--sidebar-width', range: () => [160, Math.min(480, Math.floor(innerWidth * 0.45))] });
resizePane($('prompt-divider'), $('prompt-pane'), { axis: 'y', variable: '--prompt-height', range: () => [96, Math.floor($('terminal-pane').clientHeight * 0.72)] });
const paneObserver = new ResizeObserver(layout);
paneObserver.observe($('workspace'));
paneObserver.observe($('terminal-host'));
window.addEventListener('resize', layout);
void refresh();
setInterval(() => void refresh(), 2500);
