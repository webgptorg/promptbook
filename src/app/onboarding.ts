import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { stripAnsi } from '../ui/ansi.js';
import type { ComposedSegment } from '../ui/composer.js';
import type { PresentationAnswer, PresentationPrompt } from '../ui/prompt-transport.js';
import { readPrivateFile, writePrivateFile } from './files.js';
import { OnboardingFiles } from './onboarding-files.js';

/** The App contract's maximum text and attachment counts. */
const MAX_TEXT = 64 * 1024;
const MAX_FILES = 20;

/** Saved, non-secret answers are replayed into the same initializer after a service restart. */
type JournalEntry = { readonly key: string; readonly answer: PresentationAnswer; readonly fileIds: readonly string[] };
type Journal = { readonly entries: readonly JournalEntry[]; readonly deferred: boolean };

/** How a client responds to the active onboarding prompt. @private project onboarding */
export type OnboardingAnswer =
    | { readonly promptId: string; readonly action: 'back' }
    | { readonly promptId: string; readonly action: 'answer'; readonly answer:
        | { readonly kind: 'text'; readonly text: string; readonly fileIds?: readonly string[] }
        | { readonly kind: 'choice'; readonly choiceIds: readonly string[] }
        | { readonly kind: 'harness-login'; readonly returnCode: string | null } };

/** Contract projection of a prompt, including adapter-driven authentication. @private project onboarding */
export type OnboardingPrompt = {
    readonly id: string;
    readonly title: string;
    readonly question: string;
    readonly hint: string | null;
    readonly error: string | null;
    readonly canGoBack: boolean;
} & (
    | { readonly kind: 'text'; readonly multiline: boolean; readonly attachments: boolean; readonly placeholder: string | null; readonly required: boolean; readonly initial: string }
    | { readonly kind: 'choice'; readonly multiple: boolean; readonly choices: readonly { readonly id: string; readonly label: string; readonly description: string | null; readonly disabled: boolean }[]; readonly initial: readonly string[] }
    | { readonly kind: 'harness-login'; readonly method: 'device-code'; readonly harness: string; readonly url: string; readonly userCode: string | null; readonly status: 'waiting' | 'verifying' | 'failed' | 'expired' | 'denied' | 'unsupported'; readonly diagnostic: string | null; readonly expiresAt: string | null }
);

/** What clients may observe and answer. @private project onboarding */
export type OnboardingState = {
    readonly status: 'pending' | 'working' | 'completed';
    readonly deferred: boolean;
    readonly progress: { readonly step: number; readonly of: number } | null;
    readonly prompt: OnboardingPrompt | null;
};

/** A user answer that races a different client or a newer presentation. @private project onboarding */
export class StaleOnboardingPrompt extends Error {}

/** A prompt currently awaiting an answer inside the running service. */
type Pending = {
    readonly source: PresentationPrompt;
    readonly key: string;
    readonly resolve: (answer: PresentationAnswer) => void;
};

/** Bounds plain text for the App contract. */
function display(text: string, max: number): string {
    return stripAnsi(text).slice(0, max);
}

/** Keeps prompt identity independent of preselection and transient diagnostics. */
function promptKey(prompt: PresentationPrompt): string {
    return createHash('sha256').update(JSON.stringify([prompt.frame.step?.split(' · ').at(-1), prompt.kind, prompt.question, prompt.choices?.map((choice) => choice.label)])).digest('hex');
}

/** Holds the only wizard instance and serializes answers from all authenticated clients. @private project onboarding */
export class ProjectOnboarding {
    public readonly files: OnboardingFiles;
    private journal: Journal;
    private cursor = 0;
    private current?: Pending;
    private prompt: OnboardingPrompt | null = null;
    private completed = false;
    private mutations: Promise<unknown> = Promise.resolve();
    private loginRetry?: () => void;

    private constructor(private readonly directory: string, journal: Journal) {
        this.journal = journal;
        this.files = new OnboardingFiles(join(directory, 'uploads'));
    }

