import { spaceTrim } from 'spacetrim';
import { AGENTS_FILE_PATH } from './agentsFile';
import {
    getDefaultCoderProjectPromptTemplateDefinitions,
    getDefaultCoderPromptTemplateDefinitions,
    PROMPTS_DIRECTORY_PATH,
    PROMPTS_DONE_DIRECTORY_PATH,
    PROMPTS_TEMPLATES_DIRECTORY_PATH,
} from './boilerplateTemplates';
import { formatDisplayPath } from './formatDisplayPath';

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
    packageJsonScripts,
}: {
    readonly packageJsonScripts: Readonly<Record<string, string>>;
}): string {
    return spaceTrim(
        (block) => `
            # ✨ Promptbook Coder agent coding

            This project is using [Promptbook Coder](https://coder.ptbk.io) or run \`ptbk coder\`!
        `,
    );
}

/**
 * Builds the sentence describing the starter templates created during initialization.
 */
function buildStarterTemplateSentence(): string {
    const starterTemplatePaths = getDefaultCoderProjectPromptTemplateDefinitions().map(({ relativeFilePath }) =>
        formatDisplayPath(relativeFilePath),
    );

    if (starterTemplatePaths.length === 1) {
        return `The starter project template created by \`ptbk coder init\` is \`${starterTemplatePaths[0]}\`.`;
    }

    return `The starter project templates created by \`ptbk coder init\` are ${formatInlineCodeList(
        starterTemplatePaths,
    )}.`;
}

/**
 * Builds the markdown table rows describing the initialized npm scripts.
 */
function buildPackageJsonScriptTableLines(packageJsonScripts: Readonly<Record<string, string>>): Array<string> {
    return Object.entries(packageJsonScripts).map(
        ([scriptName, scriptCommand]) =>
            `| \`npm run ${scriptName}\` | ${describeDefaultCoderPackageJsonScript(scriptName, scriptCommand)} |`,
    );
}

/**
 * Describes one initialized npm script in human-readable terms.
 */
function describeDefaultCoderPackageJsonScript(scriptName: string, scriptCommand: string): string {
    if (scriptName === 'coder:generate-boilerplates') {
        return `Runs \`${scriptCommand}\` to create new prompt files in \`${formatDisplayPath(
            PROMPTS_DIRECTORY_PATH,
        )}/\`.`;
    }

    if (scriptName === 'coder:add') {
        return `Runs \`${scriptCommand}\` to add one ready-to-run prompt file to \`${formatDisplayPath(
            PROMPTS_DIRECTORY_PATH,
        )}/\` from a plain-language description.`;
    }

    if (scriptName === 'coder:run') {
        return `Runs \`${scriptCommand}\` to execute the next ready prompt with shared repository context from \`${AGENTS_FILE_PATH}\`.`;
    }

    if (scriptName === 'coder:find-refactor-candidates') {
        return `Runs \`${scriptCommand}\` to generate prompt candidates for large or crowded files.`;
    }

    if (scriptName === 'coder:verify') {
        return `Runs \`${scriptCommand}\` to archive verified prompts into \`${formatDisplayPath(
            PROMPTS_DONE_DIRECTORY_PATH,
        )}/\` and append repair prompts when needed.`;
    }

    return `Runs \`${scriptCommand}\`.`;
}

/**
 * Formats one inline code list for human-readable markdown.
 */
function formatInlineCodeList(values: ReadonlyArray<string>): string {
    return values.map((value) => `\`${value}\``).join(', ');
}

// Note: [🟡] Code for coder AGENT_CODING file boilerplate [agentCodingFile](src/cli/cli-commands/coder/agentCodingFile.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
