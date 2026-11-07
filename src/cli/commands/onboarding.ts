import type { AppPairingOutcome } from '../../app/connection.js';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { EXIT, errorMessage, PtbkError, usageError } from '../../common/errors.js';
import { createOnboarding, listOnboardings, onboardingTarget, readOnboarding } from '../../onboarding/draft.js';
import { launchOnboarding, onboardingClient, pendingOnboarding } from '../../onboarding/local.js';
import type { OnboardingPrompt, OnboardingReply } from '../../onboarding/contract.js';
import type { OnboardingView } from '../../onboarding/session.js';
import type { OnboardingFile } from '../../onboarding/uploads.js';
import type { TerminalFrame } from '../../onboarding/terminal.js';
import type { Project } from '../../project/workspace.js';
import { lookupService, type ControlClient } from '../../service/control.js';
import { CANCELLED, composeRich, confirm, inputLine, selectMany, selectOne, wasInterrupted } from '../../ui/prompts.js';
import { printJson, readStdin } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { ownerAccess } from './connect.js';

/** The write endpoint is private IPC and accepts exactly the same validated response as the App API. */
async function submit(client: ControlClient, reply: OnboardingReply): Promise<void> {
    await client.request('onboarding-answer', reply);
}

/** A local client of the same durable wizard, with the normal graphical presentation when embedded in desktop. */
async function interact(context: CommandContext, project: Project, client: ControlClient): Promise<string | undefined> {
    const terminal = context.terminal;
    let waiting = false;
    for (;;) {
        const receipt = await readOnboarding(project);
        if (receipt?.step === 'done' && receipt.folder) return onboardingTarget(project, receipt.folder).root;
        const view = await client.request<OnboardingView>('onboarding-state').catch(async (error: unknown) => {
            if ((await readOnboarding(project))?.step === 'done') return undefined;
            throw error;
        });
        if (!view) continue;
        const prompt = view.onboarding.prompt;
        if (!prompt) {
            if (!waiting) terminal.write('The engine is working. You can close this client and continue later.\n');
            waiting = true;
            await new Promise((done) => setTimeout(done, 500));
            continue;
        }
        waiting = false;
        const frame = { title: 'Pending initialization', step: prompt.title, ...(prompt.error || prompt.hint ? { summary: [prompt.error ?? prompt.hint!] } : {}) };
        if (view.nativeLogin === prompt.id) {
            const choice = await selectOne(terminal, { frame, question: prompt.question, choices: [
                { value: 'terminal', label: 'Open native sign-in terminal' }, { value: 'check', label: 'Check sign-in' },
                { value: 'back', label: 'Choose harnesses' }, { value: 'later', label: 'Continue later' },
            ] });
            if (choice === CANCELLED || choice === 'later') { await client.request('onboarding-defer'); return undefined; }
            try {
                if (choice === 'terminal') await nativeLoginTerminal(context, client);
                await submit(client, choice === 'back' ? { promptId: prompt.id, action: 'back' } :
                    { promptId: prompt.id, action: 'answer', answer: { kind: 'confirm', confirmed: true } });
            } catch (error) {
                terminal.write(errorMessage(error) + '\n');
                if (!(error instanceof PtbkError) || !['conflict', 'setup'].includes(error.details.kind)) return undefined;
            }
            continue;
        }
        if (prompt.kind === 'harness-login') {
            const result = await watchLogin(context, client, prompt);
            if (result === 'leave') return undefined;
            if (result === 'back') await submit(client, { promptId: prompt.id, action: 'back' }).catch((error: unknown) => {
                if (!(error instanceof PtbkError && error.details.kind === 'conflict')) throw error;
            });
            continue;
        }
        let answer: Extract<OnboardingReply, { action: 'answer' }>['answer'] | typeof CANCELLED;
        if (prompt.kind === 'text' && prompt.multiline) {
            const input = await composeRich(terminal, { frame, question: prompt.question, initial: [{ type: 'text', text: prompt.initial }], attachments: prompt.attachments });
            if (input === CANCELLED) answer = CANCELLED;
            else {
                const fileIds: string[] = [];
                for (const segment of input.segments) {
                    if (segment.type !== 'attachment') continue;
                    const file = await client.request<OnboardingFile | null>('onboarding-upload', { path: resolve(context.cwd, segment.path) });
                    if (!file) throw new PtbkError('The attachment exceeds the onboarding upload limit.', { kind: 'setup' });
                    fileIds.push(file.id);
                }
                answer = { kind: 'text', text: input.segments.filter((segment) => segment.type === 'text').map((segment) => segment.text).join(''), fileIds };
            }
        } else if (prompt.kind === 'text') {
            const text = await inputLine(terminal, { frame, question: prompt.question, initial: prompt.initial });
            answer = text === CANCELLED ? CANCELLED : { kind: 'text', text, fileIds: [] };
        } else if (prompt.kind === 'choice') {
            const choices = prompt.choices.map((choice) => ({ value: choice.id, label: choice.label, description: choice.description ?? undefined, disabled: choice.disabled }));
            const values = await selectMany(terminal, { frame, question: prompt.question, choices, initial: prompt.initial, minimum: 1 });
            answer = values === CANCELLED ? CANCELLED : { kind: 'choice', choiceIds: [...values] };
        } else {
            const value = await confirm(terminal, { frame, question: prompt.question, defaultYes: false, yesLabel: prompt.confirmLabel, noLabel: prompt.declineLabel });
            answer = value === CANCELLED ? CANCELLED : { kind: 'confirm', confirmed: value };
        }
        try {
            if (answer !== CANCELLED) await submit(client, { promptId: prompt.id, action: 'answer', answer });
            else if (prompt.canGoBack && !wasInterrupted()) await submit(client, { promptId: prompt.id, action: 'back' });
            else {
                await client.request('onboarding-defer');
                return undefined;
            }
        } catch (error) {
            if (!(error instanceof PtbkError && error.details.kind === 'conflict')) throw error;
            terminal.write('Another client already answered that prompt. Refreshing.\n');
        }
    }
}

