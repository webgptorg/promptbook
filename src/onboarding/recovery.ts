import { randomUUID } from 'node:crypto';
import { PtbkError } from '../common/errors.js';
import { harnessLoginMethods } from '../harness/maintenance.js';
import type { HarnessContext, HarnessLoginMethod, HarnessPlugin } from '../harness/types.js';
import type { HarnessToolRecord } from '../tools/model.js';
import { completedOnboarding, onboardingReply, type OnboardingPrompt, type OnboardingState } from './contract.js';
import { presentHarnessChallenge } from './harness-challenge.js';
import { HARNESS_TERMINAL_PATH, HarnessLoginTerminal, type TerminalFrame } from './terminal.js';
import { verifyHarness } from './verify-harness.js';

/** The exact enabled native instance that needs its owner's attention. @private onboarding */
export type RecoveryTarget = { readonly plugin: HarnessPlugin; readonly context: HarnessContext; readonly tool: HarnessToolRecord };

/** One transient owner interaction. Replacing it invalidates all of its prompts, terminal attachments and callbacks. */
type Attempt = {
    readonly target: RecoveryTarget;
    readonly abort: AbortController;
    prompt?: OnboardingPrompt;
    deferred: boolean;
    method?: HarnessLoginMethod;
    terminal?: HarnessLoginTerminal;
    challenge?: AbortController;
    submit?: (code: string) => Promise<void>;
};

/** Reconnects one configured account in an existing project using the onboarding contract. @private onboarding */
export class ProjectHarnessRecovery {
    private active?: Attempt;

    public constructor(private readonly target: () => RecoveryTarget | undefined, private readonly verified: (target: RecoveryTarget) => Promise<void>) {}

    /** Forget an obsolete sign-in and dispose all of its transient provider state. */
    public stop(): void {
        this.active?.abort.abort();
        this.active?.terminal?.close();
        this.active = undefined;
    }

    /** Use a fresh prompt whenever the selected instance or its configuration changes. */
    private current(): Attempt | undefined {
        const target = this.target();
        if (!target) { this.stop(); return undefined; }
        if (this.active && JSON.stringify(this.active.target.tool) === JSON.stringify(target.tool)) return this.active;
        this.stop();
        const attempt: Attempt = { target, abort: new AbortController(), deferred: false };
        this.active = attempt;
        this.offer(attempt);
        return attempt;
    }

    /** Ask before starting the native CLI, or offer to verify its fallback terminal. */
    private offer(attempt: Attempt, error?: string): void {
        const { tool, plugin } = attempt.target;
        attempt.prompt = {
            id: randomUUID(), kind: 'confirm', title: plugin.displayName + ' sign-in', canGoBack: false,
            question: attempt.target.context.tool?.accountProfile !== tool.accountProfile
                ? 'Reconnect ' + tool.name + ' in a private account profile for this project.'
                : 'Reconnect ' + tool.name + ' so this project can use it again.',
            hint: 'You can also run ptbk tool enable ' + tool.name + ' on the engine host.',
            error: error ?? null, confirmLabel: attempt.terminal ? 'Check sign-in' : 'Sign in', declineLabel: 'Later',
            alternatives: attempt.terminal ? [{ id: 'native-terminal', label: 'Open the sign-in terminal', description: null, href: HARNESS_TERMINAL_PATH }] : [],
        };
    }

    /** A completed project can always keep operating while its owner defers repair. */
    public state(): OnboardingState {
        const attempt = this.current();
        if (!attempt) return completedOnboarding;
        return { status: attempt.prompt ? 'pending' : 'working', deferred: attempt.deferred, canDefer: true, progress: null, activity: [],
            prompt: attempt.prompt ? { ...attempt.prompt, alternatives: attempt.prompt.alternatives ?? [], details: [] } : null };
    }

    /** Cancels the native process while leaving the owner a way to start again. */
    public defer(): OnboardingState {
        this.stop();
        const attempt = this.current();
        if (attempt) attempt.deferred = true;
        return this.state();
    }