    /** Loads acknowledged, non-secret answers for the next service instance. */
    public static async open(directory: string): Promise<ProjectOnboarding> {
        const saved = await readPrivateFile(directory, 'onboarding.json');
        return new ProjectOnboarding(directory, saved === undefined ? { entries: [], deferred: false } : JSON.parse(saved) as Journal);
    }

    /** Current prompt or progress, without exposing internal choice values. */
    public state(): OnboardingState {
        const step = this.current?.source.frame.step?.match(/^Step (\d+) of (\d+)/);
        return {
            status: this.completed ? 'completed' : this.prompt ? 'pending' : 'working',
            deferred: this.journal.deferred,
            progress: step && Number(step[1]) <= Number(step[2]) ? { step: Number(step[1]), of: Number(step[2]) } : null,
            prompt: this.prompt,
        };
    }

    /** Runs an operation in answer order, even while durable writes yield to another request. */
    private async serialized<T>(action: () => Promise<T>): Promise<T> {
        const next = this.mutations.then(action);
        this.mutations = next.catch(() => undefined);
        return await next;
    }

    /** Commits the journal before acknowledging the change. */
    private async save(journal: Journal): Promise<void> {
        await writePrivateFile(this.directory, 'onboarding.json', JSON.stringify(journal));
        this.journal = journal;
    }

    /** Shows an initializer prompt or replays its previously acknowledged answer. */
    public async present(source: PresentationPrompt): Promise<PresentationAnswer> {
        const key = promptKey(source);
        const stored = this.journal.entries[this.cursor];
        if (stored?.key === key) {
            this.cursor++;
            return stored.answer;
        }
        const frame = source.frame;
        const base = {
            id: randomUUID(), title: display(frame.step ?? frame.title, 256), question: display(source.question, 2048),
            hint: source.hint ? display(source.hint, 2048) : null, error: source.error ? display(source.error, 2048) : null,
            canGoBack: this.cursor > 0,
        };
        if (source.kind === 'text') {
            const initial = Array.isArray(source.initial) ? (source.initial as ComposedSegment[]).flatMap((segment) => segment.type === 'text' ? [segment.text] : []).join('') : '';
            this.prompt = { ...base, kind: 'text', multiline: !source.singleLine, required: Boolean(source.required), placeholder: source.placeholder?.slice(0, 256) ?? null, initial: initial.slice(0, MAX_TEXT), attachments: Boolean(source.attachments) };
        } else {
            const choices = (source.choices ?? []).map((choice) => ({
                id: String(choice.value), label: display(choice.label, 256), description: choice.description ? display(choice.description, 2048) : null, disabled: Boolean(choice.disabled),
            }));
            const initial = source.kind === 'toggles'
                ? choices.filter(({ id }) => (source.initial as Record<string, boolean> | undefined)?.[id]).map(({ id }) => id)
                : (Array.isArray(source.initial) ? source.initial : [source.initial]).filter((item) => item !== undefined).map(String);
            this.prompt = { ...base, kind: 'choice', multiple: source.kind !== 'one', choices, initial };
        }
        return await new Promise((resolve) => { this.current = { source, key, resolve }; });
    }

    /** Shows only whitelisted adapter fields. Login material lives in memory and is never journaled. */
    public showLogin(prompt: Omit<Extract<OnboardingPrompt, { kind: 'harness-login' }>, 'id'>, retry?: () => void): void {
        this.prompt = { id: randomUUID(), ...prompt };
        this.loginRetry = retry;
    }

    /** Clears transient login material before continuing the wizard. */
    public clearLogin(): void {
        this.prompt = null;
        this.loginRetry = undefined;
    }

    /** Keeps the acknowledged draft when a user dismisses the onboarding. */
    public async defer(): Promise<OnboardingState> {
        return await this.serialized(async () => {
            if (!this.completed && !this.journal.deferred) await this.save({ ...this.journal, deferred: true });
            return this.state();
        });
    }

