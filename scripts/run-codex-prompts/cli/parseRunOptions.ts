import colors from 'colors';
import type { RunOptions } from './RunOptions';

/**
 * CLI usage text for this script.
 */
const USAGE =
    'Usage: run-codex-prompts [--dry-run] [--agent <agent-name>] [--model <model>] [--priority <minimum-priority>] [--no-wait] [--ignore-git-changes]';

/**
 * Parses CLI arguments into runner options.
 */
export function parseRunOptions(args: string[]): RunOptions {
    let agentName: 'openai-codex' | 'cline' | 'claude-code' | 'opencode' | 'gemini' | undefined = undefined;
    const dryRun = args.includes('--dry-run');

    const agentValue = readOptionValue(args, '--agent');
    if (agentValue) {
        const value = agentValue;
        if (
            value === 'openai-codex' ||
            value === 'cline' ||
            value === 'claude-code' ||
            value === 'opencode' ||
            value === 'gemini'
        ) {
            agentName = value;
        }
    }

    const model = readOptionValue(args, '--model');
    const hasPriorityFlag = args.includes('--priority');
    const priority = parsePriority(readOptionValue(args, '--priority'), hasPriorityFlag);
    const ignoreGitChanges = args.includes('--ignore-git-changes');

    if (!agentName && !dryRun) {
        exitWithUsageError('You must choose an agent using --agent <openai-codex|cline|claude-code|opencode|gemini>');
    }

    return {
        dryRun,
        waitForUser: !args.includes('--no-wait'),
        ignoreGitChanges,
        agentName,
        model,
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
