import colors from 'colors';
import { getHarnessDefinition } from '../../../src/cli/cli-commands/common/harness/HarnessDefinition';
import { HARNESS_DEFAULT_MODELS } from '../../../src/cli/cli-commands/common/harness/HARNESS_DEFAULT_MODELS';
import type { PromptRunnerHarnessName } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { RunOptions } from '../cli/RunOptions';
import type { PromptRunnerMetadata } from '../common/PromptRunnerMetadata';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { createAuthenticationAwarePromptRunner } from '../runners/common/createAuthenticationAwarePromptRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { GeminiRunner } from '../runners/gemini/GeminiRunner';
import { GitHubCopilotRunner } from '../runners/github-copilot/GitHubCopilotRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import { QwenCodeRunner } from '../runners/qwen-code/QwenCodeRunner';
import type { PromptRunner } from '../runners/types/PromptRunner';

/**
 * Value of `--model` which asks for the default model of the selected harness instead of naming one.
 */
const DEFAULT_MODEL_NAME = 'default';

/**
 * Subset of `RunOptions` which decides which prompt runner is created and how it is labeled.
 *
 * Commands that only need one configured harness — such as `ptbk coder ping` — pass just these
 * fields instead of assembling a complete `RunOptions` for a run they never start.
 */
export type PromptRunnerSelectionOptions = Pick<
    RunOptions,
    'agentName' | 'model' | 'thinkingLevel' | 'allowCredits' | 'isVerbose' | 'isMachineReadableProgressEnabled'
>;

/**
 * Resolved runner setup used by `runCodexPrompts`.
 */
type PromptRunnerResolution = {
    runner: PromptRunner;
    actualRunnerModel?: string;

    /**
     * Harness half of the run metadata; the optional Book agent is added by the caller which resolves it.
     */
    runnerMetadata: PromptRunnerMetadata;
};

/**
 * Resolves the configured prompt runner together with status-line metadata.
 *
 * @private function of runCodexPrompts
 */
export function resolvePromptRunner(options: PromptRunnerSelectionOptions): PromptRunnerResolution {
    const agentName = options.agentName;

    if (!agentName) {
        throw new Error('Missing --harness in non-dry run mode');
    }

    const resolution = resolveHarnessPromptRunner(agentName, options);

    return {
        ...resolution,
        // Note: Every harness is wrapped here, so a harness which is not logged in is reported the same clear
        //       way no matter which harness it is and which command has resolved the runner
        runner: createAuthenticationAwarePromptRunner(resolution.runner, agentName),
    };
}

/**
 * Creates the runner of one selected harness together with its status-line metadata.
 */
function resolveHarnessPromptRunner(
    agentName: PromptRunnerHarnessName,
    options: PromptRunnerSelectionOptions,
): PromptRunnerResolution {
    const actualRunnerModel = resolveRunnerModel(agentName, options.model);

    if (agentName === 'openai-codex') {
        return createOpenAiCodexRunnerResolution(options, actualRunnerModel);
    }

    if (agentName === 'cline') {
        return createRunnerResolution(
            options,
            new ClineRunner({ model: actualRunnerModel ?? HARNESS_DEFAULT_MODELS.cline }),
            actualRunnerModel,
        );
    }

    if (agentName === 'github-copilot') {
        return createRunnerResolution(
            options,
            new GitHubCopilotRunner({
                model: actualRunnerModel,
                thinkingLevel: options.thinkingLevel,
            }),
            actualRunnerModel,
        );
    }

    if (agentName === 'claude-code') {
        return createRunnerResolution(
            options,
            new ClaudeCodeRunner({
                model: actualRunnerModel,
                thinkingLevel: options.thinkingLevel,
            }),
            actualRunnerModel,
        );
    }

    if (agentName === 'opencode') {
        return createRunnerResolution(
            options,
            new OpencodeRunner({
                model: actualRunnerModel,
            }),
            actualRunnerModel,
        );
    }

    if (agentName === 'gemini') {
        return createRunnerResolution(
            options,
            new GeminiRunner({ model: actualRunnerModel ?? HARNESS_DEFAULT_MODELS.gemini }),
            actualRunnerModel,
        );
    }

    if (agentName === 'qwen-code') {
        return createRunnerResolution(
            options,
            new QwenCodeRunner({ model: actualRunnerModel ?? HARNESS_DEFAULT_MODELS['qwen-code'] }),
            actualRunnerModel,
        );
    }

    throw new Error(`Unknown harness: ${agentName}`);
}

/**
 * Builds the OpenAI Codex runner resolution with its credit-spending policy.
 */
function createOpenAiCodexRunnerResolution(
    options: PromptRunnerSelectionOptions,
    actualRunnerModel: string | undefined,
): PromptRunnerResolution {
    const runner = new OpenAiCodexRunner({
        codexCommand: 'codex',
        model: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        sandbox: 'danger-full-access',
        askForApproval: 'never',
        allowCredits: options.allowCredits,
        isMachineReadableProgressEnabled: options.isMachineReadableProgressEnabled,
    });

    if (!options.allowCredits && options.isVerbose === true) {
        console.info(
            colors.gray('OpenAI Codex credit spending is disabled. Use `--allow-credits` to explicitly opt in.'),
        );
    }

    return createRunnerResolution(options, runner, actualRunnerModel);
}

/**
 * Combines the instantiated runner with prompt status metadata.
 */
function createRunnerResolution(
    options: PromptRunnerSelectionOptions,
    runner: PromptRunner,
    actualRunnerModel?: string,
): PromptRunnerResolution {
    return {
        runner,
        actualRunnerModel,
        runnerMetadata: {
            runnerName: options.agentName ? getHarnessDefinition(options.agentName).label : 'unknown',
            modelName: actualRunnerModel,
        },
    };
}

/**
 * Uses the current flagship when no model is selected, while preserving explicit overrides.
 *
 * `--model default` keeps the harness's own configured model where supported. Gemini, Qwen and Cline
 * require a concrete model in their adapters, so the sentinel selects their shared default instead.
 */
function resolveRunnerModel(agentName: PromptRunnerHarnessName, providedModel?: string): string | undefined {
    if (providedModel === DEFAULT_MODEL_NAME) {
        if (agentName === 'gemini' || agentName === 'qwen-code' || agentName === 'cline') {
            return HARNESS_DEFAULT_MODELS[agentName];
        }

        return undefined;
    }

    return providedModel || HARNESS_DEFAULT_MODELS[agentName];
}
