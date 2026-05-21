import colors from 'colors';
import {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
    Option,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { ThinkingLevel } from '../coder/ThinkingLevel';
import { THINKING_LEVEL_VALUES } from '../coder/ThinkingLevel';

/**
 * Runner identifiers supported by Promptbook CLI agent orchestration commands.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPT_RUNNER_AGENT_NAMES = [
    'openai-codex',
    'github-copilot',
    'cline',
    'claude-code',
    'opencode',
    'gemini',
] as const;

/**
 * Runner identifier supported by Promptbook CLI agent orchestration commands.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptRunnerAgentName = (typeof PROMPT_RUNNER_AGENT_NAMES)[number];

/**
 * Commander option bag for shared runner flags.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptRunnerCliOptions = {
    readonly agent?: string;
    readonly model?: string;
    readonly ui: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly commit: boolean;
    readonly ignoreGitChanges: boolean;
    readonly allowCredits: boolean;
    readonly normalizeLineEndings: boolean;
    readonly autoPush: boolean;
    readonly autoPull: boolean;
};

/**
 * Normalized runner options used by runner-backed CLI commands.
 *
 * @private internal utility of `promptbookCli`
 */
export type NormalizedPromptRunnerCliOptions = {
    readonly agentName?: PromptRunnerAgentName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly noCommit: boolean;
    readonly ignoreGitChanges: boolean;
    readonly allowCredits: boolean;
    readonly normalizeLineEndings: boolean;
    readonly autoPush: boolean;
    readonly autoPull: boolean;
};

/**
 * Description block shared by runner-backed CLI commands.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPT_RUNNER_DESCRIPTION = spaceTrim(`
    Runners:
    - openai-codex: OpenAI Codex integration (requires --model)
    - github-copilot: GitHub Copilot CLI integration
    - cline: Cline CLI integration
    - claude-code: Claude Code integration
    - opencode: Opencode integration
    - gemini: Google Gemini CLI integration (requires --model)
`);

/**
 * Commander description for the `--agent` option.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPT_RUNNER_AGENT_OPTION_DESCRIPTION =
    'Select runner: openai-codex, github-copilot, cline, claude-code, opencode, gemini (required for non-dry-run)';

/**
 * Commander description for the `--model` option.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPT_RUNNER_MODEL_OPTION_DESCRIPTION = spaceTrim(`
    Model to use (required for openai-codex and gemini)

    OpenAI examples: gpt-5.2-codex, default
    Gemini examples: gemini-3-flash-preview, default
`);

/**
 * Registers runner selection flags on a command.
 *
 * @private internal utility of `promptbookCli`
 */
export function addPromptRunnerSelectionOptions(command: Program): void {
    command.option('--agent <agent-name>', PROMPT_RUNNER_AGENT_OPTION_DESCRIPTION);
    command.option('--model <model>', PROMPT_RUNNER_MODEL_OPTION_DESCRIPTION);
}

/**
 * Registers shared runner execution flags on a command.
 *
 * @private internal utility of `promptbookCli`
 */
export function addPromptRunnerExecutionOptions(command: Program): void {
    command.option(
        '--no-ui',
        'Disable the rich terminal UI and keep plain streaming console output for logging and debugging',
    );
    command.addOption(
        new Option(
            '--thinking-level <thinking-level>',
            `Set reasoning effort for supported runners (${THINKING_LEVEL_VALUES.join(', ')})`,
        ).choices([...THINKING_LEVEL_VALUES]),
    );
    command.option('--no-commit', 'Leave successful changes in the working directory instead of creating git commits');
    command.option('--ignore-git-changes', 'Skip clean working tree check before running prompts', false);
    command.option(
        '--allow-credits',
        'Allow OpenAI Codex runner to spend credits when rate limits are exhausted',
        false,
    );
    command.option(
        '--no-normalize-line-endings',
        'Disable automatic LF normalization for files changed in each coding round',
    );
    command.option('--auto-push', 'Automatically git push after each commit', false);
    command.option('--auto-pull', 'Automatically git pull before the first and each subsequent prompt', false);
}

/**
 * Converts Commander runner flags into normalized runner options.
 *
 * @private internal utility of `promptbookCli`
 */
export function normalizePromptRunnerCliOptions(
    cliOptions: PromptRunnerCliOptions,
    options: {
        readonly isAgentRequired: boolean;
    },
): NormalizedPromptRunnerCliOptions {
    return {
        agentName: resolvePromptRunnerAgentName(cliOptions.agent, options),
        model: cliOptions.model,
        noUi: !cliOptions.ui,
        thinkingLevel: cliOptions.thinkingLevel,
        noCommit: !cliOptions.commit,
        ignoreGitChanges: cliOptions.ignoreGitChanges,
        allowCredits: cliOptions.allowCredits,
        normalizeLineEndings: cliOptions.normalizeLineEndings,
        autoPush: cliOptions.autoPush,
        autoPull: cliOptions.autoPull,
    };
}

/**
 * Parses and validates one runner agent name.
 */
function resolvePromptRunnerAgentName(
    agent: string | undefined,
    options: {
        readonly isAgentRequired: boolean;
    },
): PromptRunnerAgentName | undefined {
    if (!agent) {
        if (!options.isAgentRequired) {
            return undefined;
        }

        throw new Error(
            colors.red(
                'You must choose an agent using --agent <openai-codex|github-copilot|cline|claude-code|opencode|gemini>',
            ),
        );
    }

    if (isPromptRunnerAgentName(agent)) {
        return agent;
    }

    throw new Error(colors.red(`Invalid agent "${agent}". Must be one of: ${PROMPT_RUNNER_AGENT_NAMES.join(', ')}`));
}

/**
 * Checks whether a string is one supported runner agent name.
 */
function isPromptRunnerAgentName(agent: string): agent is PromptRunnerAgentName {
    return PROMPT_RUNNER_AGENT_NAMES.includes(agent as PromptRunnerAgentName);
}

// Note: [🟡] Code for CLI runner options [promptRunnerCliOptions](src/cli/cli-commands/common/promptRunnerCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
