import { randomUUID } from 'node:crypto';
import { errorMessage, PtbkError } from '../common/errors.js';
import { kebabIdentifier } from '../common/naming.js';
import { instanceEnvironment } from '../engine/harnesses.js';
import { pluginDefaultRow } from '../engine/routing.js';
import { harnessLoginMethods, installHarness } from '../harness/maintenance.js';
import { functionalCheck, proposeProjectName, type PreparatoryCall } from '../harness/preparation.js';
import { presentNativeLogin } from '../harness/presented-login.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../harness/registry.js';
import type { HarnessContext, HarnessInspection, HarnessLoginMethod, HarnessPlugin } from '../harness/types.js';
import type { Project } from '../project/workspace.js';
import type { HarnessToolRecord } from '../tools/model.js';
import { completedOnboarding, onboardingReply, type OnboardingPrompt, type OnboardingState } from './contract.js';
import { discardPreparedApiKey, prepareApiHarness, readPreparedApiHarness, savePreparedApiKey, type PreparedApiHarness } from './credentials.js';
import { onboardingTarget, onboardingTargetExists, saveOnboarding, validOnboardingFolder, type OnboardingDraft } from './draft.js';
import { HARNESS_TERMINAL_PATH, HarnessLoginTerminal, type TerminalFrame } from './terminal.js';
import { MAX_ONBOARDING_FILES, type OnboardingFile, type OnboardingUploads } from './uploads.js';

/** The lifetime of one preparation or publication job. */
type Job = { readonly abort: AbortController; readonly done: Promise<void> };

/** What the operator sees over the local control socket, including a completed project's location. @private onboarding */
export type OnboardingView = {
    readonly engineId: string;
    readonly step: OnboardingDraft['step'];
    readonly onboarding: OnboardingState;
    readonly folder?: string;
    readonly error?: string;
    readonly nativeLogin?: HarnessSignInOptions;
};

/** Public presentation of a sign-in step, without any input or terminal transcript. @private onboarding */
export type HarnessSignInOptions = {
    readonly promptId: string;
    readonly harness: string;
    readonly instructions: string;
    readonly apiKey?: { readonly label: string; readonly url: string };
};

/** Live sign-in state. The draft holds only the surrounding setup step. */
type NativeLogin = {
    readonly options: HarnessSignInOptions;
    readonly plugin: HarnessPlugin;
    readonly context: HarnessContext;
    readonly terminal: HarnessLoginTerminal;
    readonly finish: (call?: PreparatoryCall) => void;
    checking: boolean;
};

/** Plain text safe to offer to any of the wizard clients. */
function label(text: string): string {
    return text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 2000);
}

/** The selected account running with the same user and environment as the service. */
function harnessContext(plugin: HarnessPlugin, root: string, env: NodeJS.ProcessEnv, signal: AbortSignal, api?: PreparedApiHarness): HarnessContext {
    const tool: HarnessToolRecord = api?.tool ?? { type: 'HARNESS', variant: plugin.variant, name: plugin.id, isEnabled: true, authentication: 'NATIVE' };
    return { projectRoot: root, env: instanceEnvironment(plugin, tool, api?.credential, env), tool, signal };
}

/** Tests the selected provider through the real CLI without retaining its output or credentials. */
async function verifyHarness(plugin: HarnessPlugin, context: HarnessContext, inspection: HarnessInspection, timeoutMs?: number): Promise<PreparatoryCall | undefined> {
    if (!inspection.usable) return undefined;
    const api = context.tool?.authentication === 'API_KEY' ? plugin.setupApiKey : undefined;
    const catalog = !api?.model && plugin.modelCatalog === 'complete' && plugin.listModels ? await plugin.listModels(context).catch(() => []) : [];
    const row = pluginDefaultRow(plugin, catalog);
    const call = { plugin, inspection, env: context.env, signal: context.signal, baseUrl: context.tool?.baseUrl, model: api?.model ?? row.model, thinkingLevel: api?.thinkingLevel ?? row.thinking };
    return (await functionalCheck({ ...call, timeoutMs })).ok ? call : undefined;
}

