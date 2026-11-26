import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { createRichInput } from './rich-input.js';

/** Local view state contains no credentials, project business rules or engine ownership. */
const api = window.desktop;
const $ = (id) => document.getElementById(id);
const terminals = new Map();
const earlyEvents = new Map();
let activeTerminal;
let mode = 'overview';
let selected;
let rows = [];
let receivedLaunch;
let opening = false;
let followFirst = false;
let refreshing = false;

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

/** Show the download action only while a matching installer is known. */
function showUpdate(update) {
    $('update-detail').textContent = update.available?.unsigned ? 'Unsigned experimental macOS build' : '';
    $('desktop-update').hidden = !update.available;
}

/** The project is a native child view. Leave exactly the visible footer height available for its button. */
function reportUpdateHeight() {
    api.updateBarHeight($('desktop-update').getBoundingClientRect().height);
}

/** Fit only the native console; its size has no bearing on the full-window App UI. */
function layout() {
    const item = terminals.get(activeTerminal);
    if (mode === 'terminal' && item && item.container.clientWidth > 0) {
        item.fit.fit();
        api.resize(activeTerminal, { cols: item.term.cols, rows: item.term.rows });
    }
}

/** The shell owns only discovery and local CLI prompts. */
function show(next) {
    mode = next;
    $('overview-pane').hidden = next !== 'overview';
    $('terminal-pane').hidden = next !== 'terminal';
    $('back').hidden = next !== 'terminal';
    requestAnimationFrame(layout);
}

/** Display only verified running projects as openable. Other registered paths require an explicit start. */
function renderOverview() {
    const list = $('projects');
    const active = document.activeElement?.dataset.project;
    const cards = rows.map((row) => {
        const run = row.status === 'live';
        const button = element('button', { type: 'button', className: 'project', 'data-project': row.projectRoot,
            disabled: !run && row.status !== 'stopped', onclick: async () => {
                if (run) return openProject(row.projectRoot);
                button.disabled = true;
                try {
                    const result = await api.start(row.projectRoot);
                    if (!['completed', 'accepted', 'unchanged'].includes(result.status)) throw new Error(result.message);
                    await refresh();
                    await openProject(row.projectRoot);
                } catch (error) { notice(error.message, true); }
            } }, element('span', {}, element('strong', {}, row.projectName), element('small', {}, row.projectRoot)),
            element('span', { className: 'state' }, run ? 'Open' : row.status === 'stopped' ? 'Start project' : row.status));
        return button;
    });
    list.replaceChildren(...(cards.length ? cards : [element('p', {}, 'No local projects yet. Start an existing project with ptbk start or create one here.')]));
    if (active) [...list.children].find((button) => button.dataset.project === active)?.focus();
}

/** Attach through the main process. A stopped or old engine stays running on its own version until explicitly restarted. */
async function openProject(root) {
    if (opening) return;
    opening = true;
    followFirst = false;
    selected = root;
    notice('');
    try { await api.dashboard(root); }
    catch (error) { show('overview'); notice(error.message, true); }
    finally { opening = false; }
}

/** Handle a native menu, installer handoff or project-switcher link. */
async function launch(action, root) {
    followFirst = false;
    notice('');
    if (action === 'init') await openTerminal('init', root);
    else if (action === 'setup') await openTerminal('setup');
    else if (action === 'console') await openTerminal(root ? 'dashboard' : 'global', root);
    else if (action === 'keep-awake-helper' && root) await openTerminal(action, root);
    else { show('overview'); renderOverview(); }
}

