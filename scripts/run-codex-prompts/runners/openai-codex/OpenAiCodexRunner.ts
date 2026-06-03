import colors from 'colors';
import { $runGoScriptUntilMarkerIdle } from '../../common/runGoScript/$runGoScriptUntilMarkerIdle';
import { ProgressiveBackoff } from '../../common/ProgressiveBackoff';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { buildCodexScript } from './buildCodexScript';
import { buildCodexUsageFromOutput } from './buildCodexUsageFromOutput';
import {
    buildCreditsDisallowedError,
    classifyCodexFailure,
    extractCodexFailureDetails,
    limitErrorDetails,
} from './CodexFailureHandling';
import type { OpenAiCodexRunnerOptions } from './OpenAiCodexRunnerOptions';

/**
 * Output line that marks finished Codex usage summary.
 */
const CODEX_COMPLETION_LINE = /^\s*tokens used\b/i;

/**
 * Idle timeout after completion marker to capture trailing output.
 */
const CODEX_COMPLETION_IDLE_MS = 60 * 1000;

/**
 * Number of seconds in one hour.
 */
const SECONDS_PER_HOUR = 60 * 60;

/**
 * Poll interval used while waiting for the next rate-limit retry so pause requests can be honored promptly.
 */
const RATE_LIMIT_BACKOFF_POLL_MS = 1000;

/**
 * Maximum delay between retries while rate-limited.
 */
const RATE_LIMIT_BACKOFF_MAX_MS = 30 * 60 * 1000;

/**
 * Randomized delay proportion added/subtracted for retry jitter.
 */
const RATE_LIMIT_BACKOFF_JITTER_RATIO = 0.15;

/**
 * Waits for one given amount of milliseconds.
 */
async function waitFor(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Formats a delay value into a concise `xh ym zs` style label.
 */
function formatDelay(delayMs: number): string {
    const totalSeconds = Math.max(0, Math.round(delayMs / 1000));
    const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0) {
        parts.push(`${minutes}m`);
    }
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Returns a short one-line version of the last Codex failure.
 */
function extractFailureSummary(details: string): string {
    const summary = limitErrorDetails(details, 300)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);

    return summary ?? 'Unknown rate-limit error';
}

/**
 * Runs prompts via the OpenAI Codex CLI.
 */
export class OpenAiCodexRunner implements PromptRunner {
    public readonly name = 'codex';
    private readonly rateLimitBackoff = new ProgressiveBackoff({
        maxDelayMs: RATE_LIMIT_BACKOFF_MAX_MS,
        jitterRatio: RATE_LIMIT_BACKOFF_JITTER_RATIO,
    });

    /**
     * Creates a new Codex runner.
     */
    public constructor(private readonly options: OpenAiCodexRunnerOptions) {}

    /**
     * Runs the Codex prompt in a temporary script and waits for completion output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildCodexScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            thinkingLevel: this.options.thinkingLevel,
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            allowCredits: this.options.allowCredits,
            codexCommand: this.options.codexCommand,
        });
        for (let retryIndex = 0; ; retryIndex++) {
            if (retryIndex > 0) {
                await options.waitForPauseCheckpoint?.({
                    checkpointLabel: 'retrying the OpenAI Codex model call after rate limit',
                    phase: 'running',
                    statusMessage: 'Retrying OpenAI Codex after rate limit',
                });
            }

            try {
                const output = await $runGoScriptUntilMarkerIdle({
                    scriptPath: options.scriptPath,
                    scriptContent,
                    completionLineMatcher: CODEX_COMPLETION_LINE,
                    idleTimeoutMs: CODEX_COMPLETION_IDLE_MS,
                    logPath: options.logPath,
                    preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
                });

                this.rateLimitBackoff.reset();
                return { usage: buildCodexUsageFromOutput(output, this.options.model) };
            } catch (error) {
                const details = extractCodexFailureDetails(error);
                const failureKind = classifyCodexFailure(details);

                if (failureKind === 'credits-required' && !this.options.allowCredits) {
                    throw buildCreditsDisallowedError(details);
                }

                if (failureKind !== 'rate-limit') {
                    throw error;
                }

                const delayMs = this.rateLimitBackoff.nextDelayMs();
                const retryAt = new Date(Date.now() + delayMs).toISOString();
                const retryIndex = this.rateLimitBackoff.retryCount;
                const summary = extractFailureSummary(details);

                console.warn(
                    colors.yellow(
                        `[codex] Rate limit/quota detected (${summary}). Retry #${retryIndex} in ${formatDelay(delayMs)} at ${retryAt}.`,
                    ),
                );

                await waitForRetryDelay(delayMs, options);
            }
        }
    }
}

/**
 * Waits for the next Codex retry while polling for requested pause checkpoints.
 */
async function waitForRetryDelay(delayMs: number, options: PromptRunOptions): Promise<void> {
    let remainingDelayMs = delayMs;

    while (remainingDelayMs > 0) {
        const remainingDelayLabel = formatDelay(remainingDelayMs);

        await options.waitForPauseCheckpoint?.({
            checkpointLabel: 'the next OpenAI Codex retry after rate limit',
            phase: 'running',
            statusMessage: `Waiting ${remainingDelayLabel} before retrying OpenAI Codex`,
        });

        const currentDelayMs = Math.min(RATE_LIMIT_BACKOFF_POLL_MS, remainingDelayMs);
        await waitFor(currentDelayMs);
        remainingDelayMs -= currentDelayMs;
    }
}
