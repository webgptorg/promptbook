import colors from 'colors';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import type { RunOptions } from '../cli/RunOptions';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { DEFAULT_GEMINI_MODEL, GeminiRunner } from '../runners/gemini/GeminiRunner';
import { GitHubCopilotRunner } from '../runners/github-copilot/GitHubCopilotRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import type { PromptRunner } from '../runners/types/PromptRunner';

/**
 * Constant for default codex model.
 */
const DEFAULT_CODEX_MODEL = 'gpt-5.2-codex';

/**
 * Constant for cline model.
 */
const CLINE_MODEL = 'gemini:gemini-3-flash-preview';

/**
 * Type describing runner agent name.
 */
type RunnerAgentName = NonNullable<RunOptions['agentName']>;

/**
 * Map of runner labels.
 */
const RUNNER_LABELS: Record<RunnerAgentName, string> = {
    'openai-codex': 'OpenAI Codex',
    'github-copilot': 'GitHub Copilot',
    cline: 'Cline',
    'claude-code': 'Claude Code',
    opencode: 'Opencode',
    gemini: 'Gemini CLI',
};

/**
 * Runner metadata used in prompt status lines.
 */
type RunnerMetadata = {
    runnerName: string;
    modelName?: string;
};

/**
 * Resolved runner setup used by `runCodexPrompts`.
 */
type PromptRunnerResolution = {
    runner: PromptRunner;
    actualRunnerModel?: string;
    runnerMetadata: RunnerMetadata;
};

/**
 * Resolves the configured prompt runner together with status-line metadata.
 *
 * @private function of runCodexPrompts
 */
export function resolvePromptRunner(options: RunOptions): PromptRunnerResolution {
    const agentName = options.agentName;

    if (!agentName) {
        throw new Error('Missing --agent in non-dry run mode');
    }

    if (agentName === 'openai-codex') {
        return createOpenAiCodexRunnerResolution(options);
    }

    if (agentName === 'cline') {
        return createRunnerResolution(options, new ClineRunner({ model: CLINE_MODEL }));
    }

    if (agentName === 'github-copilot') {
        const actualRunnerModel = options.model === 'default' ? undefined : options.model;

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
        return createRunnerResolution(options, new ClaudeCodeRunner());
    }

    if (agentName === 'opencode') {
        return createRunnerResolution(
            options,
            new OpencodeRunner({
                model: options.model,
            }),
            options.model,
        );
    }

    if (agentName === 'gemini') {
        return createGeminiRunnerResolution(options);
    }

    throw new Error(`Unknown agent: ${agentName}`);
}

/**
 * Builds the OpenAI Codex runner resolution, including required-model validation.
 */
function createOpenAiCodexRunnerResolution(options: RunOptions): PromptRunnerResolution {
    const actualRunnerModel = resolveRequiredModel({
        agentName: 'openai-codex',
        providedModel: options.model,
        defaultModel: DEFAULT_CODEX_MODEL,
        availableModels: OPENAI_MODELS.filter((model) => model.modelVariant === 'CHAT').map((model) => model.modelName),
        exampleUsages: ['--agent openai-codex --model gpt-5.2-codex', '--agent openai-codex --model default'],
    });
    const runner = new OpenAiCodexRunner({
        codexCommand: 'codex',
        model: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        sandbox: 'danger-full-access',
        askForApproval: 'never',
        allowCredits: options.allowCredits,
    });

    if (!options.allowCredits) {
        console.info(
            colors.gray('OpenAI Codex credit spending is disabled. Use `--allow-credits` to explicitly opt in.'),
        );
    }

    return createRunnerResolution(options, runner, actualRunnerModel);
}

/**
 * Builds the Gemini CLI runner resolution, including required-model validation.
 */
function createGeminiRunnerResolution(options: RunOptions): PromptRunnerResolution {
    const actualRunnerModel = resolveRequiredModel({
        agentName: 'gemini',
        providedModel: options.model,
        defaultModel: DEFAULT_GEMINI_MODEL,
        exampleUsages: [`--agent gemini --model ${DEFAULT_GEMINI_MODEL}`, '--agent gemini --model default'],
    });

    return createRunnerResolution(
        options,
        new GeminiRunner({
            model: actualRunnerModel,
        }),
        actualRunnerModel,
    );
}

/**
 * Combines the instantiated runner with prompt status metadata.
 */
function createRunnerResolution(
    options: RunOptions,
    runner: PromptRunner,
    actualRunnerModel?: string,
): PromptRunnerResolution {
    return {
        runner,
        actualRunnerModel,
        runnerMetadata: getRunnerMetadata(options, actualRunnerModel),
    };
}

/**
 * Resolves runner metadata for prompt status lines.
 */
function getRunnerMetadata(options: RunOptions, actualRunnerModel?: string): RunnerMetadata {
    const runnerName = options.agentName ? RUNNER_LABELS[options.agentName] ?? 'unknown' : 'unknown';

    if (
        options.agentName === 'openai-codex' ||
        options.agentName === 'github-copilot' ||
        options.agentName === 'gemini'
    ) {
        return { runnerName, modelName: actualRunnerModel };
    }

    if (options.agentName === 'cline') {
        return { runnerName, modelName: CLINE_MODEL };
    }

    if (options.agentName === 'opencode') {
        return { runnerName, modelName: options.model };
    }

    return { runnerName };
}

/**
 * Resolves a runner model, allowing `default` but otherwise requiring an explicit value.
 */
function resolveRequiredModel(options: {
    agentName: 'openai-codex' | 'gemini';
    providedModel?: string;
    defaultModel: string;
    availableModels?: ReadonlyArray<string>;
    exampleUsages: ReadonlyArray<string>;
}): string {
    if (!options.providedModel) {
        exitForMissingModel(options.agentName, options.availableModels, options.exampleUsages);
    }

    if (options.providedModel === 'default') {
        return options.defaultModel;
    }

    return options.providedModel;
}

/**
 * Prints the missing-model guidance and exits with the historical non-zero status code.
 */
function exitForMissingModel(
    agentName: 'openai-codex' | 'gemini',
    availableModels: ReadonlyArray<string> | undefined,
    exampleUsages: ReadonlyArray<string>,
): never {
    console.error(colors.red(`Error: --model is required when using --agent ${agentName}`));
    console.error('');

    if (availableModels && availableModels.length > 0) {
        console.error(colors.cyan('Available models:'));
        for (const model of availableModels) {
            console.error(colors.gray(`  - ${model}`));
        }
        console.error('');
    }

    console.error(colors.cyan('Example usage:'));
    for (const exampleUsage of exampleUsages) {
        console.error(colors.gray(`  ${exampleUsage}`));
    }

    process.exit(1);
}