/** The desktop xterm and the CLI both forward their keys to the same engine-owned native terminal. */
async function nativeLoginTerminal(context: CommandContext, client: ControlClient): Promise<void> {
    const id = randomUUID();
    const size = () => ({ cols: context.terminal.columns(), rows: context.terminal.rows() });
    const call = <T>(action: string, params = {}) => client.request<T>('onboarding-terminal', { id, action, ...params });
    const input = process.stdin;
    const raw = input.isRaw;
    const paused = input.isPaused();
    await call('start', size());
    let writes = Promise.resolve<unknown>(undefined);
    let failure: unknown;
    const send = (action: string, params: object): void => {
        writes = writes.then(() => failure ? undefined : call(action, params)).catch((error: unknown) => { failure = error; });
    };
    const onInput = (data: Buffer | string): void => {
        for (const part of String(data).match(/[\s\S]{1,4096}/g) ?? []) send('write', { data: part });
    };
    const resize = (): void => send('resize', size());
    try {
        input.setRawMode(true);
        input.on('data', onInput);
        process.stdout.on('resize', resize);
        let offset = 0;
        for (;;) {
            if (failure) throw failure;
            const frame = await call<TerminalFrame>('read', { offset });
            context.terminal.write(frame.output);
            offset = frame.offset;
            if (frame.done) break;
            await new Promise((done) => setTimeout(done, 120));
        }
    } finally {
        input.off('data', onInput);
        process.stdout.off('resize', resize);
        input.setRawMode(raw);
        if (paused) input.pause();
        await writes;
        await call('close').catch(() => undefined);
    }
}

/** Waits for native device authentication in the terminal or graphical desktop with a cancellable prompt. */
async function watchLogin(context: CommandContext, client: ControlClient, prompt: Extract<OnboardingPrompt, { kind: 'harness-login' }>): Promise<'leave' | 'back' | 'advanced'> {
    const abort = new AbortController();
    const terminal = context.terminal;
    const afterLogin = async (): Promise<'advanced'> => {
        while (!abort.signal.aborted) {
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 600));
            if (abort.signal.aborted) break;
            const view = await client.request<OnboardingView>('onboarding-state');
            if (view.onboarding.prompt?.id !== prompt.id) break;
        }
        return 'advanced';
    };
    const frame = { title: 'Pending initialization', step: prompt.harness };
    try {
        if (terminal.prompts) {
            const choice = terminal.prompts({
                kind: 'harness-login', frame, question: prompt.question,
                login: { url: prompt.url, userCode: prompt.userCode ?? '' },
            }, abort.signal).then((answer) => answer.action === 'back' ? 'back' as const : 'leave' as const);
            return await Promise.race([choice, afterLogin()]);
        }
        terminal.write(prompt.question + '\n' + prompt.url + '\nCode: ' + prompt.userCode + '\nWaiting for the provider. Ctrl+C returns to the dashboard.\n');
        let stop!: () => void;
        const left = new Promise<'leave'>((done) => { stop = () => done('leave'); });
        process.once('SIGINT', stop);
        try {
            return await Promise.race([left, afterLogin()]);
        } finally {
            process.off('SIGINT', stop);
        }
    } finally {
        abort.abort();
    }
}

