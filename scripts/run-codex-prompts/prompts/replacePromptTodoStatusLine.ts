/**
 * Replaces the complete todo status line while preserving its indentation.
 *
 * The complete line is replaced because a todo status can contain a required
 * model/harness token in addition to priority markers.
 */
export function replacePromptTodoStatusLine(line: string, replacementStatusLine: string): string {
    return line.replace(/^(?<indentation>\s*)\[\s*\].*$/u, `$<indentation>${replacementStatusLine}`);
}