/**
 * Engine-owned onboarding. Accepted answers and the phase are durable; the browser and local clients
 * only display prompts and submit replies. A transient login can restart without replaying accepted answers.
 *
 * @private onboarding
 */
export class OnboardingSession {
    private draft: OnboardingDraft;
    private tail: Promise<unknown> = Promise.resolve();
    private job?: Job;
    private login?: OnboardingPrompt;
    private nativeLogin?: NativeLogin;
    private deviceLogin?: AbortController;
    private stopped = false;
    private defaults: readonly string[] = ['openai-codex'];

    public constructor(
        private readonly staging: Project,
        draft: OnboardingDraft,
        public readonly uploads: OnboardingUploads,
        private readonly env: NodeJS.ProcessEnv,
        private readonly finish: (draft: OnboardingDraft, save: (patch: Partial<OnboardingDraft>) => Promise<void>) => Promise<void>,
    ) {
        this.draft = draft;
    }

    /** Reads an authenticated client's current prompt without changing the draft. */
    public state(): OnboardingState {
        if (this.draft.step === 'done') return completedOnboarding;
        const prompt = this.login ?? this.prompt();
        return { status: prompt ? 'pending' : 'working', deferred: this.draft.deferred, progress: null, prompt: prompt ?? null };
    }

    /** The non-secret local summary of this service. */
    public view(): OnboardingView {
        const { engineId, step, folder, error } = this.draft;
        return { engineId, step, folder, error, onboarding: this.state(), nativeLogin: this.signInOptions() };
    }

    /** Reads only the current presentation, so an old terminal tab cannot act on a different harness. */
    public signInOptions(): HarnessSignInOptions | undefined {
        return this.nativeLogin?.options;
    }

    /** Switches a running device-code sign-in to the same adapter's native terminal. */
    public useTerminal(promptId: unknown): void {
        if (!this.deviceLogin || this.login?.id !== promptId) throw new PtbkError('The sign-in step has changed.', { kind: 'conflict' });
        this.deviceLogin.abort();
    }

    /** Forwards only the current wizard's native login terminal. */
    public async terminal(owner: string, command: Readonly<Record<string, unknown>>): Promise<TerminalFrame | null> {
        const login = this.nativeLogin;
        if (!login || login.options.promptId !== command.promptId || login.context.signal?.aborted) throw new PtbkError('The sign-in step has changed.', { kind: 'conflict' });
        if (command.action === 'start' && login.checking) throw new PtbkError('A sign-in check is already running.', { kind: 'conflict' });
        return await login.terminal.command(owner, command);
    }

    /** Validates and retains an explicitly entered provider key only after it answers a real request. */
    public async useApiKey(promptId: unknown, value: unknown): Promise<void> {
        const login = this.nativeLogin;
        if (!login || login.options.promptId !== promptId || login.context.signal?.aborted || login.checking) {
            throw new PtbkError('The sign-in step has changed or is being checked.', { kind: 'conflict' });
        }
        if (!login.options.apiKey || typeof value !== 'string' || !/^[!-~]{1,512}$/.test(value)) {
            throw new PtbkError('Enter a valid provider API key.', { kind: 'usage' });
        }
        login.checking = true;
        login.terminal.close();
        try {
            const { plugin } = login;
            const context = harnessContext(plugin, this.staging.root, this.env, login.context.signal!, prepareApiHarness(plugin, value));
            const call = await verifyHarness(plugin, context, await plugin.inspect(context), 30_000);
            await this.exclusive(async () => {
                if (this.nativeLogin !== login || login.context.signal?.aborted) throw new PtbkError('The sign-in step has changed.', { kind: 'conflict' });
                if (!call) throw new PtbkError('The provider did not accept the key or could not answer the setup check.', { kind: 'setup' });
                await savePreparedApiKey(this.staging.root, plugin, value);
                login.finish(call);
            });
        } finally {
            login.checking = false;
        }
    }

    /** IDs attached by an accepted answer. */
    public attachedIds(): readonly string[] {
        return this.draft.fileIds ?? [];
    }

