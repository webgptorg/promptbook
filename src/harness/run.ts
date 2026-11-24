import { acquireInference, bindBridgeLease, type InferenceLease } from '../inference/admission.js';
import { registerConsumer } from '../inference/host.js';
import { runProcess } from '../common/process.js';
import { parseQuotaReset } from './quota-reset.js';
import type { HarnessEvent, HarnessPlugin, HarnessRunRequest, ParserState, UsageObservation } from './types.js';

/**
 * Terminal outcome of one harness invocation.
 *
 * @private harness execution
 */
export type HarnessOutcome = 'completed' | 'failed' | 'cancelled' | 'timed-out' | 'stalled' | 'authentication' | 'quota' | 'spawn-error';

/**
 * Observed result of one harness invocation.
 *
 * @private harness execution
 */
export type HarnessRunResult = {
    /** Terminal outcome. */
    readonly outcome: HarnessOutcome;
    /** Process exit code. */
    readonly exitCode: number | null;
    /** Final assistant message (empty when none). */
    readonly finalMessage: string;
    /** All assistant messages. */
    readonly messages: readonly string[];
    /** Effective model when reported. */
    readonly model?: string;
    /** Reported usage (merged view of the observations). */
    readonly usage?: Readonly<Record<string, number>>;
    /** Every usage observation in order, with its time and semantics (the raw evidence of {@link usage}). */
    readonly observations: readonly UsageObservation[];
    /** When the run started (ISO). */
    readonly startedAt: string;
    /** Reported cost. */
    readonly costUsd?: number;
    /** Session identifier. */
    readonly sessionId?: string;
    /** Errors reported by the harness. */
    readonly errors: readonly string[];
    /** Human diagnostic of the outcome. */
    readonly diagnostic: string;
    /** When the provider said an exhausted quota/rate limit resets (epoch ms), for a `quota` outcome that states it. */
    readonly quotaResetAt?: number;
    /** Raw stdout (bounded). */
    readonly stdout: string;
    /** Raw stderr (bounded). */
    readonly stderr: string;
    /** Duration. */
    readonly durationMs: number;
};

/**
 * Signals of exhausted quota / rate limits.
 */
const QUOTA_PATTERN = /usage limit|rate[ _-]?limit|quota|insufficient_quota|credit balance is too low|too many requests|\b429\b|exceeded your current|out of credits/i;

/**
 * Signals of missing or expired authentication.
 */
const AUTH_PATTERN = /not logged in|please (run )?(\/)?login|log ?in required|unauthori[sz]ed|\b401\b|invalid api key|authentication (failed|required)|oauth (?:session|token) (?:has )?expired|forbidden.*auth|no credentials/i;

/**
 * Output tails of a process silently waiting for terminal input it will never receive in unattended operation.
 */
const INPUT_PROMPT_PATTERN = /(\[y\/n\]|\(y\/n\)|\[yes\/no\]|press (enter|any key)|do you want to (proceed|continue|allow)|allow (this|once|always)\b|approve\b.*\?|password:|passphrase|continue\?)\s*$/i;

/**
 * Classifies a failure from the harness's own error output.
 *
 * @private harness execution
 */
export function classifyFailure(text: string): 'quota' | 'authentication' | undefined {
    if (QUOTA_PATTERN.test(text)) return 'quota';
    if (AUTH_PATTERN.test(text)) return 'authentication';
    return undefined;
}

/**
 * Runs a harness autonomously and normalizes its streamed output.
 *
 * Completion-looking text never overrides a failed process or turn.
 *
 * @private harness execution
 */
