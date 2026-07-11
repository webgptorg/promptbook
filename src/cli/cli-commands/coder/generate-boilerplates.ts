import colors from 'colors';
import type {
  Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */
} from 'commander';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { getDefaultCoderPromptTemplateDefinitions, PROMPTS_DIRECTORY_PATH, resolveCoderPromptTemplate } from './boilerplateTemplates';

/**
 * Initializes `coder generate-boilerplates` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderGenerateBoilerplatesCommand(program: Program): $side_effect {
    const command = program.command('generate-boilerplates');
    command.description(
        spaceTrim(`
            Generate prompt boilerplate files with unique emoji tags
        `),
    );

    command.option('--count <count>', `Number of prompt boilerplate files to generate`, '5');
    command.option(
        '--template <template>',
        spaceTrim(`
            Prompt template to use.

            Accepts either a built-in alias (${getDefaultCoderPromptTemplateDefinitions()
                .map(({ id }) => id)
                .join(', ')}) or a markdown file path relative to the current project root.
        `),
    );

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { count: countOption, template: templateOption } = cliOptions as {
                readonly count: string;
                readonly template?: string;
            };

            const filesCount = parseFilesCount(countOption);

            await generatePromptBoilerplate({
                projectPath: process.cwd(),
                filesCount,
                templateOption,
            });

            return process.exit(0);
        }),
    );
}

/**
 * Generates boilerplate prompt files with unique emoji tags.
 *
 * @private internal function of `generatePromptBoilerplate` command
 */
export async function generatePromptBoilerplate({
    projectPath,
    filesCount,
    templateOption,
}: {
    readonly projectPath: string;
    readonly filesCount: number;
    readonly templateOption?: string;
}): Promise<void> {
    // Note: Import these dynamically to avoid circular dependencies and keep CLI fast
    const { buildPromptFilename, getPromptNumbering } = await import(
        '../../../../scripts/utils/prompts/getPromptNumbering'
    );
    const { formatPromptEmojiTag, getFreshPromptEmojiTags } = await import(
        '../../../../scripts/utils/prompts/promptEmojiTags'
    );

    console.info(`🚀  Generate prompt boilerplate files`);

    mkdirSync(join(projectPath, PROMPTS_DIRECTORY_PATH), { recursive: true });
    const promptTemplate = await resolveCoderPromptTemplate({ projectPath, templateOption });

    const promptNumbering = await getPromptNumbering({
        promptsDir: join(projectPath, PROMPTS_DIRECTORY_PATH),
        step: 10,
        ignoreGlobs: ['**/node_modules/**'],
    });
    const highestNumber = promptNumbering.startNumber === 0 ? 0 : promptNumbering.startNumber - promptNumbering.step;
    const highestNumberFormatted = Math.max(0, highestNumber).toString().padStart(4, '0');
    console.info(
        colors.blue(`Highest existing number for ${promptNumbering.datePrefix} found: ${highestNumberFormatted}`),
    );

    const { availableCount, selectedEmojis } = await getFreshPromptEmojiTags({
        count: filesCount,
        rootDir: projectPath,
    });

    console.info(colors.green(`Found ${availableCount} available fresh emojis`));
    console.info(
        colors.green(`Selected emojis: ${selectedEmojis.map((emoji) => formatPromptEmojiTag(emoji)).join(' ')}`),
    );

    // Placeholder titles
    const titles = ['foo', 'bar', 'baz', 'qux', 'brr'];

    // Generate files
    const filesToCreate = [];
    for (let i = 0; i < filesCount; i++) {
        const number = promptNumbering.startNumber + i * promptNumbering.step;
        const title = titles[i % titles.length]!;
        const emoji = selectedEmojis[i]!;
        const filename = buildPromptFilename(
            promptNumbering.datePrefix,
            number,
            buildPromptSlug(promptTemplate.slugPrefix, title),
        );
        const filepath = join(PROMPTS_DIRECTORY_PATH, filename);
        const absoluteFilepath = join(projectPath, filepath);
        const emojiTag = formatPromptEmojiTag(emoji);
        const one = spaceTrim(
            (block) => `

                [-]

                ${emojiTag} ${title}

                ${block(promptTemplate.content)}
            `,
        );
        const content = spaceTrim(
            (block) => `

                ${block(one)}

                ---

                ${block(one)}

                ---

                ${block(one)}

                ---

                ${block(one)}

            `,
        );

        filesToCreate.push({
            filepath,
            absoluteFilepath,
            filename,
            content,
            emoji,
            number,
        });
    }

    // Create the files
    console.info(colors.yellow(`Creating ${filesToCreate.length} files:`));

    for (const file of filesToCreate) {
        writeFileSync(file.absoluteFilepath, file.content, 'utf-8');
        console.info(colors.green(`✓ Created: ${file.filename} with ${formatPromptEmojiTag(file.emoji!)}`));
    }

    console.info(colors.bgGreen(` Successfully created ${filesToCreate.length} prompt boilerplate files! `));
}

/**
 * Parses and validates the count of boilerplate files to create.
 *
 * @private internal utility of `generatePromptBoilerplate` command
 */
function parseFilesCount(countOption: string): number {
    const filesCount = Number(countOption);

    if (!Number.isFinite(filesCount) || filesCount <= 0) {
        console.info(colors.yellow(`Invalid --count '${countOption}'. Falling back to default 5.`));
        return 5;
    }

    return Math.floor(filesCount);
}

/**
 * Builds filename slug from template and placeholder title.
 *
 * @private internal utility of `generatePromptBoilerplate` command
 */
function buildPromptSlug(templateSlugPrefix: string | null, title: string): string {
    if (!templateSlugPrefix) {
        return title;
    }

    return `${templateSlugPrefix}-${title}`;
}

// Note: [🟡] Code for CLI command [generate-boilerplates](src/cli/cli-commands/coder/generate-boilerplates.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