    /** Whether the store accepts additional uploads. */
    public mayUpload(): boolean {
        return ['intent', 'harnesses', 'prepare', 'title', 'folder', 'review'].includes(this.draft.step);
    }

    /** Files and answer mutations share a queue so an accepted attachment cannot be deleted concurrently. */
    public async upload(blob: Blob, name: string, member: string): Promise<OnboardingFile | undefined> {
        return await this.exclusive(() => this.mayUpload() ? this.uploads.put(blob, name, member) : Promise.resolve(undefined));
    }

    /** The local operator selects files on the engine host. */
    public async uploadLocal(path: string): Promise<OnboardingFile | undefined> {
        return await this.exclusive(() => this.mayUpload() ? this.uploads.putLocal(path) : Promise.resolve(undefined));
    }

    /** Removes a temporary file if it is still independent of any accepted answer. */
    public async deleteUpload(id: string): Promise<'deleted' | 'missing' | 'in-use'> {
        return await this.exclusive(() => this.uploads.delete(id, () => this.attachedIds()));
    }

    /** Inspects the installed native tools for the same initial selection as local init. */
    public async discoverDefaults(): Promise<void> {
        const signal = AbortSignal.timeout(15_000);
        const ready = await Promise.all(HARNESS_PLUGINS.map(async (plugin) => {
            const result = await plugin.inspect(harnessContext(plugin, this.staging.root, this.env, signal)).catch(() => undefined);
            return result?.installed && result.usable && result.authenticated === true ? [plugin.id] : [];
        }));
        if (ready.flat().length) this.defaults = ready.flat();
    }

    /** Recovers a persisted preparation or publication operation. */
    public resume(): void {
        this.drive();
    }

    /** Records a retry receipt after the registry has accepted a pairing URL. */
    public async notePairing(linkDigest: string): Promise<void> {
        await this.exclusive(() => this.save({ linkDigest }));
    }

    /** Defers presentation without discarding the draft or starting an agenda. */
    public async defer(): Promise<OnboardingState> {
        return await this.exclusive(async () => {
            this.nativeLogin?.terminal.close();
            if (this.draft.step !== 'done' && !this.draft.deferred) await this.save({ deferred: true });
            return this.state();
        });
    }

