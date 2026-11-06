import { setTimeout as delay } from 'node:timers/promises';
import type { AppConnectionView } from '../../engine/snapshot.js';
import { createPendingProject, selectPendingProject, type PendingProject } from '../../app/pending-project.js';
import type { OnboardingAnswer, OnboardingPrompt, OnboardingState } from '../../app/onboarding.js';
import { parseLinkInput } from '../../app/registration.js';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { projectAt } from '../../project/workspace.js';
import { lookupService, type ControlClient } from '../../service/control.js';
import { launchDaemon } from '../../service/launcher.js';
import { basename } from 'node:path';
import { askPairingUrl } from '../../ui/app-connection.js';
import { CANCELLED, composeRich, selectMany, selectOne, wasInterrupted } from '../../ui/prompts.js';
import type { TerminalProfile } from '../../ui/terminal.js';
import { api } from '../../vendor/app-platform.js';
import { printJson, readStdin } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/** A local IPC result from the engine's single pairing operation. @private project onboarding */
export type LocalPairing = { readonly outcome: string; readonly applied: boolean; readonly app: AppConnectionView };

/** Starts or reattaches the detached setup service. @private project onboarding */
export async function launchOnboarding(context: CommandContext, input?: string, id?: string): Promise<{ readonly record: PendingProject; readonly client?: ControlClient; readonly pairing?: LocalPairing }> {
    if (input !== undefined) parseLinkInput(input);
    const env = { ...context.env };
    delete env.PTBK_LINK_CODE;
    delete env.PTBK_PROMPT_PORT;
    delete env.PTBK_PROMPT_TOKEN;
    const record = await createPendingProject(env, id);
    const existing = record.target && await lookupService(projectAt(record.target));
    if (existing && existing.state === 'running') return { record };
    const launched = await launchDaemon(record.workspace, { cli: {}, persistent: flag(context, 'persist') !== false, env });
    const client = launched.lookup.client;
    const pairing = input && !record.target ? await client.request<LocalPairing>('app-connect', { link: input }, 90_000) : undefined;
    return { record, client, ...(pairing ? { pairing } : {}) };
}

/** Parses a local automation answer with the same schema as the App, without echoing malformed input. */
async function readAnswer(): Promise<Record<string, unknown>> {
    let value: unknown;
    try { value = JSON.parse(await readStdin()); }
    catch { throw usageError('Supply a JSON onboarding answer on stdin.', 'onboarding'); }
    const parsed = api.ENGINE_API_ROUTES.answerOnboarding?.body?.schema.safeParse(value);
    if (!parsed?.success) throw usageError('Supply a prompt ID and an answer matching the displayed prompt.', 'onboarding');
    return parsed.data as Record<string, unknown>;
}

/** CLI entry for starting setup separately from collecting its answers. @private project onboarding */
export async function prepareOnboarding(context: CommandContext): Promise<number> {
    const allowed = new Set(['prepare-only', 'link', 'link-stdin', 'initialization', 'persist', 'json', 'raw', 'interactive', 'non-interactive', 'terminal-title']);
    if ([...context.explicit].some((name) => !allowed.has(name))) throw usageError('--prepare-only starts an unnamed initialization in the projects home. Supply project choices during onboarding.', 'init');
    const fromStdin = flag(context, 'link-stdin');
    const given = option<string>(context, 'link');
    if (fromStdin && given !== undefined) throw usageError('Use either --link or --link-stdin.', 'init');
    const input = fromStdin ? (await readStdin()).trim() : given;
    const { record, pairing } = await launchOnboarding(context, input, option<string>(context, 'initialization'));
    if (flag(context, 'json')) printJson({ id: record.id, status: record.target ? 'completed' : 'pending', project: record.target ?? null, app: pairing?.app ?? null, pairing: pairing?.outcome ?? null });
    else if (record.target) context.terminal.write(`Initialization ${record.id}: ${record.target}\n`);
    else {
        context.terminal.write(`Project setup is running (initialization ${record.id}).\n`);
        if (pairing) context.terminal.write(`${pairing.outcome}\n`);
        if (pairing?.applied) context.terminal.write(`Open owner access with: ptbk connect --initialization ${record.id} --setup-link\n`);
        context.terminal.write(`Continue locally with: ptbk onboarding ${record.id}\n`);
    }
    return pairing?.applied === false ? EXIT.incomplete : EXIT.success;
}

