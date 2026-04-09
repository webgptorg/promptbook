import { readFile, stat, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../errors/NotFoundError';

/**
 * Relative path to the root prompts directory used by Promptbook coder utilities.
 *
 * @private internal utility of `ptbk coder`
 */
export const PROMPTS_DIRECTORY_PATH = 'prompts';

/**
 * Relative path to the archive directory used by `coder verify`.
 *
 * @private internal utility of `ptbk coder`
 */
export const PROMPTS_DONE_DIRECTORY_PATH = join(PROMPTS_DIRECTORY_PATH, 'done');

/**
 * Relative path to the project-owned boilerplate templates directory.
 *
 * @private internal utility of `ptbk coder`
 */
export const PROMPTS_TEMPLATES_DIRECTORY_PATH = join(PROMPTS_DIRECTORY_PATH, 'templates');

/**
 * Initialization statuses used when creating or updating coder configuration artifacts.
 *
 * @private internal utility of `ptbk coder`
 */
export type InitializationStatus = 'created' | 'updated' | 'unchanged';

/**
 * Identifiers of built-in coder boilerplate templates.
 *
 * @private internal utility of `ptbk coder`
 */
export type BuiltInCoderPromptTemplate = 'common' | 'agents-server';

/**
 * One built-in coder boilerplate template definition.
 *
 * @private internal utility of `ptbk coder`
 */
export type CoderPromptTemplateDefinition = {
    /**
     * Stable built-in identifier that can also be used as a CLI shorthand.
     */
    readonly id: BuiltInCoderPromptTemplate;
    /**
     * Project-relative path where `ptbk coder init` materializes the template file.
     */
    readonly relativeFilePath: string;
    /**
     * Prefix inserted into generated prompt file slugs.
     */
    readonly slugPrefix: string | null;
    /**
     * Markdown content of the template.
     */
    readonly content: string;
    /**
     * Whether `ptbk coder init` should materialize this template into project-owned files.
     */
    readonly isDefaultProjectTemplate: boolean;
};

/**
 * Result of ensuring one default coder template file exists inside a project.
 *
 * @private internal utility of `ptbk coder`
 */
export type EnsuredCoderPromptTemplateFile = {
    /**
     * Stable built-in identifier of the template.
     */
    readonly id: BuiltInCoderPromptTemplate;
    /**
     * Project-relative path of the materialized template file.
     */
    readonly relativeFilePath: string;
    /**
     * Status describing whether the file had to be created.
     */
    readonly status: InitializationStatus;
};

/**
 * Fully resolved boilerplate template used by `coder generate-boilerplates`.
 *
 * @private internal utility of `ptbk coder`
 */
export type ResolvedCoderPromptTemplate = {
    /**
     * Identifier or relative file path that was resolved.
     */
    readonly identifier: string;
    /**
     * Project-relative path when the template corresponds to a project file.
     */
    readonly relativeFilePath?: string;
    /**
     * Markdown content of the resolved template.
     */
    readonly content: string;
    /**
     * Prefix inserted into generated prompt file slugs.
     */
    readonly slugPrefix: string | null;
};

/**
 * Built-in boilerplate templates available to `coder generate-boilerplates`.
 *
 * Only the project-agnostic subset is materialized by `coder init`.
 */
const DEFAULT_CODER_PROMPT_TEMPLATE_DEFINITIONS = [
    {
        id: 'common',
        relativeFilePath: join(PROMPTS_TEMPLATES_DIRECTORY_PATH, 'common.md'),
        slugPrefix: null,
        content: buildCoderPromptTemplateContent([
            '-   @@@',
            "-   Keep in mind the DRY _(don't repeat yourself)_ principle.",
            '-   Do a proper analysis of the current functionality before you start implementing.',
            '-   Add the changes into the [changelog](./changelog/_current-preversion.md)',
        ]),
        isDefaultProjectTemplate: true,
    },
    {
        id: 'agents-server',
        relativeFilePath: join(PROMPTS_TEMPLATES_DIRECTORY_PATH, 'agents-server.md'),
        slugPrefix: 'agents-server',
        content: buildCoderPromptTemplateContent([
            '-   @@@',
            "-   Keep in mind the DRY _(don't repeat yourself)_ principle.",
            '-   Do a proper analysis of the current functionality before you start implementing.',
            '-   You are working with the [Agents Server](apps/agents-server)',
            '-   If you need to do the database migration, do it',
            '-   Add the changes into the [changelog](changelog/_current-preversion.md)',
        ]),
        isDefaultProjectTemplate: false,
    },
] as const satisfies ReadonlyArray<CoderPromptTemplateDefinition>;

/**
 * Project-agnostic coder templates that `ptbk coder init` should materialize in any repository.
 */
const DEFAULT_CODER_PROJECT_PROMPT_TEMPLATE_DEFINITIONS: ReadonlyArray<CoderPromptTemplateDefinition> =
    DEFAULT_CODER_PROMPT_TEMPLATE_DEFINITIONS.filter(({ isDefaultProjectTemplate }) => isDefaultProjectTemplate);

/**
 * Lists the built-in coder boilerplate templates.
 *
 * @private internal utility of `ptbk coder`
 */
export function getDefaultCoderPromptTemplateDefinitions(): ReadonlyArray<CoderPromptTemplateDefinition> {
    return DEFAULT_CODER_PROMPT_TEMPLATE_DEFINITIONS;
}

/**
 * Lists the built-in coder prompt templates that are safe to initialize in any project.
 *
 * @private internal utility of `ptbk coder`
 */
export function getDefaultCoderProjectPromptTemplateDefinitions(): ReadonlyArray<CoderPromptTemplateDefinition> {
    return DEFAULT_CODER_PROJECT_PROMPT_TEMPLATE_DEFINITIONS;
}

/**
 * Resolves one built-in coder boilerplate template definition by its stable identifier.
 *
 * @private internal utility of `ptbk coder`
 */
export function getDefaultCoderPromptTemplateDefinition(
    template: BuiltInCoderPromptTemplate,
): CoderPromptTemplateDefinition {
    const definition = getDefaultCoderPromptTemplateDefinitionOrUndefined(template);
    if (!definition) {
        throw new NotFoundError(`Built-in coder prompt template \`${template}\` was not found.`);
    }
    return definition;
}

/**
 * Ensures the default project-owned coder template files exist without overwriting user customizations.
 *
 * @private internal utility of `ptbk coder`
 */
export async function ensureDefaultCoderPromptTemplateFiles(
    projectPath: string,
): Promise<ReadonlyArray<EnsuredCoderPromptTemplateFile>> {
    const ensuredTemplateFiles: Array<EnsuredCoderPromptTemplateFile> = [];

    for (const definition of DEFAULT_CODER_PROJECT_PROMPT_TEMPLATE_DEFINITIONS) {
        const absoluteTemplatePath = join(projectPath, definition.relativeFilePath);
        if (await isExistingFile(absoluteTemplatePath)) {
            ensuredTemplateFiles.push({
                id: definition.id,
                relativeFilePath: definition.relativeFilePath,
                status: 'unchanged',
            });
            continue;
        }

        await writeFile(absoluteTemplatePath, `${definition.content}\n`, 'utf-8');
        ensuredTemplateFiles.push({
            id: definition.id,
            relativeFilePath: definition.relativeFilePath,
            status: 'created',
        });
    }

    return ensuredTemplateFiles;
}

/**
 * Resolves the template requested by `coder generate-boilerplates`.
 *
 * Supports three modes:
 * - omitted option => built-in `common`
 * - built-in alias => one of the shared default templates
 * - relative path => markdown template file resolved from the project root
 *
 * @private internal utility of `ptbk coder`
 */
export async function resolveCoderPromptTemplate({
    projectPath,
    templateOption,
}: {
    readonly projectPath: string;
    readonly templateOption?: string;
}): Promise<ResolvedCoderPromptTemplate> {
    const normalizedTemplateOption = normalizeCoderPromptTemplateOption(templateOption);
    if (!normalizedTemplateOption) {
        return createResolvedBuiltInCoderPromptTemplate('common');
    }

    const builtInTemplateDefinition = getDefaultCoderPromptTemplateDefinitionOrUndefined(normalizedTemplateOption);
    if (builtInTemplateDefinition) {
        return createResolvedBuiltInCoderPromptTemplate(builtInTemplateDefinition.id);
    }

    const absoluteTemplatePath = join(projectPath, normalizedTemplateOption);
    try {
        const content = (await readFile(absoluteTemplatePath, 'utf-8')).trim();
        return {
            identifier: normalizedTemplateOption,
            relativeFilePath: normalizedTemplateOption,
            content,
            slugPrefix: deriveCoderPromptSlugPrefix(normalizedTemplateOption),
        };
    } catch (error) {
        if (isNodeJsErrorWithCode(error, 'ENOENT')) {
            throw new NotFoundError(
                spaceTrim(`
                    Prompt boilerplate template was not found at \`${normalizedTemplateOption}\`.

                    -   The \`--template\` option resolves paths relative to the current project root: \`${projectPath}\`
                    -   Run \`ptbk coder init\` to create the default project templates in \`${PROMPTS_TEMPLATES_DIRECTORY_PATH}\`
                    -   Or omit \`--template\` / use the built-in aliases \`common\` or \`agents-server\`
                `),
            );
        }

        throw error;
    }
}

/**
 * Normalizes one raw `--template` option to either a trimmed string or `undefined`.
 */
function normalizeCoderPromptTemplateOption(templateOption?: string): string | undefined {
    const normalizedTemplateOption = templateOption?.trim();
    if (!normalizedTemplateOption) {
        return undefined;
    }
    return normalizedTemplateOption;
}

/**
 * Resolves one built-in template definition without throwing.
 */
function getDefaultCoderPromptTemplateDefinitionOrUndefined(
    template: string,
): CoderPromptTemplateDefinition | undefined {
    return DEFAULT_CODER_PROMPT_TEMPLATE_DEFINITIONS.find((definition) => definition.id === template);
}

/**
 * Builds stable markdown content for one coder prompt template without indentation drift.
 */
function buildCoderPromptTemplateContent(lines: ReadonlyArray<string>): string {
    return lines.join('\n');
}

/**
 * Creates a fully resolved template payload from one built-in definition.
 */
function createResolvedBuiltInCoderPromptTemplate(template: BuiltInCoderPromptTemplate): ResolvedCoderPromptTemplate {
    const definition = getDefaultCoderPromptTemplateDefinition(template);
    return {
        identifier: definition.id,
        relativeFilePath: definition.relativeFilePath,
        content: definition.content,
        slugPrefix: definition.slugPrefix,
    };
}

/**
 * Derives the filename slug prefix from a project-relative template path.
 */
function deriveCoderPromptSlugPrefix(relativeTemplatePath: string): string | null {
    const templateBasename = basename(relativeTemplatePath)
        .replace(/\.[^.]+$/u, '')
        .replace(/\.template$/u, '');

    if (templateBasename === 'common') {
        return null;
    }

    return templateBasename;
}

/**
 * Checks whether the provided error object exposes a specific Node.js `code`.
 */
function isNodeJsErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/**
 * Checks whether a path exists and is a file.
 */
async function isExistingFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

// Note: [🟡] Code for coder boilerplate templates [boilerplateTemplates](src/cli/cli-commands/coder/boilerplateTemplates.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
