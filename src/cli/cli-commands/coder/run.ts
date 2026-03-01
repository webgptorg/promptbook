import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder run` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderRunCommand(program: Program): $side_effect {
    const command = program.command('run');
    command.description(
        spaceTrim(`
            Execute coding prompts through selected AI agent

            Runners:
            - openai-codex: OpenAI Codex integration (requires --model)
            - cline: Cline CLI integration
            - claude-code: Claude Code integration
            - opencode: Opencode integration
            - gemini: Google Gemini CLI integration (requires --model)

            Features:
            - Automatically stages and commits changes with agent identity
            - Supports GPG signing of commits
            - Progress tracking and interactive controls
            - Dry-run mode to preview prompts
        `),
    );

    command.option('--dry-run', 'Print unwritten prompts without executing', false);
    command.option(
        '--agent <agent-name>',
        'Select runner: openai-codex, cline, claude-code, opencode, gemini (required for non-dry-run)',
    );
    command.option(
        '--model <model>',
        spaceTrim(`
            Model to use (required for openai-codex and gemini)

            OpenAI examples: gpt-5.2-codex, default
            Gemini examples: gemini-3-flash-preview, default
        `),
    );
    command.option(
        '--priority <minimum-priority>',
        'Filter prompts by minimum priority level',
        parseIntOption,
        0,
    );
    command.option('--no-wait', 'Skip user prompts between processing', false);
    command.option('--ignore-git-changes', 'Skip clean working tree check before running prompts', false);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const {
                dryRun,
                agent,
                model,
                priority,
                wait,
                ignoreGitChanges,
            } = cliOptions as {
                readonly dryRun: boolean;
                readonly agent?: string;
                readonly model?: string;
                readonly priority: number;
                readonly wait: boolean;
                readonly ignoreGitChanges: boolean;
            };

            // Validate agent
            let agentName:
                | 'openai-codex'
                | 'cline'
                | 'claude-code'
                | 'opencode'
                | 'gemini'
                | undefined = undefined;

            if (agent) {
                if (
                    agent === 'openai-codex' ||
                    agent === 'cline' ||
                    agent === 'claude-code' ||
                    agent === 'opencode' ||
                    agent === 'gemini'
                ) {
                    agentName = agent;
                } else {
                    console.error(
                        colors.red(
                            `Invalid agent "${agent}". Must be one of: openai-codex, cline, claude-code, opencode, gemini`,
                        ),
                    );
                    return process.exit(1);
                }
            }

            if (!agentName && !dryRun) {
                console.error(
                    colors.red(
                        'You must choose an agent using --agent <openai-codex|cline|claude-code|opencode|gemini>',
                    ),
                );
                return process.exit(1);
            }

            // Convert commander options to RunOptions format
            const runOptions = {
                dryRun,
                waitForUser: wait,
                ignoreGitChanges,
                agentName,
                model,
                priority,
            };

            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { runCodexPrompts } = await import(
                '../../../../scripts/run-codex-prompts/main/runCodexPrompts'
            );

            try {
                // Override process.argv to pass options to the legacy parseRunOptions if needed
                await runCodexPrompts(runOptions);
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Parses an integer option value
 *
 * @private internal utility of `coder run` command
 */
function parseIntOption(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return parsed;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
