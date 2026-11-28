import { readFile } from 'fs/promises';
import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import type { PromptRunnerSelectionOptions } from '../main/resolvePromptRunner';
import { resolvePromptRunner } from '../main/resolvePromptRunner';
import { buildCoderPingPrompt, CODER_PING_EXPECTED_ANSWER } from './buildCoderPingPrompt';
import type { CoderPingResult } from './CoderPingResult';
import { extractCoderPingAnswer } from './extractCoderPingAnswer';

/**
 * Temporary subdirectory used for the `ptbk coder ping` runner shell script and its runtime log.
 */
const CODER_PING_SCRIPT_DIRECTORY_NAME = 'coder-ping';

/**
 * Base name of the temporary `ptbk coder ping` runner shell script.
 */
const CODER_PING_SCRIPT_SOURCE_NAME = 'ping';

/**
 * Options for one `ptbk coder ping` round trip.
 */
export type PingCoderHarnessOptions = PromptRunnerSelectionOptions & {
    /**
     * Project the harness is started in. Defaults to the current working directory.
     */
    readonly projectPath?: string;

    /**
     * Mirrors the live harness output to the terminal instead of only reporting the compact result.
     */
    readonly shouldPrintLiveOutput?: boolean;
};

/**
 * Sends one tiny dummy prompt through the selected harness and model and measures the round trip.
 *
 * The ping reuses the very same runner the coding queue uses, so it really exercises the configured
 * harness, model, thinking level and authentication — including the retry behavior on rate limits.
 * Both temporary artifacts it creates are removed again, so the project is left as it was.
 */
export async function pingCoderHarness(options: PingCoderHarnessOptions): Promise<CoderPingResult> {
    const projectPath = options.projectPath || process.cwd();
    const { runner, runnerMetadata } = resolvePromptRunner(options);
    const scriptPath = buildTemporaryPromptScriptPath({
        projectPath,
        scriptDirectoryName: CODER_PING_SCRIPT_DIRECTORY_NAME,
        sourceFileName: CODER_PING_SCRIPT_SOURCE_NAME,
    });
    const startedTimeMs = Date.now();

    const { answer, usage, loginMethod } = await withPromptRuntimeLog(
        scriptPath,
        async (logPath) => {
            const result = await runner.runPrompt({
                prompt: buildCoderPingPrompt(),
                scriptPath,
                projectPath,
                logPath,
                shouldPrintLiveOutput: options.shouldPrintLiveOutput ?? false,
                preserveArtifactsOnSuccess: false,
            });

            return { ...result, answer: extractCoderPingAnswer(await readRuntimeLog(logPath)) };
        },
        { preserveArtifactsOnSuccess: false },
    );

    return {
        runnerName: runnerMetadata.runnerName,
        modelName: runnerMetadata.modelName,
        thinkingLevel: options.thinkingLevel,
        answer,
        isAnswerCorrect: answer === CODER_PING_EXPECTED_ANSWER,
        durationMs: Date.now() - startedTimeMs,
        usage,
        loginMethod,
    };
}

/**
 * Reads the runtime log of the finished ping, treating an unreadable log as no output at all.
 */
async function readRuntimeLog(logPath: string): Promise<string> {
    return await readFile(logPath, 'utf-8').catch(() => '');
}
