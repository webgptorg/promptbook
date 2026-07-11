import type { ReactNode } from 'react';

/**
 * CSS classes used for individual shell token kinds.
 *
 * Note: Colors follow the terminal palette defined in [`specs/components/terminal-block.md`](../../../specs/components/terminal-block.md)
 */
const SHELL_TOKEN_CLASS_NAMES = {
    command: 'text-promptbook-green',
    subcommand: 'text-promptbook-blue',
    flag: 'text-sky-300',
    string: 'text-amber-300',
    environmentVariable: 'text-fuchsia-300',
    comment: 'text-gray-500 italic',
    plain: 'text-gray-200',
} as const;

/**
 * Checks whether a token is a quoted string.
 */
function isQuotedString(token: string): boolean {
    return /^["'].*["']$/.test(token);
}

/**
 * Checks whether a token is an `UPPER_SNAKE_CASE` environment variable assignment like `FOO=bar`.
 */
function isEnvironmentVariableAssignment(token: string): boolean {
    return /^[A-Z][A-Z0-9_]*=/.test(token);
}

/**
 * Splits one shell command line into whitespace-separated tokens while keeping quoted segments together.
 */
function splitShellTokens(commandLine: string): ReadonlyArray<string> {
    return commandLine.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
}

/**
 * Renders one shell command line as syntax-highlighted React nodes.
 *
 * The highlighting is intentionally minimal - it distinguishes the command,
 * subcommands, `--flags`, quoted strings, environment variables and comments.
 */
export function highlightShellCommand(commandLine: string): ReactNode {
    if (commandLine.trimStart().startsWith('#')) {
        return <span className={SHELL_TOKEN_CLASS_NAMES.comment}>{commandLine}</span>;
    }

    const tokens = splitShellTokens(commandLine);
    const renderedTokens: Array<ReactNode> = [];
    let isCommandSeen = false;
    let isFlagSeen = false;

    tokens.forEach((token, tokenIndex) => {
        let className: string = SHELL_TOKEN_CLASS_NAMES.plain;

        if (token.startsWith('-')) {
            className = SHELL_TOKEN_CLASS_NAMES.flag;
            isFlagSeen = true;
        } else if (isQuotedString(token)) {
            className = SHELL_TOKEN_CLASS_NAMES.string;
        } else if (isEnvironmentVariableAssignment(token)) {
            className = SHELL_TOKEN_CLASS_NAMES.environmentVariable;
        } else if (!isCommandSeen) {
            className = SHELL_TOKEN_CLASS_NAMES.command;
            isCommandSeen = true;
        } else if (!isFlagSeen) {
            className = SHELL_TOKEN_CLASS_NAMES.subcommand;
        }

        renderedTokens.push(
            <span key={tokenIndex} className={className}>
                {token}
            </span>,
        );
        renderedTokens.push(' ');
    });

    // Note: Remove the trailing space after the last token
    renderedTokens.pop();

    return <>{renderedTokens}</>;
}
