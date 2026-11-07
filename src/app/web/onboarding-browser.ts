import type { OnboardingPrompt, OnboardingReply, OnboardingState } from '../../onboarding/contract.js';

/** Builds the fallback page from inert text and same-origin controls. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Calls the authenticated engine origin through the existing App API. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch('/api/v1' + path, init);
    if (!response.ok) {
        const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string };
        throw new Error(problem.detail ?? problem.title ?? 'The engine is unavailable.');
    }
    return await response.json() as T;
}

/** Saves temporary uploads through the same files@1 endpoint as App. */
async function upload(files: FileList | null): Promise<string[]> {
    const ids: string[] = [];
    for (const file of Array.from(files ?? [])) {
        const data = new FormData();
        data.append('name', file.name);
        data.append('purpose', 'upload');
        data.append('file', file);
        ids.push((await call<{ id: string }>('/files', { method: 'POST', body: data })).id);
    }
    return ids;
}

/** Onboarding remains usable through a service restart or the transition to the real project. */
const main = document.querySelector('main')!;
const error = element('p');
error.setAttribute('role', 'alert');
let resumeDeferred = false;
let poll: number | undefined;

/** Loads the latest state, retrying a dropped connection at the handoff. */
async function refresh(): Promise<void> {
    try {
        render(await call<OnboardingState>('/onboarding'));
    } catch (failure) {
        error.textContent = (failure as Error).message;
        main.replaceChildren(element('h1', 'Project initialization'), error, button('Retry', () => refresh()));
    }
}

/** Submits an action with the current prompt's revision. */
async function submit(reply: OnboardingReply): Promise<void> {
    const state = await call<OnboardingState>('/onboarding/answer', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reply),
    }).catch(async (failure: unknown) => {
        // Another connected client may have moved the wizard on.
        await refresh();
        throw failure;
    });
    render(state);
}

/** Handles a button once and exposes failures without discarding its inputs. */
function button(label: string, action: () => Promise<void>): HTMLButtonElement {
    const control = element('button', label);
    control.type = 'button';
    control.onclick = () => {
        control.disabled = true;
        error.textContent = '';
        void action().catch((failure: unknown) => { error.textContent = (failure as Error).message; }).finally(() => { control.disabled = false; });
    };
    return control;
}

/** Renders the contract's current prompt and its local HTML form controls. */
function controls(prompt: OnboardingPrompt): HTMLElement[] {
    const answer = async (value: Extract<OnboardingReply, { action: 'answer' }>['answer']): Promise<void> =>
        await submit({ promptId: prompt.id, action: 'answer', answer: value });
    switch (prompt.kind) {
        case 'text': {
            const input = element(prompt.multiline ? 'textarea' : 'input');
            input.setAttribute('aria-label', prompt.question);
            input.value = prompt.initial;
            if (input instanceof HTMLTextAreaElement) { input.rows = 8; input.cols = 60; }
            const files = element('input');
            files.type = 'file';
            files.multiple = true;
            files.setAttribute('aria-label', 'Attach files');
            return [input, ...(prompt.attachments ? [files] : []), button('Continue', async () => answer({ kind: 'text', text: input.value, fileIds: await upload(files.files) }))];
        }
        case 'choice': {
            const choices = prompt.choices.map((choice) => {
                const option = element('input');
                option.type = prompt.multiple ? 'checkbox' : 'radio';
                option.name = 'choice';
                option.value = choice.id;
                option.disabled = choice.disabled;
                option.checked = prompt.initial.includes(choice.id);
                const label = element('label');
                label.append(option, document.createTextNode(' ' + choice.label));
                const row = element('p');
                row.append(label);
                return { option, row };
            });
            return [...choices.map(({ row }) => row), button('Continue', async () => answer({ kind: 'choice', choiceIds: choices.filter(({ option }) => option.checked).map(({ option }) => option.value) }))];
        }
        case 'confirm':
            return [button(prompt.confirmLabel, async () => answer({ kind: 'confirm', confirmed: true })), button(prompt.declineLabel, async () => answer({ kind: 'confirm', confirmed: false }))];
        case 'harness-login': {
            const link = element('a', 'Open provider sign-in');
            link.href = prompt.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            return [link, element('p', prompt.userCode ? 'One-time code ' + prompt.userCode : ''), element('p', 'Waiting for sign-in…')];
        }
    }
}

/** Displays the shared state. A deferred draft is still available for later continuation. */
function render(state: OnboardingState): void {
    window.clearTimeout(poll);
    error.textContent = '';
    const title = element('h1', 'Project initialization');
    if (state.status === 'completed') {
        const home = element('a', 'Open project');
        home.href = '/';
        main.replaceChildren(title, element('p', 'The project is ready.'), home);
    } else if (state.deferred && !resumeDeferred) {
        main.replaceChildren(title, element('p', 'Initialization saved.'), error, button('Resume setup', async () => {
            resumeDeferred = true;
            await refresh();
        }));
    } else if (!state.prompt) {
        main.replaceChildren(title, element('p', 'The engine is working…'), error);
        poll = window.setTimeout(() => { void refresh(); }, 1000);
    } else {
        const prompt = state.prompt;
        title.textContent = prompt.title;
        main.replaceChildren(title, element('p', prompt.question), ...(prompt.hint ? [element('p', prompt.hint)] : []),
            ...(prompt.error ? [element('p', prompt.error)] : []), error, ...controls(prompt),
            ...(prompt.canGoBack ? [button('Back', async () => submit({ promptId: prompt.id, action: 'back' }))] : []),
            button('Continue later', async () => {
                resumeDeferred = false;
                render(await call<OnboardingState>('/onboarding/defer', { method: 'POST' }));
            }));
        if (prompt.kind === 'harness-login') poll = window.setTimeout(() => { void refresh(); }, 1000);
    }
}

void refresh();
