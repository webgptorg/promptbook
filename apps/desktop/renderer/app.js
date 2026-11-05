import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { createRichInput } from './rich-input.js';

/** Local view state contains no credentials, project business rules or engine ownership. */
const api = window.desktop;
const $ = (id) => document.getElementById(id);
const appearance = $('appearance');
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
let themeSource = 'system';

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
    themeSource = source;
    appearance.value = source;
    appearance.disabled = false;
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
}

/** Changing views never invokes a lifecycle operation or closes another terminal. */
function show(next) {
    if (next !== 'dashboard') api.hideDashboard();
    mode = next;
    for (const pane of ['overview', 'dashboard', 'terminal']) $(`${pane}-pane`).hidden = pane !== mode;
    const heading = $('heading');
    heading.textContent = next === 'overview' ? 'Your projects' : host.rows.find((row) => row.projectRoot === selected)?.projectName || 'Promptbook';
    heading.title = heading.textContent;
    requestAnimationFrame(layout);
}

/** Lists the host's durable projects, including stopped ones. */
function renderProjects() {
    $('projects').replaceChildren(...host.rows.map((row) => element('button', { className: selected === row.projectRoot ? 'selected' : '', onclick: () => void openProject(row.projectRoot) }, row.projectName, element('small', {}, row.state || row.status))));
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
    const body = element('tbody', {}, ...host.rows.map((row) => element('tr', {},
        element('td', {}, element('input', { type: 'checkbox', 'data-project': row.projectRoot, 'aria-label': `Select ${row.projectName}` })),
        element('td', {}, element('strong', {}, row.projectName), element('small', {}, row.projectRoot), row.reason ? element('small', {}, row.reason) : ''),
        element('td', {}, element('span', { className: `state ${row.state || ''}` }, row.state || row.status)),
        element('td', {}, row.work || '—'),
        element('td', {}, element('button', { onclick: () => void openProject(row.projectRoot) }, 'Open'), ' ', element('button', { onclick: () => void applyAction(row.status === 'live' ? 'stop' : 'start', [row.projectRoot]), disabled: row.status === 'unreachable' || row.status === 'missing' }, row.status === 'live' ? 'Stop' : 'Start')),
    )));
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
        if (!observed) { observed = true; await applyLaunch(); }
    } catch (error) { notice(error.message, true); }
    finally { refreshing = false; }
}

/** Opens the shared graphical dashboard of a verified live engine. */
async function openProject(root) {
    selected = root;
    $('cli').disabled = true;
    notice('');
    show('dashboard');
    renderProjects();
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
    else if (event.terminal) terminalEvent(event);
});
appearance.onchange = () => {
    void api.theme(appearance.value).catch((error) => {
        appearance.value = themeSource;
        notice(`Could not save the appearance setting. ${error.message}`, true);
    });
};
void api.theme().then(showTheme).catch((error) => notice(error.message, true));
$('overview').onclick = () => { show('overview'); renderOverview(); };
$('new-project').onclick = () => void newProject();
$('new-window').onclick = () => void api.newWindow(selected);
$('global-cli').onclick = () => void openTerminal('global');
$('cli').onclick = () => {
    // The main process retains the current graphical page and validates its corresponding CLI name.
    void openTerminal(mode === 'overview' || !selected ? 'global' : 'dashboard', selected);
};
new ResizeObserver(layout).observe($('workspace'));
window.addEventListener('resize', layout);
void refresh();
setInterval(() => void refresh(), 2500);