/** Local UI for the same engine-owned prompts as the App, without keeping a separate wizard draft. @private project onboarding */
export async function attendOnboarding(terminal: TerminalProfile, client: ControlClient): Promise<void> {
    let lastLogin: string | undefined;
    let announcedWork = false;
    for (;;) {
        let state: OnboardingState;
        try {
            state = await client.request<OnboardingState>('onboarding-state');
        } catch (error) {
            terminal.write(`Setup service disconnected. Reopen the initialization to check progress. ${errorMessage(error)}\n`);
            return;
        }
        if (state.status === 'completed') {
            terminal.write('Project setup is complete. Its agenda is starting.\n');
            return;
        }
        const prompt = state.prompt;
        if (!prompt || prompt.kind === 'harness-login') {
            if (prompt && prompt.id !== lastLogin) {
                lastLogin = prompt.id;
                const instructions = `${prompt.url}\nOne-time code: ${prompt.userCode ?? 'unavailable'}\n${prompt.hint ?? ''}`;
                if (terminal.prompts) {
                    const answer = await terminal.prompts({ kind: 'one', frame: { title: 'Harness sign-in' }, question: prompt.question, hint: instructions, choices: [{ value: 0, label: 'Check sign-in' }], initial: 0 });
                    if (answer.action === 'back' || answer.action === 'cancel') return;
                } else terminal.write(`\n${prompt.question}\n${instructions}\n`);
            } else if (!prompt && !announcedWork) terminal.write('The engine is working. It will show the next step here.\n');
            announcedWork = true;
            await delay(650);
            continue;
        }
        announcedWork = false;
        const answer = await presentPrompt(terminal, client, prompt);
        if (!answer) return;
        try {
            await client.request('onboarding-answer', answer);
        } catch (error) {
            terminal.write(`${errorMessage(error)}\n`);
        }
    }
}

/** Translates one ordinary local control into the App contract's answer. */
async function presentPrompt(terminal: TerminalProfile, client: ControlClient, prompt: Exclude<OnboardingPrompt, { kind: 'harness-login' }>): Promise<OnboardingAnswer | undefined> {
    const frame = { title: 'Project setup', step: prompt.title, summary: prompt.error ? [prompt.error] : undefined };
    if (prompt.kind === 'text') {
        const input = await composeRich(terminal, { frame, question: prompt.question, initial: prompt.initial, hint: prompt.hint ?? undefined, attachments: prompt.attachments, required: prompt.required, singleLine: !prompt.multiline });
        if (input !== CANCELLED) {
            const fileIds: string[] = [];
            for (const segment of input.segments) {
                if (segment.type !== 'attachment') continue;
                const file = await client.request<{ id: string }>('onboarding-upload-local', { path: segment.path, name: segment.name || basename(segment.path) });
                fileIds.push(file.id);
            }
            return { promptId: prompt.id, action: 'answer', answer: { kind: 'text', text: input.segments.filter((segment) => segment.type === 'text').map((segment) => segment.text).join(''), fileIds } };
        }
    } else {
        const choices = prompt.choices.map((choice) => ({ value: choice.id, label: choice.label, description: choice.description ?? undefined, disabled: choice.disabled }));
        const question = prompt.hint ? `${prompt.question}\n${prompt.hint}` : prompt.question;
        const value = prompt.multiple
            ? await selectMany(terminal, { frame, question, choices, initial: prompt.initial })
            : await selectOne(terminal, { frame, question, choices, defaultValue: prompt.initial[0] });
        if (value !== CANCELLED) return { promptId: prompt.id, action: 'answer', answer: { kind: 'choice', choiceIds: typeof value === 'string' ? [value] : value } };
    }
    if (!wasInterrupted() && prompt.canGoBack) return { promptId: prompt.id, action: 'back' };
    await client.request('onboarding-defer');
    return undefined;
}