    /** Validates, serializes and durably accepts one reply. */
    public async answer(body: unknown): Promise<OnboardingState> {
        const parsed = onboardingReply.safeParse(body);
        if (!parsed.success) throw new PtbkError('The onboarding reply is invalid.', { kind: 'usage' });
        const reply = parsed.data;
        return await this.exclusive(async () => {
            const prompt = this.state().prompt;
            if (!prompt || reply.promptId !== prompt.id) throw new PtbkError('The onboarding prompt has changed.', { kind: 'conflict' });
            if (reply.action === 'back') {
                if (!prompt.canGoBack) throw new PtbkError('There is no earlier prompt.', { kind: 'usage' });
                const back = { harnesses: 'intent', prepare: 'harnesses', title: 'harnesses', folder: 'title', review: 'folder' } as const;
                const previous = back[this.draft.step as keyof typeof back];
                if (!previous) throw new PtbkError('There is no earlier prompt.', { kind: 'usage' });
                this.job?.abort.abort();
                this.login = undefined;
                await this.next(previous);
                return this.state();
            }
            if (reply.answer.kind !== prompt.kind) throw new PtbkError('The reply is for a different kind of prompt.', { kind: 'usage' });
            switch (reply.answer.kind) {
                case 'text': {
                    if (this.draft.step === 'intent') {
                        const ids = [...new Set([...this.attachedIds(), ...reply.answer.fileIds])];
                        if (ids.length > MAX_ONBOARDING_FILES || (await Promise.all(ids.map((id) => this.uploads.get(id)))).some((file) => !file)) {
                            await this.next('intent', { error: 'Use up to 20 uploaded files from this initialization.' });
                        } else {
                            await this.next('harnesses', { intent: reply.answer.text, fileIds: ids, title: undefined, folder: undefined });
                        }
                    } else if (this.draft.step === 'title') {
                        const title = label(reply.answer.text).slice(0, 80);
                        const suggested = kebabIdentifier(title)?.slice(0, 40).replace(/-+$/, '') ?? '';
                        if (!title) await this.next('title', { error: 'Enter a project title.' });
                        else await this.next('folder', { title, folder: title === this.draft.title ? this.draft.folder : validOnboardingFolder(suggested) ? suggested : 'my-project' });
                    } else {
                        const folder = reply.answer.text.trim();
                        if (!validOnboardingFolder(folder)) await this.next('folder', { error: 'Use a folder name with lowercase letters, digits and dashes.' });
                        else if (await onboardingTargetExists(onboardingTarget(this.staging, folder).root)) await this.next('folder', { error: 'That folder already exists. Choose a new name.' });
                        else await this.next('review', { folder });
                    }
                    break;
                }
                case 'choice': {
                    const ids = [...new Set(reply.answer.choiceIds)];
                    if (!ids.length || ids.some((id) => !HARNESS_PLUGINS.some((plugin) => plugin.id === id))) {
                        await this.next('harnesses', { error: 'Choose at least one available harness.' });
                    } else {
                        await this.next('prepare', { harnesses: ids });
                    }
                    break;
                }
                case 'confirm':
                    if (this.nativeLogin) {
                        const login = this.nativeLogin;
                        if (!reply.answer.confirmed) {
                            login.terminal.close();
                            await this.save({ deferred: true });
                        } else if (!login.checking) {
                            login.checking = true;
                            try {
                                const call = await verifyHarness(login.plugin, login.context, await login.plugin.inspect(login.context), 30_000);
                                if (call) {
                                    await discardPreparedApiKey(this.staging.root, login.plugin);
                                    login.finish(call);
                                } else this.login = { ...prompt, error: 'The engine could not verify ' + login.plugin.displayName + ' sign-in.' };
                            } finally {
                                login.checking = false;
                            }
                        }
                    } else if (this.draft.step === 'publish' || this.draft.step === 'published') {
                        if (reply.answer.confirmed) await this.next(this.draft.step);
                        else await this.save({ deferred: true, promptId: randomUUID() });
                    } else {
                        await this.next(reply.answer.confirmed ? 'create' : 'folder');
                    }
                    break;
                case 'harness-login':
                    if (reply.answer.returnCode !== null) throw new PtbkError('Enter the device code on the provider’s page.', { kind: 'usage' });
                    this.job?.abort.abort();
                    this.login = undefined;
                    await this.next('prepare');
                    break;
                default:
                    throw new PtbkError('This prompt cannot accept an upload by itself.', { kind: 'usage' });
            }
            this.drive();
            return this.state();
        });
    }

    /** Prevents new preparation work and terminates a native login when the service stops. */
    public async stop(): Promise<void> {
        this.stopped = true;
        if (this.draft.step === 'prepare') this.job?.abort.abort();
        await this.job?.done;
        await this.tail;
    }

    /** Gives the owner the native terminal and any supported explicit key, then checks the chosen account. */
    private async waitForNativeLogin(plugin: HarnessPlugin, context: HarnessContext, method: HarnessLoginMethod, signal: AbortSignal, diagnostic?: string): Promise<PreparatoryCall | undefined> {
        signal.throwIfAborted();
        const promptId = randomUUID();
        const terminal = new HarnessLoginTerminal(plugin, context, method);
        let finish!: NativeLogin['finish'];
        const completed = new Promise<PreparatoryCall | undefined>((resolve) => { finish = resolve; });
        const { label: keyLabel, url } = plugin.setupApiKey ?? {};
        const options = { promptId, harness: plugin.displayName, instructions: method.instructions,
            ...(keyLabel && url ? { apiKey: { label: keyLabel, url } } : {}) };
        this.nativeLogin = { terminal, finish, options, context, plugin, checking: false };
        this.login = { id: promptId, title: plugin.displayName + ' sign-in', kind: 'confirm', canGoBack: true, error: diagnostic ?? null,
            question: options.apiKey ? 'Connect a provider API key or sign in in the native terminal.' : 'Sign in in the native terminal.',
            confirmLabel: 'Check sign-in', declineLabel: 'Continue later',
            hint: 'Open the sign-in page on this engine at ' + HARNESS_TERMINAL_PATH };
        const cancel = (): void => finish();
        signal.addEventListener('abort', cancel, { once: true });
        try {
            const call = await completed;
            signal.throwIfAborted();
            return call;
        } finally {
            signal.removeEventListener('abort', cancel);
            terminal.close();
            this.nativeLogin = undefined;
            this.login = undefined;
        }
    }

