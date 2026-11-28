import { randomUUID } from 'node:crypto';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';
import { harnessLoginMethods } from '../harness/maintenance.js';
import { createRedactor } from '../common/redact.js';
import { stripAnsi } from '../ui/ansi.js';
import { presentHarnessChallenge } from '../onboarding/harness-challenge.js';
import { verifyHarness } from '../onboarding/verify-harness.js';
import type { OnboardingPrompt } from '../onboarding/contract.js';
import type { HarnessToolRecord } from '../tools/model.js';
import { api, type ContractResponse } from '../vendor/app-platform.js';
import type { AccessStore, Actor } from './web/access.js';

/** One observed harness, with its current project-scoped invocation context. @private App AI tools */
export type AiToolTarget = { readonly plugin: HarnessPlugin; readonly tool: HarnessToolRecord; readonly context: HarnessContext; readonly inspection: HarnessInspection; readonly configured: boolean };

/** Project operations shared with the CLI; candidate credentials are committed only after verification. @private App AI tools */
export type AiToolsBackend = {
    readonly targets: () => Promise<readonly AiToolTarget[]>;
    readonly prepare: (target: AiToolTarget, method: 'account' | 'api-key', key?: string) => HarnessContext;
    readonly commit: (target: AiToolTarget, context: HarnessContext, key?: string) => Promise<void>;
    readonly discard: (context: HarnessContext) => Promise<void>;
    readonly signOut: (target: AiToolTarget) => Promise<void>;
    readonly verified?: (target: AiToolTarget) => Promise<void>;
    readonly onFailure?: (listener: (pluginId: string, context: HarnessContext, diagnostic: string) => void) => () => void;
    readonly verify?: typeof verifyHarness;
};

/** Stable v1 IDs name harness adapters; named ptbk.json instances remain the backend's source of truth. @private App AI tools */
export function aiToolId(pluginId: string): string { return pluginId === 'openai-codex' ? 'codex' : pluginId === 'gemini' ? 'gemini-cli' : pluginId; }

/** A real check's safe, transient outcome. */
type Observation = { readonly checkedAt: string; readonly status: string; readonly problem: { readonly code: string; readonly message: string } | null };

/** A single session-bound provider interaction, never serialized or logged. */
type SignIn = {
    readonly id: string; readonly toolId: string; readonly actor: Actor; readonly access: AccessStore; readonly target: AiToolTarget;
    readonly expires: number; abort: AbortController;
    method: 'account' | 'api-key'; context: HarnessContext; prompt?: OnboardingPrompt; submit?: (code: string) => Promise<void>;
    loginPrompt?: Extract<OnboardingPrompt, { kind: 'harness-login' }>;
    readonly privateValues: Set<string>;
    done: boolean; busy: boolean; generation: number;
};

/** Fixed contract problems, with no provider output or credentials. */
function fail(code: string): ContractResponse { return { kind: 'problem', problem: api.createProblem(code) }; }

/** Redacts first, then removes terminal escapes and bounds a provider diagnostic. */
function safeDiagnostic(text: string, context: HarnessContext, extra: readonly string[] = []): string {
    return stripAnsi(createRedactor(extra, context.env)(text)).replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 2048) || 'The provider could not verify a response.';
}

/** Classifies real provider failures; only authentication failures stop automatic chat retries. */
function observation(message: string, context: HarnessContext): Observation {
    const text = safeDiagnostic(message, context);
    const code = /oauth.*(?:expir|refresh|revok)|session expired|refresh.token/i.test(text) ? 'sign-in-expired'
        : /not (?:signed|logged) in|sign.?in required|unauthenticated|authentication required/i.test(text) ? 'not-signed-in'
        : /(?:api.?key|key).*(?:invalid|reject)|invalid.*(?:api.?key|key)/i.test(text) ? 'key-rejected'
        : /quota|billing|credit|rate.limit|usage.limit/i.test(text) ? 'quota-exceeded'
        : /network|timed?.?out|unavailable|ECONN|\b5\d\d\b/i.test(text) ? 'provider-unavailable' : 'check-failed';
    return { checkedAt: new Date().toISOString(), status: code === 'sign-in-expired' || code === 'not-signed-in' ? 'needs-sign-in' : 'error', problem: { code, message: text } };
}

