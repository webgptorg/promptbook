import colors from 'colors';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import { THINKING_LEVEL_VALUES, parseThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { RunOptions } from './RunOptions';

/**
 * CLI usage text for this script.
 */
const USAGE =
    'Usage: run-codex-prompts [--dry-run] [--agent <agent-name>] [--model <model>] [--context <context-or-file>] [--test <test-command...>] [--thinking-level <thinking-level>] [--priority <minimum-priority>] [--allow-credits] [--auto-migrate] [--allow-destructive-auto-migrate] [--no-wait] [--ignore-git-changes] [--no-normalize-line-endings] [--auto-push]';

/**
 * Top-level flags supported by this command.
 */
const KNOWN_OPTION_FLAGS = new Set([
    '--dry-run',
    '--agent',
    '--model',
    '--context',
    '--test',
    '--thinking-level',
    '--priority',
    '--allow-credits',
    '--auto-migrate',
    '--allow-destructive-auto-migrate',
    '--no-wait',
    '--ignore-git-changes',
    '--no-normalize-line-endings',
    '--auto-push',
]);

/**
 * Parses CLI arguments into runner options.
 */
export function parseRunOptions(args: string[]): RunOptions {
    let agentName: 'openai-codex' | 'github-copilot' | 'cline' | 'claude-code' | 'opencode' | 'gemini' | undefined =
        undefined;
    const dryRun = args.includes('--dry-run');

    const agentValue = readOptionValue(args, '--agent');
    if (agentValue) {
        const value = agentValue;
        if (
            value === 'openai-codex' ||
            value === 'github-copilot' ||
            value === 'cline' ||
            value === 'claude-code' ||
            value === 'opencode' ||
            value === 'gemini'
        ) {
            agentName = value;
        }
    }

    const model = readOptionValue(args, '--model');
    const context = readOptionValue(args, '--context');
    const hasTestCommandFlag = args.includes('--test');
    const testCommand = readVariadicOptionValue(args, '--test');
    const hasThinkingLevelFlag = args.includes('--thinking-level');
    const thinkingLevelValue = readOptionValue(args, '--thinking-level');
    const hasPriorityFlag = args.includes('--priority');
    const priority = parsePriority(readOptionValue(args, '--priority'), hasPriorityFlag);
    const ignoreGitChanges = args.includes('--ignore-git-changes');
    const normalizeLineEndings = !args.includes('--no-normalize-line-endings');
    const allowCredits = args.includes('--allow-credits');
    const autoMigrate = args.includes('--auto-migrate');
    const allowDestructiveAutoMigrate = args.includes('--allow-destructive-auto-migrate');
    const autoPush = args.includes('--auto-push');
    let thinkingLevel: ThinkingLevel | undefined;

    if (hasTestCommandFlag && testCommand === undefined) {
        exitWithUsageError(
            'Missing value for --test. Use a shell command such as `npm run test` and quote it when it contains top-level CLI flags.',
        );
    }

    if (hasThinkingLevelFlag && thinkingLevelValue === undefined) {
        exitWithUsageError(
            `Missing value for --thinking-level. Use one of: ${THINKING_LEVEL_VALUES.join(', ')}.`,
        );
    }

    try {
        thinkingLevel = parseThinkingLevel(thinkingLevelValue);
    } catch (error) {
        exitWithUsageError(error instanceof Error ? error.message : String(error));
    }

    if (!agentName && !dryRun) {
        exitWithUsageError(
            'You must choose an agent using --agent <openai-codex|github-copilot|cline|claude-code|opencode|gemini>',
        );
    }

    return {
        dryRun,
        waitForUser: !args.includes('--no-wait'),
        ignoreGitChanges,
        normalizeLineEndings,
        allowCredits,
        autoMigrate,
        allowDestructiveAutoMigrate,
        autoPush,
        agentName,
        model,
        context,
        testCommand,
        thinkingLevel,
        priority,
    };
}

/**
 * Reads a value of a CLI option that follows a given flag.
 */
function readOptionValue(args: string[], flag: string): string | undefined {
    if (!args.includes(flag)) {
        return undefined;
    }
    const index = args.indexOf(flag);
    return args[index + 1];
}

/**
 * Reads a multi-token shell command value that follows a given flag.
 */
function readVariadicOptionValue(args: string[], flag: string): string | undefined {
    if (!args.includes(flag)) {
        return undefined;
    }

    const index = args.indexOf(flag);
    const valueParts: string[] = [];

    for (let i = index + 1; i < args.length; i++) {
        const valuePart = args[i];

        if (valuePart === undefined) {
            continue;
        }

        if (KNOWN_OPTION_FLAGS.has(valuePart)) {
            break;
        }

        valueParts.push(valuePart);
    }

    const normalizedValue = valueParts.join(' ').trim();
    return normalizedValue === '' ? undefined : normalizedValue;
}

/**
 * Parses and validates the minimum prompt priority.
 */
function parsePriority(priorityValue: string | undefined, hasPriorityFlag: boolean): number {
    if (priorityValue === undefined) {
        if (hasPriorityFlag) {
            exitWithUsageError('Missing value for --priority. Use a non-negative integer.');
        }
        return 0;
    }

    const priority = Number(priorityValue);
    if (!Number.isInteger(priority) || priority < 0) {
        exitWithUsageError(`Invalid value for --priority: "${priorityValue}". Use a non-negative integer.`);
    }

    return priority;
}

/**
 * Prints an argument error with usage and exits the process.
 */
function exitWithUsageError(message: string): never {
    console.error(colors.red(message));
    console.error(colors.gray(USAGE));
    process.exit(1);
}