export async function runHarness(plugin: HarnessPlugin, request: HarnessRunRequest, executable: string): Promise<HarnessRunResult> {
    const invocation = await plugin.buildInvocation(request);
    const state: ParserState = { pendingText: '' };
    const messages: string[] = [];
    const errors: string[] = [];
    let turnFailed: string | undefined;
    let model: string | undefined;
    let usage: Record<string, number> | undefined;
    let costUsd: number | undefined;
    const observations: UsageObservation[] = [];
    let startedAt = new Date().toISOString();
    let sessionId: string | undefined;
    const handle = (event: HarnessEvent): void => {
        switch (event.type) {
            case 'message':
                if (event.text.trim()) messages.push(event.text);
                break;
            case 'model':
                model = event.model;
                break;
            case 'usage':
                usage = { ...(usage ?? {}), ...event.usage };
                if (event.costUsd !== undefined) costUsd = event.costUsd;
                observations.push({ at: new Date().toISOString(), usage: event.usage, ...(event.costUsd !== undefined ? { costUsd: event.costUsd } : {}), semantics: event.semantics ?? 'unknown' });
                break;
            case 'session':
                sessionId = event.id;
                break;
            case 'error':
                errors.push(event.text);
                break;
            case 'turn-failed':
                turnFailed = event.text;
                errors.push(event.text);
                break;
            default:
                break;
        }
        request.onEvent?.(event);
    };
    let result;
    const purpose = request.readOnly ? 'read-only turn' : 'turn';
    // A local run is an active consumer of the shared runtime service across engines (maintenance checks it); the
    // record goes away with the run, so idle sessions never hold the runtime.
    const releaseConsumer = request.localRoute
        ? await registerConsumer(request.env, { resourceKey: request.localRoute.resourceKey, project: request.projectRoot, tool: request.localRoute.connection, ...(request.model ? { model: request.model } : {}), purpose }).catch(() => undefined)
        : undefined;
    // Local inference is admitted against the runtime's actual capacity across engines; the wait is reported, and the
    // capacity is yielded while this turn waits for a bridged tool or nested consultation.
    let lease: InferenceLease | undefined;
    let unbind: (() => void) | undefined;
    if (request.localRoute) {
        const signals = [request.signal, request.interruptSignal].filter((signal): signal is AbortSignal => signal !== undefined);
        try {
            lease = await acquireInference(
                request.env,
                { runtime: request.localRoute.runtime, resourceKey: request.localRoute.resourceKey, project: request.projectRoot, tool: request.localRoute.connection, ...(request.model ? { model: request.model } : {}), ...(request.localRoute.model?.sizeBytes !== undefined ? { modelBytes: request.localRoute.model.sizeBytes } : {}), purpose },
                {
                    ...(signals.length ? { signal: AbortSignal.any(signals) } : {}),
                    onWait: (wait) => {
                        request.onAdmission?.(wait?.reason);
                        if (wait) request.onEvent?.({ type: 'activity', text: wait.reason });
                    },
                },
            );
        } catch (error) {
            await releaseConsumer?.().catch(() => undefined);
            await invocation.cleanup?.().catch(() => undefined);
            if (!signals.some((signal) => signal.aborted)) throw error;
            return { outcome: 'cancelled', exitCode: null, finalMessage: '', messages: [], observations: [], startedAt, errors: [], diagnostic: `${plugin.displayName} was cancelled while waiting for local inference capacity.`, stdout: '', stderr: '', durationMs: 0 };
        }
        startedAt = new Date().toISOString();
        if (request.mcp?.env.PTBK_BRIDGE_ADDRESS) unbind = bindBridgeLease(request.mcp.env.PTBK_BRIDGE_ADDRESS, lease);
    }
    try {
        result = await runProcess(executable, invocation.args, {
            cwd: request.cwd,
            env: invocation.env,
            input: invocation.input,
            timeoutMs: request.timeoutMs,
            signal: request.signal,
            interruptSignal: request.interruptSignal,
            stallTimeoutMs: request.stallTimeoutMs,
            inputPromptPattern: INPUT_PROMPT_PATTERN,
            onStdoutLine: (line) => {
                request.onOutput?.('stdout', line);
                for (const event of plugin.parseLine(line, state)) handle(event);
            },
            onStderrLine: (line) => request.onOutput?.('stderr', line),
        });
    } finally {
        unbind?.();
        await lease?.release().catch(() => undefined);
        await releaseConsumer?.().catch(() => undefined);
        await invocation.cleanup?.().catch(() => undefined);
    }
    if (state.pendingText) {
        handle({ type: 'message', text: state.pendingText });
        state.pendingText = '';
    }
    if (!messages.length && plugin.finalMessageFromOutput && result.exitCode === 0) {
        const text = plugin.finalMessageFromOutput(result.stdout);
        if (text.trim()) messages.push(text);
    }
    const finalMessage = messages[messages.length - 1] ?? '';
    const base = { exitCode: result.exitCode, finalMessage, messages, model, usage, observations, startedAt, costUsd, sessionId, errors, stdout: result.stdout, stderr: result.stderr, durationMs: result.durationMs };
    if (result.spawnError) return { ...base, outcome: 'spawn-error', diagnostic: `${plugin.displayName} could not be started: ${result.spawnError}` };
    if (result.cancelled) return { ...base, outcome: 'cancelled', diagnostic: `${plugin.displayName} was cancelled.` };
    if (result.timedOut) return { ...base, outcome: 'timed-out', diagnostic: `${plugin.displayName} exceeded its time limit and was stopped.` };
    if (result.stalled === 'input-prompt') {
        return { ...base, outcome: 'stalled', diagnostic: `${plugin.displayName} stopped producing output while apparently waiting for terminal input ("${result.stderr.trim().split('\n').pop() || result.stdout.trim().split('\n').pop() || '?'}"); unattended runs cannot answer hidden prompts, so it was stopped.` };
    }
    if (result.stalled === 'no-output') return { ...base, outcome: 'stalled', diagnostic: `${plugin.displayName} produced no output for ${Math.round((request.stallTimeoutMs ?? 0) / 60_000)} minutes and was stopped as stalled.` };
    const failureText = [turnFailed ?? '', ...errors, result.stderr.slice(-4000)].join('\n');
    if (result.exitCode !== 0 || turnFailed) {
        const classified = classifyFailure(failureText);
        const reason = (turnFailed ?? errors[errors.length - 1] ?? result.stderr.trim().split('\n').slice(-3).join(' ')) || `exit code ${String(result.exitCode)}`;
        if (classified === 'quota') {
            const quotaResetAt = parseQuotaReset(failureText);
            return { ...base, outcome: 'quota', diagnostic: `${plugin.displayName} reported a quota/rate limit: ${reason}`, ...(quotaResetAt ? { quotaResetAt } : {}) };
        }
        // A credential-free local connection has no login to repair: its refusal is an ordinary failure of that route.
        if (classified === 'authentication' && !request.localRoute) return { ...base, outcome: 'authentication', diagnostic: `${plugin.displayName} reported missing authentication: ${reason}` };
        if (request.localRoute) return { ...base, outcome: 'failed', diagnostic: `${plugin.displayName} failed through the local ${request.localRoute.runtime === 'LM_STUDIO' ? 'LM Studio' : 'Ollama'} connection ${request.localRoute.connection}: ${reason}` };
        return { ...base, outcome: 'failed', diagnostic: `${plugin.displayName} failed: ${reason}` };
    }
    return { ...base, outcome: 'completed', diagnostic: `${plugin.displayName} completed its turn.` };
}
