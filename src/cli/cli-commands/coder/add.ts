import colors from 'colors';
import type { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts from 'prompts';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';
import { ParseError } from '../../../errors/ParseError';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    buildCoderPromptSection,
    getDefaultCoderPromptTemplateDefinitions,
    PROMPTS_DIRECTORY_PATH,
    resolveCoderPromptTemplate,
} from './boilerplateTemplates';

/**
 * Placeholder token replaced when a prompt is authored — see the `@@@` convention.
 *
 * @private internal utility of `coder add` command
 */
const PROMPT_TEMPLATE_PLACEHOLDER = '@@@';

/**
 * Maximum number of kebab-case words kept from the description when building the prompt filename slug.
 *
 * @private internal utility of `coder add` command
 */
const MAX_PROMPT_SLUG_WORD_COUNT = 8;

/**
 * Fallback filename slug used when the description has no alphanumeric characters.
 *
 * @private internal utility of `coder add` command
 */
const FALLBACK_PROMPT_SLUG = 'prompt';

/**
 * Initializes `coder add` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderAddCommand(program: Program): $side_effect {
    const command = program.command('add');
    command.description(
        spaceTrim(`
            Add one ready-to-run prompt file to the queue

            Provide the description as an argument, pipe it through stdin, or run without arguments to type it interactively:
            - \`ptbk coder add "some new feature"\`
            - \`ptbk coder add --priority 1 "some new feature"\`
            - \`ptbk coder add <<EOF ... EOF\`
            - \`ptbk coder add\`
        `),
    );

    command.argument('[description]', 'Plain-language description of the feature or task to implement');
    command.option(
        '--priority <priority>',
        'Priority of the new prompt — higher priorities run first (rendered as trailing `!` markers)',
        parsePriorityOption,
        0,
    );
    command.option(
        '--template <template>',
        spaceTrim(`
            Prompt template appended below the description.

            Accepts either a built-in alias (${getDefaultCoderPromptTemplateDefinitions()
                .map(({ id }) => id)
                .join(', ')}) or a markdown file path relative to the current project root.
        `),
    );

    command.action(
        handleActionErrors(async (descriptionArgument: string | undefined, cliOptions) => {
            const { priority, template: templateOption } = cliOptions as {
                readonly priority: number;
                readonly template?: string;
            };

            const description = await resolveCoderPromptDescription(descriptionArgument);

            await addCoderPrompt({
                projectPath: process.cwd(),
                description,
                priority,
                templateOption,
            });
        }),
    );
}

/**
 * Result of adding one prompt file with `coder add`.
 *
 * @private internal utility of `coder add` command
 */
export type AddCoderPromptResult = {
    /**
     * Project-relative path of the created prompt file.
     */
    readonly filePath: string;
    /**
     * Emoji tag assigned to the created prompt, for example `[✨🪴]`.
     */
    readonly emojiTag: string;
};

/**
 * Adds one ready-to-run prompt file containing a single prompt built from the description and template.
 *
 * @private internal utility of `coder add` command
 */
export async function addCoderPrompt({
    projectPath,
    description,
    priority,
    templateOption,
}: {
    readonly projectPath: string;
    readonly description: string;
    readonly priority: number;
    readonly templateOption?: string;
}): Promise<AddCoderPromptResult> {
    const normalizedDescription = description.trim();
    if (normalizedDescription === '') {
        throw new ParseError(
            spaceTrim(`
                Cannot add a prompt without a description.

                Provide the description as an argument, pipe it through stdin, or type it interactively:
                - \`ptbk coder add "some new feature"\`
            `),
        );
    }

    // Note: Import these dynamically to avoid circular dependencies and keep the CLI fast
    const { buildPromptFilename, getPromptNumbering } = await import(
        '../../../../scripts/utils/prompts/getPromptNumbering'
    );
    const { formatPromptEmojiTag, getFreshPromptEmojiTags } = await import(
        '../../../../scripts/utils/prompts/promptEmojiTags'
    );

    const promptsDirectory = join(projectPath, PROMPTS_DIRECTORY_PATH);
    mkdirSync(promptsDirectory, { recursive: true });

    const promptTemplate = await resolveCoderPromptTemplate({ projectPath, templateOption });

    const promptNumbering = await getPromptNumbering({
        promptsDir: promptsDirectory,
        step: 10,
        ignoreGlobs: ['**/node_modules/**'],
    });

    const { selectedEmojis } = await getFreshPromptEmojiTags({ count: 1, rootDir: projectPath });
    const emoji = selectedEmojis[0]!;
    const emojiTag = formatPromptEmojiTag(emoji);

    const [firstDescriptionLine, ...remainingDescriptionLines] = normalizedDescription.split('\n');
    const title = (firstDescriptionLine ?? '').trim();
    const descriptionDetail = remainingDescriptionLines.join('\n').trim();
    const templateRules = stripPromptTemplatePlaceholder(promptTemplate.content);
    const body = descriptionDetail === '' ? templateRules : `${descriptionDetail}\n\n${templateRules}`;

    const section = buildCoderPromptSection({
        statusLine: buildPromptStatusLine(priority),
        emojiTag,
        title,
        body,
    });

    const slug = buildAddPromptSlug(promptTemplate.slugPrefix, title);
    const filename = buildPromptFilename(promptNumbering.datePrefix, promptNumbering.startNumber, slug);
    const filePath = join(PROMPTS_DIRECTORY_PATH, filename);
    const absoluteFilePath = join(projectPath, filePath);

    writeFileSync(absoluteFilePath, `${section}\n`, 'utf-8');

    console.info(colors.green(`✓ Added prompt ${emojiTag} in ${filePath}`));

    return { filePath, emojiTag };
}

