import colors from 'colors';
import { formatDurationMs } from '../../common/parseDuration';
import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import { waitUntilWorldTimeDeadline } from '../../common/waitUntilWorldTimeDeadline';
import type { PromptRunOptions } from '../types/PromptRunOptions';
import type { PromptRunResult } from '../types/PromptRunResult';
import type { PromptRunner } from '../types/PromptRunner';
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

/**
 * Polling interval used while waiting for Claude Code session limits to reset.
 */
const CLAUDE_CODE_SESSION_RESURRECTION_POLL_MS = 30 * 1000;

/**
 * Runs prompts via the Claude Code CLI.
 */
export class ClaudeCodeRunner implements PromptRunner {
    public readonly name = 'claude-code';

    /**
     * Creates a new Claude Code runner.
     */
    public constructor(private readonly options: ClaudeCodeRunnerOptions = {}) {}

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
}

/**
 * Waits until the Claude Code session can be resumed, keeping terminal status clear.
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
                `[claude-code] Session limit detected for ${sessionLimit.sessionId}. Resurrection #${resurrectionCount} will resume with --resume after ${formatDurationMs(delayMs)}. ${resetSummary}`,
            ),
        );
    }

    await waitUntilWorldTimeDeadline({
        deadlineTimeMs: resetDeadlineTimeMs,
        pollIntervalMs: CLAUDE_CODE_SESSION_RESURRECTION_POLL_MS,
        onTick: async (remainingDelayMs) => {
            await options.waitForPauseCheckpoint?.({
                checkpointLabel: 'the Claude Code session limit reset',
                phase: 'waiting',
                statusMessage: `Claude Code session ${sessionLabel} hit its limit; resurrection #${resurrectionCount} resumes in ${formatDurationMs(Math.min(remainingDelayMs, delayMs))}`,
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
