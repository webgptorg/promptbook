import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { executeAgentChatTurn } from './executeAgentChatTurn';

/**
 * Agent source used by `ptbk coder ping` for its disposable connectivity turn.
 */
const PING_AGENT_SOURCE = spaceTrim(`
    Promptbook Coder Ping Agent

    PERSONA You are a connectivity test agent. Perform only the tiny task requested by the user and answer concisely.
`);

/**
 * User message used by `ptbk coder ping` to produce a deterministic response.
 */
const PING_MESSAGE = 'Reply with exactly the single word PONG and nothing else.';

/**
 * Options for one `ptbk coder ping` execution.
 */
export type RunCoderPingOptions = {
    /**
     * Harness used for the disposable turn.
     */
    readonly agentName: PromptRunnerHarnessName;
    /**
     * Optional model passed to the harness.
     */
    readonly model?: string;
    /**
     * Optional reasoning effort passed to the harness.
     */
    readonly thinkingLevel?: ThinkingLevel;
    /**
     * Whether the harness should receive the shared no-UI option.
     */
    readonly isUiDisabled: boolean;
    /**
     * Whether the harness may spend credits when its quota is exhausted.
     */
    readonly isCreditsAllowed: boolean;
};

/**
 * Result of one `ptbk coder ping` execution.
 */
export type CoderPingResult = {
    /**
     * Text returned by the harness after the dummy task.
     */
    readonly result: string;
    /**
     * Time spent executing the disposable harness turn in milliseconds.
     */
    readonly elapsedTimeMs: number;
};

/**
 * Runs one small harness/model turn in a disposable temporary project.
 *
 * The temporary project is outside the caller's repository, so even a harness
 * that writes files cannot change the project from which `ptbk coder ping` was
 * started.
 */
export async function runCoderPing(options: RunCoderPingOptions): Promise<CoderPingResult> {
    const temporaryProjectPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-ping-'));
    const originalWorkingDirectory = process.cwd();

    try {
        const agentPath = join(temporaryProjectPath, 'ping.book');
        await writeFile(agentPath, `${PING_AGENT_SOURCE}\n`, 'utf-8');

        // Note: Some supported CLI wrappers inherit the Node process working directory instead of using projectPath.
        process.chdir(temporaryProjectPath);
        const startedAt = performance.now();
        const result = await executeAgentChatTurn({
            agentPath,
            currentWorkingDirectory: temporaryProjectPath,
            agentName: options.agentName,
            model: options.model,
            isVerbose: false,
            noUi: options.isUiDisabled,
            thinkingLevel: options.thinkingLevel,
            allowCredits: options.isCreditsAllowed,
            messages: [
                {
                    sender: 'USER',
                    content: PING_MESSAGE,
                },
            ],
        });

        return {
            result: result.answer,
            elapsedTimeMs: performance.now() - startedAt,
        };
    } finally {
        process.chdir(originalWorkingDirectory);
        await rm(temporaryProjectPath, { recursive: true, force: true });
    }
}
