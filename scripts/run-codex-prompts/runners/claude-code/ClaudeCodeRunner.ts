import colors from 'colors';
import { formatDurationMs } from '../../common/parseDuration';
import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import { waitForSkippableWorldTimeDeadline } from '../../common/waitForSkippableWorldTimeDeadline';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
import { mergeHarnessSubscriptionUsage, type HarnessSubscriptionUsage } from '../types/HarnessSubscriptionUsage';
import { buildClaudeScript } from './buildClaudeScript';
import {
    buildClaudeCodeSessionResurrectionPrompt,
    extractClaudeCodeSessionLimitFromError,
    extractClaudeCodeSessionLimitFromOutput,
    formatClaudeCodeSessionLimitForDisplay,
    getClaudeCodeSessionLimitDelayMs,
    type ClaudeCodeSessionLimit,
} from './ClaudeCodeSessionResurrection';
import type { ClaudeCodeRunnerOptions } from './ClaudeCodeRunnerOptions';
import { parseClaudeCodeJsonOutput } from './parseClaudeCodeJsonOutput';
import { parseClaudeCodeSubscriptionUsage } from './parseClaudeCodeSubscriptionUsage';

/**
 * Polling interval used while waiting for Claude Code session limits to reset.
 */
const CLAUDE_CODE_SESSION_RESURRECTION_POLL_MS = 30 * 1000;

/**
 * Runs prompts via the Claude Code CLI.
 */
export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';
    private subscriptionUsage: HarnessSubscriptionUsage | undefined;

    /**
     * Creates a new Claude Code runner.
     */
    public constructor(private readonly options: ClaudeCodeRunnerOptions = {}) {}

    /**
     * Returns the latest subscription-limit snapshot emitted by this Claude Code session.
     *
     * Claude exposes these values in the normal stream after a response, so no separate quota-only model call is made.
     */
    public async getSubscriptionUsage(): Promise<HarnessSubscriptionUsage | undefined> {
        return this.subscriptionUsage;
    }

    /**
     * Runs the prompt using Claude Code and parses usage output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        let resumeSessionId: string | undefined;
        let prompt = options.prompt;
        let resurrectionCount = 0;

        while (true) {
            const output = await this.runClaudeCodeOnce({
                ...options,
                prompt,
                resumeSessionId,
            }).catch(async (error) => {
                this.updateSubscriptionUsage(error instanceof Error ? error.message : String(error));
                const sessionLimit = extractClaudeCodeSessionLimitFromError(error);

                if (!sessionLimit) {
                    throw error;
                }

                resurrectionCount++;
                await waitForClaudeCodeSessionLimitReset(sessionLimit, resurrectionCount, options);
                resumeSessionId = sessionLimit.sessionId;
                prompt = buildClaudeCodeSessionResurrectionPrompt(options.prompt, sessionLimit.sessionId);
                return undefined;
            });

            if (output === undefined) {
                continue;
            }

            const sessionLimit = extractClaudeCodeSessionLimitFromOutput(output);

            this.updateSubscriptionUsage(output);

            if (sessionLimit) {
                resurrectionCount++;
                await waitForClaudeCodeSessionLimitReset(sessionLimit, resurrectionCount, options);
                resumeSessionId = sessionLimit.sessionId;
                prompt = buildClaudeCodeSessionResurrectionPrompt(options.prompt, sessionLimit.sessionId);
                continue;
            }

            const usage = parseClaudeCodeJsonOutput(output);

            return { usage };
        }
    }

    /**
     * Runs one Claude Code CLI process and returns its raw output.
     */
    private async runClaudeCodeOnce(
        options: PromptRunOptions & {
            readonly resumeSessionId?: string;
        },
    ): Promise<string> {
        const scriptContent = buildClaudeScript({
            prompt: options.prompt,
            model: this.options.model,
            thinkingLevel: this.options.thinkingLevel,
            resumeSessionId: options.resumeSessionId,
        });

        return await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            scriptContent,
            logPath: options.logPath,
            shouldPrintLiveOutput: options.shouldPrintLiveOutput,
            preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
        });
    }

    /**
     * Keeps the newest usable Claude subscription-limit values reported by the stream.
     *
     * A stream can omit these values for API-key users or unsupported plan types; retaining the prior snapshot avoids
     * a temporary omission erasing a still-valid dashboard value while a long queue is running.
     */
    private updateSubscriptionUsage(output: string): void {
        const subscriptionUsage = parseClaudeCodeSubscriptionUsage(output);

        if (subscriptionUsage) {
            this.subscriptionUsage = mergeHarnessSubscriptionUsage(this.subscriptionUsage, subscriptionUsage);
        }
    }
}

/**
 * Waits until the Claude Code session can be resumed, keeping terminal status clear.
 *
 * The wait runs in the `waiting` phase, where the terminal UI offers `S  Skip current waiting`, so it is
 * a skippable wait: pressing `S` resumes the session with `--resume` immediately instead of sitting out
 * the reset window.
 */
async function waitForClaudeCodeSessionLimitReset(
    sessionLimit: ClaudeCodeSessionLimit,
    resurrectionCount: number,
    options: PromptRunOptions,
): Promise<void> {
    const delayMs = getClaudeCodeSessionLimitDelayMs(sessionLimit);
    const resetDeadlineTimeMs = Date.now() + delayMs;
    const sessionLabel = formatClaudeCodeSessionIdForDisplay(sessionLimit.sessionId);
    const resetSummary = formatClaudeCodeSessionLimitForDisplay(sessionLimit);

    if (options.shouldPrintLiveOutput ?? true) {
        console.warn(
            colors.yellow(
                `[claude-code] Session limit detected for ${
                    sessionLimit.sessionId
                }. Resurrection #${resurrectionCount} will resume with --resume after ${formatDurationMs(
                    delayMs,
                )}. ${resetSummary}`,
            ),
        );
    }

    await waitForSkippableWorldTimeDeadline({
        deadlineTimeMs: resetDeadlineTimeMs,
        pollIntervalMs: CLAUDE_CODE_SESSION_RESURRECTION_POLL_MS,
        onTick: async (remainingDelayMs) => {
            await options.waitForPauseCheckpoint?.({
                checkpointLabel: 'the Claude Code session limit reset',
                phase: 'waiting',
                statusMessage: `Claude Code session ${sessionLabel} hit its limit; resurrection #${resurrectionCount} resumes in ${formatDurationMs(
                    Math.min(remainingDelayMs, delayMs),
                )}`,
            });
        },
    });

    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'resurrecting the Claude Code session with --resume',
        phase: 'running',
        statusMessage: `Resurrecting Claude Code session ${sessionLabel} with --resume`,
    });
}

/**
 * Formats a Claude Code session id for compact terminal status lines.
 */
function formatClaudeCodeSessionIdForDisplay(sessionId: string): string {
    if (sessionId.length <= 8) {
        return sessionId;
    }

    return `${sessionId.slice(0, 8)}...`;
}