    /** Applies one answer to a live prompt. Consume its ID before any asynchronous work. */
    public async answer(body: unknown): Promise<OnboardingState> {
        const parsed = onboardingReply.safeParse(body);
        if (!parsed.success) throw new PtbkError('Invalid sign-in answer.', { kind: 'usage' });
        const reply = parsed.data;
        const attempt = this.current();
        const prompt = attempt?.prompt;
        if (!attempt || !prompt || prompt.id !== reply.promptId) throw new PtbkError('The sign-in step has changed.', { kind: 'conflict' });
        if (reply.action === 'back') return this.defer();
        if (reply.action !== 'answer' || reply.answer.kind !== prompt.kind) throw new PtbkError('Choose an offered sign-in action.', { kind: 'usage' });
        attempt.deferred = false;
        if (reply.answer.kind === 'confirm') {
            if (!reply.answer.confirmed) return this.defer();
            attempt.prompt = undefined;
            void this.run(attempt);
        } else if (reply.answer.kind === 'harness-login') {
            if (reply.answer.returnCode === null) {
                this.stop();
                const retry = this.current();
                if (retry) { retry.prompt = undefined; void this.run(retry); }
            } else {
                const submit = attempt.submit;
                if (!submit || !/^[!-~]{1,512}$/.test(reply.answer.returnCode) || prompt.kind !== 'harness-login') throw new PtbkError('Enter the provider code on one line.', { kind: 'usage' });
                attempt.submit = undefined;
                attempt.prompt = { ...prompt, id: randomUUID(), status: 'verifying' };
                await submit(reply.answer.returnCode);
            }
        } else throw new PtbkError('Unsupported sign-in answer.', { kind: 'usage' });
        return this.state();
    }

    /** Presents a provider challenge if available. A real request verifies the exact instance before clearing its failure. */
    private async run(attempt: Attempt): Promise<void> {
        const { plugin, context } = attempt.target;
        const signal = attempt.abort.signal;
        const native = { ...context, signal };
        try {
            let problem: string | undefined;
            if (!attempt.terminal) {
                const methods = await harnessLoginMethods(plugin, native, 'remote');
                signal.throwIfAborted();
                const method = methods.find(item => item.deviceChallenge || item.returnChallenge);
                attempt.method = methods.find(item => item.remote && !item.deviceChallenge) ?? methods[0] ?? { id: 'native', label: 'Native sign-in', args: plugin.loginArgs ?? [], remote: true, terminal: 'inherit', instructions: plugin.loginHint };
                if (method) {
                    const challenge = new AbortController();
                    attempt.challenge = challenge;
                    problem = await presentHarnessChallenge(plugin, native, method, AbortSignal.any([signal, challenge.signal]), undefined, false, (prompt, submit) => {
                        attempt.prompt = prompt;
                        attempt.submit = submit;
                    });
                    signal.throwIfAborted();
                    attempt.challenge = undefined;
                    attempt.submit = undefined;
                }
                if (attempt.terminal) return;
                if (!method || problem) { this.fallback(attempt, problem); return; }
            }
            const check = await verifyHarness(plugin, native, await plugin.inspect(native), 30_000);
            if (signal.aborted || this.current() !== attempt) return;
            if (check.call) {
                await this.verified(attempt.target);
                if (this.active === attempt) this.stop();
            } else this.fallback(attempt, check.diagnostic);
        } catch {
            if (!signal.aborted) this.fallback(attempt, 'Sign-in could not finish. Retry or use the command shown here.');
        }
    }

    /** Exposes only the native CLI associated with this account and revision. */
    private fallback(attempt: Attempt, problem?: string): void {
        if (attempt.method) attempt.terminal ??= new HarnessLoginTerminal(attempt.target.plugin, { ...attempt.target.context, signal: attempt.abort.signal }, attempt.method);
        this.offer(attempt, problem);
    }

    /** Switches the currently displayed provider challenge to a private owner terminal. */
    public useTerminal(promptId: unknown): void {
        const attempt = this.current();
        if (!attempt?.challenge || !attempt.prompt || attempt.prompt.id !== promptId) throw new PtbkError('The sign-in step has changed.', { kind: 'conflict' });
        attempt.challenge.abort();
        attempt.submit = undefined;
        this.fallback(attempt);
    }

    /** Opening the fallback page is an explicit request to switch presentations. */
    public async prepareTerminal(): Promise<void> {
        const attempt = this.current();
        if (attempt?.challenge && !attempt.terminal) this.useTerminal(attempt.prompt?.id);
    }

    /** Metadata of the current fallback terminal, without its transcript. */
    public signInOptions(): { promptId: string; harness: string; instructions: string } | undefined {
        const attempt = this.current();
        return attempt?.terminal && attempt.prompt && attempt.method
            ? { promptId: attempt.prompt.id, harness: attempt.target.plugin.displayName, instructions: attempt.method.instructions } : undefined;
    }

    /** Bind terminal writes to the current prompt and authenticated attachment. */
    public async terminal(owner: string, command: Readonly<Record<string, unknown>>): Promise<TerminalFrame | null> {
        const attempt = this.current();
        if (!attempt?.terminal || !attempt.prompt || attempt.prompt.id !== command.promptId) throw new PtbkError('The terminal has changed.', { kind: 'conflict' });
        return await attempt.terminal.command(owner, command);
    }
}