/** Resumes setup interactively, or operates on exactly one prompt through the noninteractive CLI. @private project onboarding */
export default async function onboarding(context: CommandContext): Promise<number> {
    const id = context.positionals[0];
    if (!id) throw usageError('Choose an initialization ID from the global Dashboard.', 'onboarding');
    const record = await selectPendingProject(id, context.env);
    if (record.target) {
        const result = await lookupService(projectAt(record.target));
        if (result.state === 'running') {
            if (flag(context, 'json')) printJson({ status: 'completed', project: record.target });
            else context.terminal.write(`Project setup complete: ${record.target}\n`);
            return EXIT.success;
        }
    }
    const lookup = await lookupService(record.workspace);
    if (lookup.state !== 'running') throw new PtbkError('This project setup is stopped. Start it from the global Dashboard or use ptbk init --prepare-only --initialization <id>.', { kind: 'incomplete' });
    const answer = flag(context, 'answer-stdin');
    const defer = flag(context, 'defer');
    if (answer && defer) throw usageError('Answer a prompt or defer the setup in one invocation.', 'onboarding');
    if (answer) printJson(await lookup.client.request<OnboardingState>('onboarding-answer', await readAnswer()));
    else if (defer) printJson(await lookup.client.request<OnboardingState>('onboarding-defer'));
    else if (context.terminal.interactive && !flag(context, 'json')) await attendOnboarding(context.terminal, lookup.client);
    else printJson(await lookup.client.request<OnboardingState>('onboarding-state'));
    return EXIT.success;
}

/** The global Dashboard and desktop action for starting setup with a pairing URL. @private project onboarding */
export async function newPairedProject(context: CommandContext): Promise<{ readonly message: string }> {
    const url = await askPairingUrl(context.terminal, true);
    if (url === CANCELLED) return { message: 'Project setup cancelled.' };
    const { record, client, pairing } = await launchOnboarding(context, url || undefined);
    const message = `Project setup ${record.id} is running.${pairing ? ` ${pairing.outcome}` : ''}`;
    context.terminal.write(`${message}\n`);
    if (pairing?.applied) {
        context.terminal.write(`For owner access in the App, run: ptbk connect --initialization ${record.id} --setup-link\n`);
    }
    if (client && !pairing?.applied) await attendOnboarding(context.terminal, client);
    return { message };
}

/** Reopens the same draft from the global Dashboard, including pairing after creation. @private project onboarding */
export async function openPendingOnboarding(terminal: TerminalProfile, client: ControlClient): Promise<void> {
    const app = await client.request<AppConnectionView | undefined>('app-status');
    const choice = await selectOne(terminal, {
        frame: { title: 'Project setup' },
        question: 'What would you like to do with this initialization?',
        choices: [
            { value: 'continue', label: 'Continue setup here' },
            ...(app?.state === 'unlinked' || app?.state === 'refused' ? [{ value: 'pair', label: 'Pair with the Promptbook App' }] : []),
            ...(app?.hostname && app.owner !== 'set' ? [{ value: 'owner', label: 'Show the one-time owner setup link' }] : []),
        ],
        defaultValue: 'continue',
    });
    if (choice === 'pair') {
        const url = await askPairingUrl(terminal);
        if (url !== CANCELLED) {
            const result = await client.request<LocalPairing>('app-connect', { link: url }, 90_000);
            terminal.write(`${result.outcome}\n`);
        }
    } else if (choice === 'owner') {
        const result = await client.request<import('../../app/connection.js').SetupLinkOutcome>('app-setup-link');
        if (result.kind === 'issued') {
            await selectOne(terminal, {
                frame: { title: 'One-time owner setup link' },
                question: `Open this URL on the device that should hold the owner passkey:\n${result.url}`,
                choices: [{ value: 'done', label: 'Close' }],
                defaultValue: 'done',
            });
        } else terminal.write(`${result.kind === 'not-ready' ? result.missing : 'This engine already has an owner.'}\n`);
    } else if (choice === 'continue') await attendOnboarding(terminal, client);
}