/** Observe new engines, including ones started from another terminal while the empty state is open. */
async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        const host = await api.observe();
        rows = host.rows;
        renderOverview();
        if (host.problem) notice(host.problem, true);
        if (receivedLaunch) {
            const options = receivedLaunch;
            receivedLaunch = undefined;
            if (options.init || options.action) await launch(options.init ? 'init' : options.action, options.root);
            else if (options.root) await openProject(options.root);
            else followFirst = true;
        }
        if (followFirst && mode === 'overview') {
            const first = rows.find((row) => row.status === 'live');
            if (first) await openProject(first.projectRoot);
        }
    } catch (error) { notice(error.message, true); }
    finally { refreshing = false; }
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
        const titles = { init: 'Project setup', setup: 'Set up with App', global: 'All projects · CLI', 'keep-awake-helper': 'Keep awake · closed lid' };
        terminals.set(result.id, { term, fit, container, kind, root, page, title: titles[kind] ?? `${page || 'Dashboard'} · CLI`, prompt: null });
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
    if (prompt.kind === 'harness-login') {
        const cancel = async (action) => {
            try { await api.answer(activeTerminal, prompt.id, { action }); }
            catch (error) { notice(error.message, true); }
        };
        const login = prompt.login;
        pane.replaceChildren(
            element('div', { className: 'step' }, prompt.frame?.step || 'Harness sign-in'),
            element('h2', {}, prompt.question),
            ...(['https://auth.openai.com/codex/device', 'https://github.com/login/device'].includes(login?.url) ? [
                element('p', {}, element('a', { href: login.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open provider sign-in')),
                element('p', {}, 'One-time code ', element('code', {}, login.userCode)),
            ] : []),
            element('p', { className: 'hint' }, 'Waiting for the provider to confirm sign-in.'),
            element('div', { className: 'toolbar' },
                ...(login?.terminalFallback ? [element('button', { onclick: () => void cancel('terminal') }, 'Use native terminal')] : []),
                element('button', { onclick: () => void cancel('back') }, 'Back')),
        );
        requestAnimationFrame(layout);
        return;
    }
    const form = element('form');
    const controls = [];
    let rich;
    let secret;
    if (prompt.kind === 'secret') {
        secret = element('input', { type: 'password', autocomplete: 'off', maxlength: '512', 'aria-label': prompt.question });
        controls.push(secret);
        form.append(secret);
    } else if (prompt.kind === 'text') {
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
        const list = element('div', { className: 'choices' });
        const optional = [];
        for (const choice of prompt.choices || []) {
            const checked = prompt.kind === 'one' ? initial === choice.value : prompt.kind === 'many' ? initial?.includes(choice.value) : initial?.[choice.value];
            const input = element('input', { type: prompt.kind === 'one' ? 'radio' : 'checkbox', name: 'answer', value: String(choice.value), checked: !!checked, disabled: choice.disabled });
            controls.push({ input, value: choice.value });
            const row = element('label', { className: 'choice' }, input, element('span', {}, choice.label, element('small', {}, choice.description || '')));
            list.append(row);
            if (prompt.kind === 'many' && choice.featured === false) optional.push({ row, input });
        }
        form.append(list);
        if (optional.length) {
            let expanded = false;
            const more = element('button', { type: 'button', onclick: () => { expanded = !expanded; update(); } });
            const update = () => {
                for (const { row, input } of optional) row.hidden = !expanded && !input.checked;
                more.hidden = !expanded && optional.every(({ input }) => input.checked);
                more.textContent = expanded ? 'Show less' : 'Show more';
                more.setAttribute('aria-expanded', String(expanded));
            };
            list.addEventListener('change', update);
            update();
            form.append(more);
        }
    }
    const send = async (answer) => {
        try {
            for (const button of form.querySelectorAll('button')) button.disabled = true;
            await api.answer(activeTerminal, prompt.id, answer);
            if (item.prompt?.id === prompt.id) { item.prompt = null; renderPrompt(); }
        } catch (error) { notice(error.message, true); for (const button of form.querySelectorAll('button')) button.disabled = false; }
    };
    const value = () => {
        if (secret) return secret.value;
        if (prompt.kind === 'text') return rich.segments();
        if (prompt.kind === 'one') return controls.find((control) => control.input.checked)?.value;
        if (prompt.kind === 'many') return controls.filter((control) => control.input.checked).map((control) => control.value);
        return Object.fromEntries(controls.map((control) => [control.value, control.input.checked]));
    };
    form.append(element('div', { className: 'toolbar' }, element('button', { type: 'button', onclick: () => void send({ action: 'back' }) }, 'Back'), element('button', { type: 'submit', className: 'primary' }, 'Continue'), secret ? null : element('button', { type: 'button', onclick: () => void send({ action: 'terminal', value: value() }) }, 'Use terminal for this step'), element('button', { type: 'button', onclick: () => void send({ action: 'cancel' }) }, 'Cancel setup')));
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const answer = value();
        if (secret) secret.value = '';
        void send({ action: 'answer', value: answer });
    });
    pane.replaceChildren(element('div', { className: 'step' }, prompt.frame?.step || prompt.frame?.title || 'Project setup'), element('div', { className: 'summary' }, (prompt.frame?.summary || []).join('\n')), element('h2', {}, prompt.question), element('p', { className: 'hint' }, prompt.hint || ''), ...(prompt.error ? [element('p', { className: 'error-text' }, prompt.error)] : []), form, element('p', { className: 'terminal-caption' }, 'Native sign-in and setup diagnostics continue in the terminal below.'));
    controls[0]?.focus?.();
    requestAnimationFrame(layout);
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
    if (event.type === 'launch') { receivedLaunch = event; void refresh(); }
    else if (event.type === 'launcher') { selected = event.root; void launch(event.action, event.action === 'init' ? undefined : selected); }
    else if (event.type === 'update') showUpdate(event.update);
    else if (event.type === 'focus-update') $('download-update').focus();
    else if (event.type === 'error') notice(event.message, true);
    else if (event.terminal) terminalEvent(event);
});
$('new-project').onclick = () => void launch('init');
$('console').onclick = () => void launch('console');
$('back').onclick = () => void launch('projects');
$('download-update').onclick = () => void api.update('download').catch((error) => notice(error.message, true));
void api.update().then(showUpdate).catch((error) => console.warn('Could not read the desktop update offer.', error));
new ResizeObserver(reportUpdateHeight).observe($('desktop-update'));
window.addEventListener('resize', reportUpdateHeight);
new ResizeObserver(layout).observe($('terminal-host'));
setInterval(() => void refresh(), 3000);