/** Starts an engine before project setup and optionally links it through its private local control. @private onboarding */
export async function prepareOnboarding(context: CommandContext): Promise<number> {
    const value = option<string>(context, 'link');
    const fromStdin = flag(context, 'link-stdin') === true;
    const wantOwner = flag(context, 'setup-link') === true;
    if (value !== undefined && fromStdin) throw usageError('Use either --link or --link-stdin.', 'init');
    const link = fromStdin ? (await readStdin()).trim() : value?.trim();
    if ((fromStdin || value !== undefined || wantOwner) && !link) throw usageError('Provide the complete pairing URL from the App.', 'init');
    const draft = await createOnboarding(context.env, link);
    const project = await pendingOnboarding(draft.engineId, context.env);
    const json = flag(context, 'json') === true;
    if (draft.step === 'done' && draft.folder) {
        const target = onboardingTarget(project, draft.folder);
        if (wantOwner) return await ownerAccess(context, target, json || !context.terminal.interactive);
        const root = target.root;
        if (json) printJson({ engineId: draft.engineId, outcome: 'already-initialized', root });
        else context.terminal.write('Project already initialized at ' + root + '\n');
        return EXIT.success;
    }
    const { lookup, persistence } = await launchOnboarding(project, context.env, flag(context, 'persist'));
    let result: AppPairingOutcome | undefined;
    if (link) {
        result = await lookup.client.request<AppPairingOutcome>('app-link', { link }, 90_000);
        if (result.outcome === 'refused') {
            if (json) printJson({ engineId: draft.engineId, ...result });
            else context.terminal.write(result.message + '\nEngine ' + draft.engineId + ' is still waiting. Use ptbk connect --onboarding ' + draft.engineId + ' --link <url>.\n');
            return EXIT.incomplete;
        }
    }
    if (wantOwner) return await ownerAccess(context, project, json || !context.terminal.interactive);
    if (json) printJson({ engineId: draft.engineId, outcome: result?.outcome ?? 'pending', app: result && 'app' in result ? result.app : undefined, persistence });
    else context.terminal.write('Pending initialization ' + draft.engineId + ' is running.\n' +
        (result ? 'Owner access: ptbk connect --onboarding ' + draft.engineId + ' --setup-link\n' : '') +
        'Continue locally: ptbk onboarding --id ' + draft.engineId + '\n');
    return EXIT.success;
}

