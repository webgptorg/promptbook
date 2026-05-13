import { spaceTrim } from 'spacetrim';
import { AGENTS_FILE_PATH } from './agentsFile';
import { getDefaultCoderProjectPromptTemplateDefinitions, getDefaultCoderPromptTemplateDefinitions, PROMPTS_DIRECTORY_PATH, PROMPTS_DONE_DIRECTORY_PATH, PROMPTS_TEMPLATES_DIRECTORY_PATH } from './boilerplateTemplates';
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
            # Promptbook Coder quick reference

            This project is prepared for the \`ptbk coder\` workflow. Promptbook Coder does not create a new model on its own; it orchestrates coding agents such as GitHub Copilot, OpenAI Codex, Claude Code, Opencode, Cline, and Gemini CLI through prompt files in \`${formatDisplayPath(
                PROMPTS_DIRECTORY_PATH,
            )}/\`.

            ## Workflow
            1. Put repository-wide coding rules into \`${AGENTS_FILE_PATH}\`. The default \`npm run coder:run\` script already passes \`--context ${AGENTS_FILE_PATH}\`.
            2. Create or customize prompt templates in \`${formatDisplayPath(
                PROMPTS_TEMPLATES_DIRECTORY_PATH,
            )}/\`. ${buildStarterTemplateSentence()}
            3. Generate prompt files with \`npm run coder:generate-boilerplates\` or \`npx ptbk coder generate-boilerplates --template <template> --count <count>\`.
            4. Replace every \`@@@\`, keep drafts as \`[-]\`, and switch prompts to \`[ ]\` when they are ready to run. Completed prompts are marked \`[x]\`.
            5. Run \`npm run coder:run\` to execute the next ready prompt with the configured coding agent.
            6. Use \`npm run coder:verify\` to archive finished prompts into \`${formatDisplayPath(
                PROMPTS_DONE_DIRECTORY_PATH,
            )}/\` and append repair follow-up prompts when more work is needed.
            7. Use \`npm run coder:find-refactor-candidates\` when you want Promptbook to suggest refactor prompts automatically.

            ## Templates
            -   Project-owned templates created by \`ptbk coder init\`: ${formatInlineCodeList(
                getDefaultCoderProjectPromptTemplateDefinitions().map(({ relativeFilePath }) =>
                    formatDisplayPath(relativeFilePath),
                ),
            )}
            -   Built-in \`--template\` aliases: ${formatInlineCodeList(
                getDefaultCoderPromptTemplateDefinitions().map(({ id }) => id),
            )}
            -   To add a custom template, create a markdown file such as \`${formatDisplayPath(
                PROMPTS_TEMPLATES_DIRECTORY_PATH,
            )}/backend.md\`.
            -   To use a project template, run \`npx ptbk coder generate-boilerplates --template ${formatDisplayPath(
                PROMPTS_TEMPLATES_DIRECTORY_PATH,
            )}/backend.md\`.
            -   Keep shared repository rules in \`${AGENTS_FILE_PATH}\` and recurring task-family rules in template files so individual prompt files stay focused on the actual task.

            ## Created npm scripts
            | Script | Purpose |
            | --- | --- |
            ${block(buildPackageJsonScriptTableLines(packageJsonScripts).join('\n'))}

            ## Customizing the workflow
            -   Edit \`package.json\` if you want \`npm run coder:run\` to use another coding agent, model, thinking level, context file, or wait mode.
            -   Use direct CLI commands when you need one-off flags such as \`--priority\`, \`--ignore-git-changes\`, \`--no-commit\`, \`--dry-run\`, \`--test\`, \`--allow-credits\`, or \`--auto-migrate\`.
            -   Use \`npx ptbk coder --help\` and \`npx ptbk coder <command> --help\` for the full CLI reference.
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