/** Browser maintenance of real harnesses, independent from one-time initialization. @private App AI tools */
export class ProjectAiTools {
    private readonly observations = new Map<string, Observation>();
    private readonly checks = new Map<string, Promise<void>>();
    private readonly signIns = new Map<string, SignIn>();
    private readonly changes = new Map<string, number>();
    private readonly rate = new Map<string, { at: number; count: number }>();
    private readonly listeners = new Set<() => void>();
    private readonly abort = new AbortController();
    private sequence = 0;
    private initialChecksStarted = false;
    private readonly unsubscribe?: () => void;

    public constructor(private readonly backend: AiToolsBackend) {
        this.unsubscribe = backend.onFailure?.((pluginId, context, diagnostic) => {
            const id = aiToolId(pluginId); this.observations.set(id, { ...observation(diagnostic, context), status: 'needs-sign-in' }); this.changed(id);
        });
    }

    /** Latest change marker; an event stream gets only IDs, never diagnostics or prompts. */
    public get revision(): number { return this.sequence; }

    /** IDs changed since a stream's marker. */
    public changedSince(since: number): readonly string[] { return [...this.changes].filter(([, revision]) => revision > since).map(([id]) => id); }

    /** Waits until an observation changes, disposing the listener when its browser disconnects. */
    public async waitForChange(since: number, signal: AbortSignal): Promise<void> {
        if (since !== this.sequence || signal.aborted) return;
        await new Promise<void>(resolve => {
            const done = (): void => { this.listeners.delete(done); signal.removeEventListener('abort', done); resolve(); };
            this.listeners.add(done); signal.addEventListener('abort', done, { once: true });
        });
    }

    /** Announces a status, check or credential transition. */
    private changed(id: string): void { this.changes.set(id, ++this.sequence); for (const listener of this.listeners) listener(); }

    /** Looks up the current configuration, so deleted or changed tools cannot be silently overwritten. */
    private async target(id: string): Promise<AiToolTarget | undefined> { return (await this.backend.targets()).find(item => aiToolId(item.plugin.id) === id); }

    /** Supported browser flows, never a promise to install an absent tool or open an inaccessible host terminal. */
    private methods(target: AiToolTarget): ('account' | 'api-key')[] {
        return target.inspection.installed ? [...(target.plugin.accountHomeVariable ? ['account' as const] : []), ...(target.plugin.setupApiKey ? ['api-key' as const] : [])] : [];
    }

    /** Projects an observation through the contract; inspection alone never claims a successful model call. */
    private view(target: AiToolTarget): Record<string, unknown> {
        const id = aiToolId(target.plugin.id);
        const checked = this.observations.get(id);
        const needs = target.inspection.problem === 'signed-out';
        const missing = !target.inspection.installed;
        return { id, name: target.plugin.displayName, version: target.inspection.version?.slice(0, 64) ?? null,
            auth: !missing && target.configured && target.inspection.authentication !== 'none' ? { method: target.tool.authentication === 'API_KEY' ? 'api-key' : 'account', account: null } : null,
            signInMethods: this.methods(target), checking: this.checks.has(id), checkedAt: checked?.checkedAt ?? null,
            status: missing ? 'not-installed' : needs || !checked ? 'needs-sign-in' : checked.status,
            problem: missing ? { code: 'not-installed', message: 'This tool is not installed on the engine host.' }
                : needs ? { code: /expir|refresh|revok/i.test(target.inspection.summary) ? 'sign-in-expired' : 'not-signed-in', message: safeDiagnostic(target.inspection.summary, target.context) }
                : checked?.problem ?? (checked ? null : { code: 'not-signed-in', message: 'This project has not verified a response from this tool yet.' }) };
    }

    /** Lists known adapters once, in the project's preference order. */
    public async list(): Promise<ContractResponse> {
        const targets = await this.backend.targets();
        if (!this.initialChecksStarted) {
            this.initialChecksStarted = true;
            for (const target of targets) if (target.configured && target.tool.isEnabled && target.inspection.installed) void this.check(aiToolId(target.plugin.id)).catch(() => undefined);
        }
        return { kind: 'ok', data: { items: targets.map(target => this.view(target)) } };
    }

    /** One current status. */
    public async get(id: string): Promise<ContractResponse> { const target = await this.target(id); return target ? { kind: 'ok', data: this.view(target) } : fail('not-found'); }

