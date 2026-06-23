import colors from 'colors';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import { THINKING_LEVEL_VALUES, parseThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import {
    PROMPT_RUNNER_HARNESS_NAMES,
    type PromptRunnerHarnessName,
} from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { parseDuration } from '../common/parseDuration';
import type { RunOptions } from './RunOptions';

/**
 * CLI usage text for this script.
 */
const USAGE =
    'Usage: run-codex-prompts [--dry-run] [--harness <harness-name>] [--model <model>] [--context <context-or-file>] [--test <test-command...>] [--preserve-logs] [--no-ui] [--thinking-level <thinking-level>] [--priority <minimum-priority>] [--allow-credits] [--auto-migrate] [--allow-destructive-auto-migrate] [--wait <duration>] [--no-auto] [--no-commit] [--ignore-git-changes] [--no-normalize-line-endings] [--auto-push] [--auto-pull]';

/**
 * Top-level flags supported by this command.
 */
const KNOWN_OPTION_FLAGS = new Set([
    '--dry-run',
    '--harness',
    '--model',
    '--context',
    '--test',
    '--preserve-logs',
    '--no-ui',
    '--thinking-level',
    '--priority',
    '--allow-credits',
    '--auto-migrate',
    '--allow-destructive-auto-migrate',
    '--wait',
    '--no-auto',
    '--no-commit',
    '--ignore-git-changes',
    '--no-normalize-line-endings',
    '--auto-push',
    '--auto-pull',
]);

/**
 * Parses CLI arguments into runner options.
 */
export function parseRunOptions(args: string[]): RunOptions {
    let agentName: PromptRunnerHarnessName | undefined = undefined;
    const dryRun = args.includes('--dry-run');

    const harnessValue = readOptionValue(args, '--harness');
    if (harnessValue) {
        const value = harnessValue;
        if (PROMPT_RUNNER_HARNESS_NAMES.includes(value as PromptRunnerHarnessName)) {
            agentName = value as PromptRunnerHarnessName;
        }
    }

    const model = readOptionValue(args, '--model');
    const context = readOptionValue(args, '--context');
    const hasTestCommandFlag = args.includes('--test');
    const testCommand = readVariadicOptionValue(args, '--test');
    const preserveLogs = args.includes('--preserve-logs');
    const noUi = args.includes('--no-ui');
    const hasThinkingLevelFlag = args.includes('--thinking-level');
    const thinkingLevelValue = readOptionValue(args, '--thinking-level');
    const hasPriorityFlag = args.includes('--priority');
    const priority = parsePriority(readOptionValue(args, '--priority'), hasPriorityFlag);
    const noCommit = args.includes('--no-commit');
    const ignoreGitChanges = args.includes('--ignore-git-changes');
    const normalizeLineEndings = !args.includes('--no-normalize-line-endings');
    const allowCredits = args.includes('--allow-credits');
    const autoMigrate = args.includes('--auto-migrate');
    const allowDestructiveAutoMigrate = args.includes('--allow-destructive-auto-migrate');
    const autoPush = args.includes('--auto-push');
    const autoPull = args.includes('--auto-pull');
    // [1] Parse --wait <duration> and --no-auto:
    //   default: run automatically through the queue (no waiting)
    //   --no-auto: wait for user confirmation before each prompt (interactive mode)
    //   --wait 1h: wait 1h between prompt rounds to avoid rate limits
    const waitForUser = args.includes('--no-auto');
    let waitBetweenPrompts = 0;
    const hasWaitFlag = args.includes('--wait');
    const waitValue = readOptionValue(args, '--wait');

    if (hasWaitFlag) {
        if (waitValue === undefined || waitValue.startsWith('-')) {
            exitWithUsageError('Missing value for --wait. Use a duration like 1h, 30m, 5s.');
        }
        waitBetweenPrompts = parseDuration(waitValue as string);
    }
    let thinkingLevel: ThinkingLevel | undefined;

    if (hasTestCommandFlag && testCommand === undefined) {
        exitWithUsageError(
            'Missing value for --test. Use a shell command such as `npm run test` and quote it when it contains top-level CLI flags.',
        );
    }

    if (hasThinkingLevelFlag && thinkingLevelValue === undefined) {
        exitWithUsageError(`Missing value for --thinking-level. Use one of: ${THINKING_LEVEL_VALUES.join(', ')}.`);
    }

    try {
        thinkingLevel = parseThinkingLevel(thinkingLevelValue);
    } catch (error) {
        exitWithUsageError(error instanceof Error ? error.message : String(error));
    }

    if (!agentName && !dryRun) {
        exitWithUsageError(
            'You must choose a harness using --harness <openai-codex|github-copilot|cline|claude-code|opencode|gemini>',
        );
    }

    return {
        dryRun,
        waitForUser,
        waitBetweenPrompts,
        noCommit,
        ignoreGitChanges,
        normalizeLineEndings,
        allowCredits,
        autoMigrate,
        allowDestructiveAutoMigrate,
        autoPush,
        autoPull,
        preserveLogs,
        noUi,
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