/**
 * Resolves the prompt description from the CLI argument, piped stdin, or an interactive prompt.
 *
 * @private internal utility of `coder add` command
 */
async function resolveCoderPromptDescription(descriptionArgument: string | undefined): Promise<string> {
    if (descriptionArgument !== undefined && descriptionArgument.trim() !== '') {
        return descriptionArgument.trim();
    }

    // Note: A non-TTY stdin means the description is piped in (e.g. a `<<EOF` heredoc or `echo ... |`)
    const isStandardInputPiped = !process.stdin.isTTY;
    if (isStandardInputPiped) {
        const standardInputDescription = (await readAllStandardInput()).trim();
        if (standardInputDescription === '') {
            throw new ParseError(
                spaceTrim(`
                    Cannot add a prompt without a description.

                    The piped standard input was empty — provide the description as an argument instead:
                    - \`ptbk coder add "some new feature"\`
                `),
            );
        }
        return standardInputDescription;
    }

    const response = await prompts({
        type: 'text',
        name: 'description',
        message: 'Describe the feature or task to add',
        validate: (value) => (typeof value === 'string' && value.trim() !== '' ? true : 'Description is required'),
    });

    const interactiveDescription = typeof response.description === 'string' ? response.description.trim() : '';
    if (interactiveDescription === '') {
        throw new ParseError(
            spaceTrim(`
                Cannot add a prompt without a description.

                Provide the description as an argument, pipe it through stdin, or type it interactively:
                - \`ptbk coder add "some new feature"\`
            `),
        );
    }

    return interactiveDescription;
}

/**
 * Reads the whole standard input stream into a single UTF-8 string.
 *
 * @private internal utility of `coder add` command
 */
async function readAllStandardInput(): Promise<string> {
    const chunks: Array<Buffer> = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Builds the checklist status line for a ready-to-run prompt at the given priority.
 *
 * A priority of `0` produces a plain `[ ]`, while a priority of `N` appends `N` trailing `!` markers.
 *
 * @private internal utility of `coder add` command
 */
function buildPromptStatusLine(priority: number): string {
    if (priority <= 0) {
        return '[ ]';
    }
    return `[ ] ${'!'.repeat(priority)}`;
}

/**
 * Removes the `@@@` placeholder lines from a resolved template so only the task rules remain.
 *
 * @private internal utility of `coder add` command
 */
function stripPromptTemplatePlaceholder(templateContent: string): string {
    return templateContent
        .split('\n')
        .filter((line) => !isPromptTemplatePlaceholderLine(line))
        .join('\n')
        .trim();
}

/**
 * Checks whether one line is only the `@@@` placeholder, optionally prefixed by a list marker.
 *
 * @private internal utility of `coder add` command
 */
function isPromptTemplatePlaceholderLine(line: string): boolean {
    const lineWithoutListMarker = line
        .trim()
        .replace(/^[-*+]\s+/u, '')
        .trim();
    return lineWithoutListMarker === PROMPT_TEMPLATE_PLACEHOLDER;
}

/**
 * Builds the filename slug from the optional template prefix and the prompt title.
 *
 * @private internal utility of `coder add` command
 */
function buildAddPromptSlug(templateSlugPrefix: string | null, title: string): string {
    const titleSlug =
        normalizeToKebabCase(title).split('-').filter(Boolean).slice(0, MAX_PROMPT_SLUG_WORD_COUNT).join('-') ||
        FALLBACK_PROMPT_SLUG;

    if (!templateSlugPrefix) {
        return titleSlug;
    }
    return `${templateSlugPrefix}-${titleSlug}`;
}

/**
 * Parses and validates the `--priority` option as a non-negative integer.
 *
 * @private internal utility of `coder add` command
 */
function parsePriorityOption(value: string): number {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid value for \`--priority\`: \`${value}\`.

                Use a non-negative integer, for example \`--priority 1\`.
            `),
        );
    }
    return parsedValue;
}

// Note: [🟡] Code for CLI command [add](src/cli/cli-commands/coder/add.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
