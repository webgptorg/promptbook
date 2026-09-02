import colors from 'colors';
import { getHarnessDefinition } from '../../../src/cli/cli-commands/common/harness/HarnessDefinition';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import type { RunOptions } from '../cli/RunOptions';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { DEFAULT_GEMINI_MODEL, GeminiRunner } from '../runners/gemini/GeminiRunner';
import { GitHubCopilotRunner } from '../runners/github-copilot/GitHubCopilotRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import { DEFAULT_QWEN_CODE_MODEL, QwenCodeRunner } from '../runners/qwen-code/QwenCodeRunner';
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
 * Harnesses which refuse to run without an explicit `--model`, because they expose many models
 * of very different capability and price and never pick a sensible one on their own.
 */
const MODEL_REQUIRING_HARNESS_NAMES = ['openai-codex', 'gemini', 'qwen-code'] as const;

/**
 * Harness which refuses to run without an explicit `--model`.
 */
type ModelRequiringHarnessName = (typeof MODEL_REQUIRING_HARNESS_NAMES)[number];

/**
 * Runner metadata used in prompt status lines.
 */
type RunnerMetadata = {
    runnerName: string;
    modelName?: string;
};

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
    runnerMetadata: RunnerMetadata;
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
        return createRunnerResolution(
            options,
            new ClaudeCodeRunner({
                model: options.model,
                thinkingLevel: options.thinkingLevel,
            }),
            options.model,
        );
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

    if (agentName === 'qwen-code') {
        return createQwenCodeRunnerResolution(options);
    }

    throw new Error(`Unknown harness: ${agentName}`);
}

/**
 * Builds the OpenAI Codex runner resolution, including required-model validation.
 */
function createOpenAiCodexRunnerResolution(options: PromptRunnerSelectionOptions): PromptRunnerResolution {
    const actualRunnerModel = resolveRequiredModel({
        agentName: 'openai-codex',
        providedModel: options.model,
        defaultModel: DEFAULT_CODEX_MODEL,
        availableModels: OPENAI_MODELS.filter((model) => model.modelVariant === 'CHAT').map((model) => model.modelName),
        exampleUsages: ['--harness openai-codex --model gpt-5.2-codex', '--harness openai-codex --model default'],
    });
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
 * Builds the Gemini CLI runner resolution, including required-model validation.
 */
function createGeminiRunnerResolution(options: PromptRunnerSelectionOptions): PromptRunnerResolution {
    const actualRunnerModel = resolveRequiredModel({
        agentName: 'gemini',
        providedModel: options.model,
        defaultModel: DEFAULT_GEMINI_MODEL,
        exampleUsages: [`--harness gemini --model ${DEFAULT_GEMINI_MODEL}`, '--harness gemini --model default'],
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
 * Builds the Qwen Code CLI runner resolution, including required-model validation.
 */
function createQwenCodeRunnerResolution(options: PromptRunnerSelectionOptions): PromptRunnerResolution {
    const actualRunnerModel = resolveRequiredModel({
        agentName: 'qwen-code',
        providedModel: options.model,
        defaultModel: DEFAULT_QWEN_CODE_MODEL,
        exampleUsages: [
            `--harness qwen-code --model ${DEFAULT_QWEN_CODE_MODEL}`,
            '--harness qwen-code --model default',
        ],
    });

    return createRunnerResolution(
        options,
        new QwenCodeRunner({
            model: actualRunnerModel,
        }),
        actualRunnerModel,
    );
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
        runnerMetadata: getRunnerMetadata(options, actualRunnerModel),
    };
}

/**
 * Resolves runner metadata for prompt status lines.
 */
function getRunnerMetadata(options: PromptRunnerSelectionOptions, actualRunnerModel?: string): RunnerMetadata {
    const runnerName = options.agentName ? getHarnessDefinition(options.agentName).label : 'unknown';

    if (options.agentName === 'github-copilot' || isModelRequiringHarnessName(options.agentName)) {
        return { runnerName, modelName: actualRunnerModel };
    }

    if (options.agentName === 'cline') {
        return { runnerName, modelName: CLINE_MODEL };
    }

    if (options.agentName === 'opencode' || options.agentName === 'claude-code') {
        return { runnerName, modelName: options.model };
    }

    return { runnerName };
}

/**
 * Checks whether one harness refuses to run without an explicit `--model`.
 */
function isModelRequiringHarnessName(agentName?: string): agentName is ModelRequiringHarnessName {
    return MODEL_REQUIRING_HARNESS_NAMES.includes(agentName as ModelRequiringHarnessName);
}

/**
 * Resolves a runner model, allowing `default` but otherwise requiring an explicit value.
 */
function resolveRequiredModel(options: {
    agentName: ModelRequiringHarnessName;
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
    agentName: ModelRequiringHarnessName,
    availableModels: ReadonlyArray<string> | undefined,
    exampleUsages: ReadonlyArray<string>,
): never {
    console.error(colors.red(`Error: --model is required when using --harness ${agentName}`));
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
