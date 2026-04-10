/**
 * Normalizes one project-relative path for human-readable CLI output and markdown.
 *
 * @private internal utility of `ptbk coder`
 */
export function formatDisplayPath(relativePath: string): string {
    return relativePath.replace(/\\/gu, '/');
}

// Note: [🟡] Code for coder path formatting [formatDisplayPath](src/cli/cli-commands/coder/formatDisplayPath.ts) should never be published outside of `@promptbook/cli`