    /** Prefers a provider device challenge, with a separate cancellation scope for switching to the terminal. */
    private async deviceSignIn(plugin: HarnessPlugin, context: HarnessContext, method: HarnessLoginMethod, signal: AbortSignal): Promise<string | undefined> {
        const abort = new AbortController();
        this.deviceLogin = abort;
        try {
            const failure = await presentNativeLogin(plugin, { ...context, signal: AbortSignal.any([signal, abort.signal]) }, method, (challenge) => {
                if (signal.aborted || abort.signal.aborted) return;
                this.login = { id: randomUUID(), title: plugin.displayName + ' sign-in', kind: 'harness-login', canGoBack: true,
                    harness: plugin.displayName, method: 'device-code', status: 'waiting', diagnostic: null, hint: null, error: null,
                    question: 'Open the provider’s sign-in page and enter the one-time code there.', ...challenge };
            });
            return abort.signal.aborted ? undefined : failure?.diagnostic;
        } finally {
            this.deviceLogin = undefined;
            this.login = undefined;
        }
    }

    /** Keeps answers, defaults and busy phases in the same order for every client. */
    private async next(step: OnboardingDraft['step'], patch: Partial<OnboardingDraft> = {}): Promise<void> {
        await this.save({ step, promptId: randomUUID(), deferred: false, error: undefined, ...patch });
    }

    /** Saves before exposing the next state to any client. */
    private async save(patch: Partial<OnboardingDraft>): Promise<void> {
        const draft = { ...this.draft, ...patch };
        await saveOnboarding(this.staging, draft);
        this.draft = draft;
    }

