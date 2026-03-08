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
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
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
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            allowCredits: this.options.allowCredits,
            codexCommand: this.options.codexCommand,
        });

        while (true) {
            try {
                const output = await $runGoScriptUntilMarkerIdle({
                    scriptPath: options.scriptPath,
                    scriptContent,
                    completionLineMatcher: CODEX_COMPLETION_LINE,
                    idleTimeoutMs: CODEX_COMPLETION_IDLE_MS,
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

                await waitFor(delayMs);
            }
        }
    }
}