    /** Records one answer, rejecting obsolete IDs and unknown attachment IDs. */
    public async answer(input: OnboardingAnswer): Promise<OnboardingState> {
        return await this.serialized(async () => {
            const prompt = this.prompt;
            if (!prompt || input.promptId !== prompt.id) throw new StaleOnboardingPrompt();
            if (prompt.kind === 'harness-login') {
                if (input.action !== 'answer' || input.answer.kind !== 'harness-login' || input.answer.returnCode !== null || !this.loginRetry) {
                    throw new PtbkError('Finish the device sign-in in the provider browser.', { kind: 'usage' });
                }
                const retry = this.loginRetry;
                this.clearLogin();
                retry();
                return this.state();
            }
            const current = this.current!;
            let response: PresentationAnswer;
            let fileIds: readonly string[] = [];
            if (input.action === 'back') {
                if (!prompt.canGoBack) throw new PtbkError('There is no earlier onboarding prompt.', { kind: 'usage' });
                response = { action: 'back' };
            } else if (input.action === 'answer' && input.answer.kind === 'text' && prompt.kind === 'text') {
                const { text } = input.answer;
                fileIds = input.answer.fileIds ?? [];
                if (typeof text !== 'string' || text.length > MAX_TEXT || !Array.isArray(fileIds) || fileIds.length > MAX_FILES || fileIds.some((id) => typeof id !== 'string') ||
                    (!prompt.attachments && fileIds.length) || (!prompt.multiline && /[\r\n]/.test(text)) || (prompt.required && !text.trim() && !fileIds.length)) {
                    throw new PtbkError('Enter a valid answer to this onboarding prompt.', { kind: 'usage' });
                }
                const attachments = await this.files.segments(fileIds);
                if (!attachments) return this.refuse('An attachment is missing. Upload it again.');
                response = { action: 'answer', value: [{ type: 'text', text }, ...attachments] };
            } else if (input.action === 'answer' && input.answer.kind === 'choice' && prompt.kind === 'choice') {
                const ids = input.answer.choiceIds;
                if (!Array.isArray(ids) || ids.length > prompt.choices.length || (!prompt.multiple && ids.length !== 1) ||
                    new Set(ids).size !== ids.length || ids.some((id) => !prompt.choices.some((choice) => choice.id === id && !choice.disabled))) {
                    return this.refuse('Select an available answer.');
                }
                const values = current.source.choices!.filter(({ value }) => ids.includes(String(value))).map(({ value }) => value);
                const value = current.source.kind === 'one' ? values[0] : current.source.kind === 'toggles'
                    ? Object.fromEntries(prompt.choices.map(({ id }) => [id, ids.includes(id)])) : values;
                response = { action: 'answer', value };
            } else throw new PtbkError('The answer does not match the current onboarding prompt.', { kind: 'usage' });
            const entries = [...this.journal.entries.slice(0, this.cursor), { key: current.key, answer: response, fileIds }];
            await this.save({ entries, deferred: false });
            this.cursor++;
            this.current = undefined;
            this.prompt = null;
            current.resolve(response);
            return this.state();
        });
    }

    /** An invalid choice keeps the same prompt available. */
    private refuse(message: string): OnboardingState {
        this.prompt = { ...this.prompt!, error: message };
        return this.state();
    }

    /** A failed or interrupted apply can be attempted again without losing earlier answers. */
    public async retry(diagnostic: string): Promise<void> {
        const original = this.journal.entries;
        this.cursor = original.length;
        await this.present({
            kind: 'one', frame: { title: 'Project setup needs attention' },
            question: 'Correct the reported problem, then retry setup.',
            hint: diagnostic,
            choices: [{ label: 'Retry setup', value: 0 }],
            initial: 0,
        });
        await this.serialized(async () => {
            await this.save({ ...this.journal, entries: original });
            this.cursor = 0;
        });
    }

    /** Disallows deletion of an upload already acknowledged as part of the project draft. */
    public async deleteUpload(id: string): Promise<boolean> {
        return await this.serialized(async () => {
            if (this.journal.entries.some((entry) => entry.fileIds.includes(id))) return false;
            await this.files.delete(id);
            return true;
        });
    }

    /** Marks the local handoff after the staged project and its receipt are saved. */
    public complete(): void {
        this.completed = true;
        this.prompt = null;
    }
}