/** Finds, observes and controls a pending initialization from the host CLI. @private command */
export default async function onboarding(context: CommandContext): Promise<number> {
    const id = option<string>(context, 'id');
    const json = flag(context, 'json') === true;
    if (!id) {
        if (context.explicit.size && ['answer', 'answer-file', 'attach', 'defer', 'stop', 'resume-service'].some((key) => context.explicit.has(key))) throw usageError('Select an initialization with --id.', 'onboarding');
        const items = (await listOnboardings(context.env)).filter((draft) => draft.step !== 'done').map(({ engineId, step }) => ({ engineId, step }));
        if (json) printJson(items);
        else context.terminal.write(items.length ? items.map(({ engineId, step }) => engineId + '  ' + step).join('\n') + '\n' : 'No pending initializations.\n');
        return EXIT.success;
    }
    const project = await pendingOnboarding(id, context.env);
    const saved = await readOnboarding(project);
    if (saved?.step === 'done' && saved.folder) {
        const root = onboardingTarget(project, saved.folder).root;
        if (json) printJson({ engineId: id, step: 'done', root });
        else context.terminal.write('Initialized at ' + root + '\n');
        return EXIT.success;
    }
    if (flag(context, 'stop')) {
        const running = await lookupService(project);
        if (running.state === 'running') await running.client.request('stop');
        return EXIT.success;
    }
    const client = await onboardingClient(project, context.env);
    if (flag(context, 'resume-service')) return EXIT.success;
    const direct = option<string>(context, 'answer');
    const fromFile = option<string>(context, 'answer-file');
    if (direct !== undefined && fromFile !== undefined) throw usageError('Use either --answer or --answer-file.', 'onboarding');
    if (direct !== undefined || fromFile !== undefined) {
        const raw = direct ?? (fromFile === '-' ? await readStdin() : await readFile(resolve(context.cwd, fromFile!), 'utf8'));
        let body: OnboardingReply;
        try {
            body = JSON.parse(raw) as OnboardingReply;
        } catch {
            throw usageError('The onboarding answer is not valid JSON.', 'onboarding');
        }
        await submit(client, body);
    }
    const file = option<string>(context, 'attach');
    if (file) {
        const uploaded = await client.request<OnboardingFile | null>('onboarding-upload', { path: resolve(context.cwd, file) });
        if (!uploaded) throw new PtbkError('The attachment exceeds the onboarding upload limit.', { kind: 'setup' });
        if (json) printJson(uploaded);
        else context.terminal.write(uploaded.id + '  ' + uploaded.name + '\n');
        return EXIT.success;
    }
    if (flag(context, 'defer')) await client.request('onboarding-defer');
    if (context.terminal.interactive && !json && !direct && !fromFile && !flag(context, 'defer')) {
        const root = await interact(context, project, client);
        context.terminal.write(root ? 'Project initialized at ' + root + '\n' : 'Initialization saved. Resume with ptbk onboarding --id ' + id + '.\n');
        if (root && context.terminal.prompts) await context.terminal.prompts({ kind: 'complete', frame: { title: 'Pending initialization' }, question: 'Initialization result', completion: { root, ready: true, running: true } });
    } else {
        const view = await client.request<OnboardingView>('onboarding-state');
        if (json) printJson(view);
        else context.terminal.write(view.onboarding.prompt ? view.onboarding.prompt.question + '\n' : 'The engine is ' + view.onboarding.status + '.\n');
    }
    return EXIT.success;
}

/** Interactive local dashboard controls for creating, pairing and resuming a pending initialization. @private dashboard */
export async function onboardingFromDashboard(context: CommandContext): Promise<{ message: string; projectRoot?: string }> {
    const drafts = (await listOnboardings(context.env)).filter((draft) => draft.step !== 'done');
    const frame = { title: 'Project initialization' };
    const id = await selectOne(context.terminal, {
        frame, question: 'Start a new initialization or continue a saved one?',
        choices: [{ value: 'new', label: 'Start a new initialization' }, ...drafts.map((draft) => ({ value: draft.engineId, label: draft.title ?? 'Pending initialization', description: draft.engineId + ' · ' + draft.step }))],
        defaultValue: 'new',
    });
    if (id === CANCELLED) return { message: 'Back to the global dashboard.' };
    const draft = id === 'new' ? await createOnboarding(context.env) : drafts.find((item) => item.engineId === id)!;
    const project = await pendingOnboarding(draft.engineId, context.env);
    const client = await onboardingClient(project, context.env);
    const app = await client.request<{ hostname?: string; owner?: string } | undefined>('app-status');
    if (app && !app.hostname) {
        const url = await inputLine(context.terminal, { frame, question: 'Paste the App pairing URL, or leave it empty to continue locally.', optional: true });
        if (url === CANCELLED) return { message: 'Initialization saved (' + draft.engineId + ').' };
        if (url.trim()) {
            const outcome = await client.request<AppPairingOutcome>('app-link', { link: url.trim() }, 90_000);
            if (outcome.outcome === 'refused') return { message: outcome.message + ' Initialization saved (' + draft.engineId + ').' };
        }
    }
    const choice = await selectOne(context.terminal, {
        frame, question: 'How do you want to continue?',
        choices: [{ value: 'local', label: 'Continue in this dashboard' }, { value: 'app', label: 'Get the owner setup link for App' }, { value: 'later', label: 'Continue later' }],
        defaultValue: 'local',
    });
    if (choice === 'app') {
        try {
            await ownerAccess({ ...context, options: { ...context.options, wait: false } }, project, false);
        } catch (error) {
            context.terminal.write(errorMessage(error) + '\n');
        }
        await inputLine(context.terminal, { frame, question: 'Press Enter to return to the global dashboard.', optional: true });
    } else if (choice === 'local') {
        const root = await interact(context, project, client);
        if (root) return { message: basename(root) + ' was created and its agenda is running.', projectRoot: root };
    }
    return { message: 'Initialization saved (' + draft.engineId + ').' };
}