    /** A real call, coalesced per tool; failed credentials are never accepted based on a key's shape. */
    public async check(id: string, actor?: Actor): Promise<ContractResponse> {
        const target = await this.target(id);
        if (!target) return fail('not-found');
        if (!target.inspection.installed) return fail('ai-tool-not-installed');
        if (!this.checks.has(id)) {
            const client = actor?.sessionId ?? 'engine';
            const limit = this.rate.get(client);
            if (limit && Date.now() - limit.at < 60_000 && limit.count >= 30) return fail('rate-limited');
            if (!limit || Date.now() - limit.at >= 60_000) this.rate.set(client, { at: Date.now(), count: 1 }); else limit.count++;
            if (this.rate.size > 1000) for (const [key, entry] of this.rate) if (Date.now() - entry.at >= 60_000) this.rate.delete(key);
            const context = { ...target.context, signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(30_000)]) };
            const work = Promise.resolve().then(async () => {
                const result = await (this.backend.verify ?? verifyHarness)(target.plugin, context, await target.plugin.inspect(context), 30_000);
                const current = await this.target(id);
                if (!current || JSON.stringify(current.tool) !== JSON.stringify(target.tool) || context.signal.aborted) return;
                this.observations.set(id, result.call ? { checkedAt: new Date().toISOString(), status: 'signed-in', problem: null } : observation(result.diagnostic, context));
                if (result.call) await this.backend.verified?.(current);
            }).catch(() => { if (!this.abort.signal.aborted) this.observations.set(id, observation('The provider check failed.', context)); })
                .finally(() => { this.checks.delete(id); this.changed(id); });
            this.checks.set(id, work); this.changed(id);
        }
        return { kind: 'ok', data: this.view(target) };
    }

    /** Forgets an old native flow and deletes only its uncommitted private profile. */
    private discard(signIn: SignIn): void {
        signIn.abort.abort(); signIn.generation++; signIn.submit = undefined;
        if (!signIn.done) void this.backend.discard(signIn.context).catch(() => undefined);
        if (this.signIns.get(signIn.toolId) === signIn) this.signIns.delete(signIn.toolId);
    }

    /** Every use rechecks session ownership, expiry, membership and permission. */
    private current(id: string, signInId: string, actor: Actor): SignIn | undefined {
        const signIn = this.signIns.get(id);
        if (!signIn || signIn.id !== signInId || signIn.actor.sessionId !== actor.sessionId || signIn.actor.memberId !== actor.memberId) return undefined;
        const member = signIn.access.member(actor.memberId);
        if (signIn.expires <= Date.now() || !member || member.status !== 'active' || !signIn.access.sessions(actor.memberId).some(session => session.id === actor.sessionId) || !signIn.access.permissionsOf(member).includes('ai-tools.manage')) { this.discard(signIn); return undefined; }
        return signIn;
    }

    /** A safe status for the one owner session; no candidate credential is ever projected. */
    private async signInView(signIn: SignIn): Promise<ContractResponse> {
        const wasDone = signIn.done;
        let target = await this.target(signIn.toolId);
        // A poll may have inspected the old profile while the verified replacement was being committed.
        if (!wasDone && signIn.done) target = await this.target(signIn.toolId);
        if (!target) return fail('not-found');
        return { kind: 'ok', data: { id: signIn.id, aiToolId: signIn.toolId, method: signIn.method, expiresAt: new Date(signIn.expires).toISOString(), activity: [],
            status: signIn.done ? 'completed' : signIn.prompt ? 'pending' : 'working', prompt: signIn.prompt ?? null, tool: this.view(target) } };
    }

    /** Reads a prompt that may have been replaced by a native process callback. */
    private promptOf(signIn: SignIn): OnboardingPrompt | undefined { return signIn.prompt; }

    /** Starts one isolated attempt; old live credentials stay active until its real verification succeeds. */
    public async start(id: string, method: 'account' | 'api-key', actor: Actor, access: AccessStore): Promise<ContractResponse> {
        const target = await this.target(id);
        if (!target) return fail('not-found');
        if (!target.inspection.installed) return fail('ai-tool-not-installed');
        if (!this.methods(target).includes(method)) return fail('ai-tool-method-unsupported');
        await access.recordAudit('ai-tool.sign-in.start', actor, 'ai-tool', id);
        const previous = this.signIns.get(id); if (previous) this.discard(previous);
        const signIn: SignIn = { id: randomUUID(), toolId: id, target, method, actor, access, expires: Date.now() + 15 * 60_000,
            abort: new AbortController(), context: this.backend.prepare(target, method), done: false, busy: false, generation: 0, privateValues: new Set() };
        this.signIns.set(id, signIn);
        if (method === 'api-key') this.keyPrompt(signIn);
        else void this.account(signIn);
        return await this.signInView(signIn);
    }

    /** A fresh write-only key prompt, also after a rejected key. */
    private keyPrompt(signIn: SignIn, error?: string): void {
        const setup = signIn.target.plugin.setupApiKey!;
        signIn.prompt = { id: randomUUID(), kind: 'secret', title: setup.label, question: 'Enter your provider API key.', label: setup.label, helpUrl: setup.url,
            placeholder: null, hint: 'The key is verified before this project switches to it.', error: error ?? null, canGoBack: false,
            alternatives: this.methods(signIn.target).includes('account') ? [{ id: 'account', label: 'Sign in with your account instead', description: null, href: null }] : [] };
    }

    /** Switches method within one session-bound interaction; callbacks from its old process are invalidated. */
    private async restart(signIn: SignIn, method: 'account' | 'api-key'): Promise<ContractResponse> {
        signIn.abort.abort(); signIn.generation++;
        await this.backend.discard(signIn.context);
        signIn.abort = new AbortController(); signIn.context = this.backend.prepare(signIn.target, method);
        signIn.method = method; signIn.prompt = undefined; signIn.submit = undefined; signIn.busy = false;
        signIn.loginPrompt = undefined;
        if (method === 'api-key') this.keyPrompt(signIn); else void this.account(signIn);
        return await this.signInView(signIn);
    }

    /** Runs the same device or returned-code flow as setup, now scoped to this maintenance attempt. */
    private async account(signIn: SignIn): Promise<void> {
        const generation = ++signIn.generation;
        signIn.busy = true; signIn.prompt = undefined; signIn.submit = undefined;
        const context = { ...signIn.context, signal: signIn.abort.signal };
        try {
            const methods = await harnessLoginMethods(signIn.target.plugin, context, 'remote');
            const method = methods.find(item => item.returnChallenge || item.deviceChallenge);
            if (!method) throw new Error('This tool has no supported browser sign-in method.');
            const problem = await presentHarnessChallenge(signIn.target.plugin, context, method, signIn.abort.signal, undefined, Boolean(signIn.target.plugin.setupApiKey), (prompt, submit) => {
                if (this.signIns.get(signIn.toolId) !== signIn || signIn.generation !== generation || signIn.abort.signal.aborted) return;
                signIn.prompt = { ...prompt, canGoBack: false, alternatives: prompt.alternatives?.filter(item => item.id === 'api-key') };
                if (signIn.prompt.kind === 'harness-login') signIn.loginPrompt = signIn.prompt;
                signIn.submit = submit;
            });
            if (problem) throw new Error(problem);
            if (signIn.generation !== generation || signIn.abort.signal.aborted) return;
            await this.verifyAndCommit(signIn, context);
        } catch (error) {
            if (!signIn.abort.signal.aborted && signIn.generation === generation) {
                const prompt = this.promptOf(signIn) ?? signIn.loginPrompt;
                if (prompt?.kind === 'harness-login') signIn.prompt = { ...prompt, id: randomUUID(), status: 'failed', diagnostic: safeDiagnostic(error instanceof Error ? error.message : 'Sign-in could not finish.', context, [...signIn.privateValues]), error: null };
                else if (signIn.target.plugin.setupApiKey) { signIn.method = 'api-key'; this.keyPrompt(signIn, 'Browser sign-in is unavailable. Retry with an API key or start a new account sign-in.'); }
                else { this.observations.set(signIn.toolId, observation(error instanceof Error ? error.message : 'Browser sign-in could not finish.', context)); this.discard(signIn); this.changed(signIn.toolId); }
            }
        } finally { if (signIn.generation === generation) { signIn.busy = false; signIn.submit = undefined; } }
    }

    /** Verify before persisting; cancelled, expired or revoked sessions cannot promote credentials. */
    private async verifyAndCommit(signIn: SignIn, context: HarnessContext, key?: string): Promise<void> {
        const generation = signIn.generation;
        signIn.prompt = undefined;
        const result = await (this.backend.verify ?? verifyHarness)(signIn.target.plugin, context, await signIn.target.plugin.inspect(context), 30_000);
        if (!this.current(signIn.toolId, signIn.id, signIn.actor) || generation !== signIn.generation || context.signal?.aborted) return;
        if (!result.call) throw new Error(safeDiagnostic(result.diagnostic, context, key ? [key] : []));
        await signIn.access.commitAiToolCredentials(signIn.actor, signIn.toolId, async () => {
            if (generation !== signIn.generation || context.signal?.aborted || this.signIns.get(signIn.toolId) !== signIn) throw new Error('The sign-in changed before verification finished.');
            await this.backend.commit(signIn.target, context, key);
        });
        signIn.done = true; signIn.prompt = undefined; signIn.submit = undefined;
        this.observations.set(signIn.toolId, { checkedAt: new Date().toISOString(), status: 'signed-in', problem: null });
        await signIn.access.recordAudit('ai-tool.sign-in.complete', signIn.actor, 'ai-tool', signIn.toolId, 'success', undefined, { method: signIn.method });
        this.changed(signIn.toolId);
    }

    /** Read only the initiating browser's current attempt. */
    public async read(id: string, signInId: string, actor: Actor): Promise<ContractResponse> { const signIn = this.current(id, signInId, actor); return signIn ? await this.signInView(signIn) : fail('not-found'); }

    /** Consumes prompt identity before awaiting provider I/O, preventing replay or concurrent credential promotion. */
    public async answer(id: string, signInId: string, actor: Actor, input: Readonly<Record<string, unknown>>): Promise<ContractResponse> {
        const signIn = this.current(id, signInId, actor);
        if (!signIn) return fail('not-found');
        if (!signIn.prompt || signIn.prompt.id !== input.promptId) return fail('ai-tool-sign-in-stale');
        if (input.action === 'alternative') {
            const method = input.alternativeId === 'api-key' ? 'api-key' : input.alternativeId === 'account' ? 'account' : undefined;
            if (!method || !this.methods(signIn.target).includes(method)) return fail('ai-tool-method-unsupported');
            return await this.restart(signIn, method);
        }
        const answer = input.answer as { kind: string; value?: string; returnCode?: string | null };
        if (answer.kind !== signIn.prompt.kind) return fail('ai-tool-sign-in-stale');
        if (answer.kind === 'secret') {
            const key = answer.value!;
            signIn.privateValues.add(key);
            const generation = ++signIn.generation;
            signIn.prompt = undefined; signIn.busy = true;
            const context = { ...this.backend.prepare(signIn.target, 'api-key', key), signal: signIn.abort.signal };
            try { await this.verifyAndCommit(signIn, context, key); }
            catch (error) { if (!context.signal.aborted && generation === signIn.generation) this.keyPrompt(signIn, safeDiagnostic(error instanceof Error ? error.message : 'The key was refused.', context, [...signIn.privateValues])); }
            finally { if (generation === signIn.generation) signIn.busy = false; }
        } else if (answer.returnCode === null) {
            return await this.restart(signIn, 'account');
        } else {
            const submit = signIn.submit;
            if (!submit) return fail('ai-tool-sign-in-stale');
            signIn.privateValues.add(answer.returnCode!);
            signIn.submit = undefined;
            if (signIn.prompt.kind === 'harness-login') signIn.prompt = { ...signIn.prompt, id: randomUUID(), status: 'verifying' };
            await submit(answer.returnCode!);
        }
        return this.current(id, signInId, actor) ? await this.signInView(signIn) : fail('not-found');
    }

    /** Cancelling keeps the previously verified credentials. */
    public async cancel(id: string, signInId: string, actor: Actor): Promise<ContractResponse> {
        const signIn = this.current(id, signInId, actor); if (!signIn) return fail('not-found');
        await signIn.access.commitAiToolCredentials(actor, id, async () => { this.discard(signIn); });
        return { kind: 'ok', data: null };
    }

    /** Removes only this project's reference/profile, never the OS user's shared account. */
    public async signOut(id: string, actor: Actor, access: AccessStore): Promise<ContractResponse> {
        const target = await this.target(id); if (!target) return fail('not-found');
        const attempt = this.signIns.get(id); if (attempt) this.discard(attempt);
        await access.commitAiToolCredentials(actor, id, () => this.backend.signOut(target));
        this.observations.set(id, { checkedAt: new Date().toISOString(), status: 'needs-sign-in', problem: { code: 'not-signed-in', message: 'This project is signed out.' } });
        await access.recordAudit('ai-tool.sign-out', actor, 'ai-tool', id); this.changed(id);
        return await this.get(id);
    }

    /** Releases native processes and unfinished private profiles when the service stops. */
    public async stop(): Promise<void> { this.unsubscribe?.(); this.abort.abort(); for (const signIn of this.signIns.values()) this.discard(signIn); await Promise.allSettled(this.checks.values()); }

}
