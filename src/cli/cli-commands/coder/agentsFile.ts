/**
 * Relative path to the shared coder context file initialized in project roots.
 *
 * @private internal utility of `ptbk coder`
 */
export const AGENTS_FILE_PATH = 'AGENTS.md';

/**
 * Stable boilerplate instructions written into newly initialized `AGENTS.md` files.
 */
const DEFAULT_CODER_AGENTS_FILE_LINES = [
    '<!-- TODO: Write instructions for the Promptbook AI Coder here -->',
] as const satisfies ReadonlyArray<string>;

/**
 * Shared markdown boilerplate written into new `AGENTS.md` files.
 */
const DEFAULT_CODER_AGENTS_FILE_CONTENT = DEFAULT_CODER_AGENTS_FILE_LINES.join('\n');

/**
 * Returns the default coder `AGENTS.md` boilerplate instructions.
 *
 * @private internal utility of `ptbk coder`
 */
export function getDefaultCoderAgentsFileContent(): string {
    return DEFAULT_CODER_AGENTS_FILE_CONTENT;
}

// Note: [🟡] Code for coder AGENTS file boilerplate [agentsFile](src/cli/cli-commands/coder/agentsFile.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