    /** An accepted reply is never replayed when a second client sends the same prompt ID. */
    private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
        const current = this.tail.then(operation);
        this.tail = current.catch(() => undefined);
        return await current;
    }

    /** Presents only the safe, engine-selected inputs for this phase. */
    private prompt(): OnboardingPrompt | undefined {
        const { promptId: id, step, intent, title, folder, harnesses, error, fileIds } = this.draft;
        const base = { id, hint: null, error: error ?? null, canGoBack: step !== 'intent' };
        const text = { ...base, kind: 'text' as const, required: true, multiline: false, attachments: false, placeholder: null };
        switch (step) {
            case 'intent':
                return { ...text, title: 'Project brief', question: 'What are you working on?', initial: intent ?? '', required: false, multiline: true, attachments: true, hint: fileIds?.length ? String(fileIds.length) + ' attachments are saved. New uploads are added after them.' : 'You can attach files. A blank brief creates a skeleton with a readiness review.' };
            case 'harnesses':
                return { ...base, kind: 'choice', title: 'Harnesses', question: 'Which harnesses should run this project?', multiple: true,
                    hint: 'Choosing a harness authorizes installation for the engine user if needed. The engine checks sign-in and tests the selected tools.',
                    choices: HARNESS_PLUGINS.map((plugin) => ({ id: plugin.id, label: plugin.displayName, description: null, disabled: false })),
                    initial: harnesses ?? this.defaults };
            case 'title':
                return { ...text, title: 'Project name', question: 'What should this project be called?', initial: title ?? 'My project' };
            case 'folder':
                return { ...text, title: 'Project folder', question: 'Choose a new folder name in your Promptbook projects home.', initial: folder ?? 'my-project' };
            case 'review':
                return { ...base, kind: 'confirm', title: 'Create and start', question: 'Create ' + title + ' in ' + folder + ' and start its agenda?',
                    hint: 'The engine will save the brief and attachments in the project and create the first task for Expert.',
                    confirmLabel: 'Create and start', declineLabel: 'Review folder' };
            case 'publish':
            case 'published':
                return error ? { ...base, canGoBack: false, kind: 'confirm', title: 'Finish setup', question: 'Retry finishing the project setup?', confirmLabel: 'Retry', declineLabel: 'Later' } : undefined;
            default:
                return undefined;
        }
    }

    /** Resumes the one current job, holding no request open for installations or model calls. */
    private drive(): void {
        const step = this.draft.step;
        if (this.stopped || this.job || this.draft.error || !['prepare', 'create', 'publish', 'published'].includes(step)) return;
        const abort = new AbortController();
        const done = Promise.resolve().then(async () => {
            if (step === 'prepare') await this.prepare(abort.signal);
            else await this.finish(this.draft, (patch) => this.exclusive(() => this.save(patch)));
        }).catch(async (error: unknown) => {
            if (abort.signal.aborted) return;
            await this.exclusive(async () => {
                const current = this.draft.step;
                const problem = label(errorMessage(error)) || 'Onboarding could not continue.';
                if (current === 'prepare') await this.next('harnesses', { error: problem, deferred: this.draft.deferred });
                else if (current === 'create') await this.next('review', { error: problem, deferred: this.draft.deferred });
                else await this.save({ error: problem });
            });
        }).finally(() => {
            this.job = undefined;
            this.login = undefined;
            if (abort.signal.aborted && !this.stopped) this.drive();
        });
        // The caller sees the error via the draft; never leave a rejected background promise unobserved.
        void done.catch(() => undefined);
        this.job = { abort, done };
    }

    /** Installs or checks the chosen native harnesses, then offers an editable project name. */
    private async prepare(signal: AbortSignal): Promise<void> {
        const problems: string[] = [];
        let name: Awaited<ReturnType<typeof proposeProjectName>> | undefined;
        let ready = false;
        for (const id of this.draft.harnesses ?? []) {
            signal.throwIfAborted();
            const plugin = harnessPlugin(id)!;
            const native = harnessContext(plugin, this.staging.root, this.env, signal);
            const api = await readPreparedApiHarness(this.staging.root, plugin);
            const context = api ? harnessContext(plugin, this.staging.root, this.env, signal, api) : native;
            let inspection = await plugin.inspect(context);
            if (!inspection.installed && plugin.npmPackage) {
                await installHarness(plugin, native);
                inspection = await plugin.inspect(context);
            }
            let call = await verifyHarness(plugin, context, inspection);
            if (!call && inspection.installed && (inspection.authenticated !== true || api)) {
                const methods = await harnessLoginMethods(plugin, native, 'remote');
                const device = methods.find((method) => method.deviceChallenge);
                let diagnostic: string | undefined;
                if (device && !api) {
                    diagnostic = await this.deviceSignIn(plugin, native, device, signal);
                    signal.throwIfAborted();
                    call = await verifyHarness(plugin, native, await plugin.inspect(native));
                }
                if (!call) {
                    const terminal = methods.find((method) => method.remote && !method.deviceChallenge) ?? methods[0] ?? {
                        id: 'native', label: 'Native sign-in', args: [], remote: false, terminal: 'inherit' as const,
                        instructions: plugin.loginHint,
                    };
                    call = await this.waitForNativeLogin(plugin, native, terminal, signal, diagnostic);
                }
            }
            if (!call) {
                problems.push(plugin.displayName + ': the engine could not verify a real response.');
                continue;
            }
            ready = true;
            if (!name && !this.draft.title && this.draft.intent?.trim()) {
                name = await proposeProjectName(call, this.draft.intent).catch(() => undefined);
            }
        }
        if (signal.aborted) return;
        await this.exclusive(async () => {
            if (signal.aborted) return;
            if (!ready) await this.next('harnesses', { error: problems.join(' ').slice(0, 2000) || 'No selected harness passed its check.', deferred: this.draft.deferred });
            else await this.next('title', { title: this.draft.title ?? name?.title ?? 'My project', folder: this.draft.folder ?? name?.folder ?? 'my-project', deferred: this.draft.deferred });
        });
    }
}
