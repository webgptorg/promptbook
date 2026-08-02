import { spaceTrim } from 'spacetrim';

/**
 * Relative path to the Promptbook Coder quick-reference file initialized in project roots.
 *
 * @private internal utility of `ptbk coder`
 */
export const AGENT_CODING_FILE_PATH = 'AGENT_CODING.md';

/**
 * Returns the default coder `AGENT_CODING.md` quick-reference content.
 *
 * @private internal utility of `ptbk coder`
 */
export function getDefaultCoderAgentCodingFileContent({
    packageJsonScripts: _packageJsonScripts,
}: {
    readonly packageJsonScripts: Readonly<Record<string, string>>;
}): string {
    return spaceTrim(
        () => `
            # ✨ Promptbook Coder agent coding

            This project is using [Promptbook Coder](https://coder.ptbk.io) or run \`ptbk coder\`!
        `,
    );
}

// Note: [🟡] Code for coder AGENT_CODING file boilerplate [agentCodingFile](src/cli/cli-commands/coder/agentCodingFile.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
