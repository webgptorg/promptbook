import colors from 'colors';
import type { RunOptions } from './RunOptions';

/**
 * Parses CLI arguments into runner options.
 */
export function parseRunOptions(args: string[]): RunOptions {
    let agentName: 'openai-codex' | 'cline' | 'claude-code' | 'opencode' | 'gemini' | undefined = undefined;

    if (args.includes('--agent')) {
        const index = args.indexOf('--agent');
        const value = args[index + 1];
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

    let model: string | undefined = undefined;
    if (args.includes('--model')) {
        const index = args.indexOf('--model');
        model = args[index + 1];
    }
    const ignoreGitChanges = args.includes('--ignore-git-changes');

    if (!agentName) {
        console.error(colors.red('You must choose an agent using --agent <openai-codex|cline|claude-code|opencode|gemini>'));
        console.error(
            colors.gray('Usage: run-codex-prompts --agent <agent-name> [--model <model>] [--no-wait] [--ignore-git-changes]'),
        );
        process.exit(1);
    }

    return {
        waitForUser: !args.includes('--no-wait'),
        ignoreGitChanges,
        agentName,
        model,
    };
}
