/**
 * Quotes one literal Git argument for its selected shell. Finite jobs use the shared Bash process-tree runner
 * on every platform; legacy Windows callers use their existing native command shell.
 */
export function quoteGitArgument(value: string, isBashShell = process.platform !== 'win32'): string {
    if (!isBashShell) return JSON.stringify(value);
    // JSON quotes alone do not protect POSIX command/variable substitution in repository paths or branch names.
    return `"${value.replace(/[\\"$`]/gu, '\\$&')}"`;
}
