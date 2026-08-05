import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import type { CoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import {
    addCoderGitSyncOptions,
    CODER_GIT_SYNC_DESCRIPTION,
    normalizeCoderGitSyncCliOptions,
} from '../common/coderGitSyncCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import type { BoilerplateCount } from './boilerplateCount';
import {
    BOILERPLATE_COUNT_OPTION_DESCRIPTION,
    DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE,
    formatBoilerplateCount,
    parseBoilerplateCount,
} from './boilerplateCount';
import {
    buildCoderPromptSection,
    getDefaultCoderPromptTemplateDefinitions,
    PROMPTS_DIRECTORY_PATH,
    resolveCoderPromptTemplate,
} from './boilerplateTemplates';

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
        spaceTrim(
            (block) => `
                Generate prompt boilerplate files with unique emoji tags

                ${block(CODER_GIT_SYNC_DESCRIPTION)}
            `,
        ),
    );

    command.option('--count <count>', BOILERPLATE_COUNT_OPTION_DESCRIPTION, DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE);
    command.option(
        '--template <template>',
        spaceTrim(`
            Prompt template to use.

            Accepts either a built-in alias (${getDefaultCoderPromptTemplateDefinitions()
                .map(({ id }) => id)
                .join(', ')}) or a markdown file path relative to the current project root.
        `),
    );
    addCoderGitSyncOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { count: countOption, template: templateOption } = cliOptions as {
                readonly count: string;
                readonly template?: string;
            } & CoderGitSyncCliOptions;

            const boilerplateCount = parseBoilerplateCount(countOption);
            const gitSync = normalizeCoderGitSyncCliOptions(cliOptions as CoderGitSyncCliOptions);
            const projectPath = process.cwd();

            // Note: Import the git synchronization dynamically to keep the CLI fast for runs without `--commit`
            const { $commitCoderChanges, $startCoderGitSync } = await import(
                '../../../../scripts/run-codex-prompts/git/coderGitSync'
            );

            const commitScope = await $startCoderGitSync({ gitSync, projectPath });

            await generatePromptBoilerplate({
                projectPath,
                boilerplateCount,
                templateOption,
            });

            await $commitCoderChanges({
                gitSync,
                commitScope,
                commitMessage: `Prompts ${formatBoilerplateCount(boilerplateCount)}`,
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
    boilerplateCount,
    templateOption,
}: {
    readonly projectPath: string;
    readonly boilerplateCount: BoilerplateCount;
    readonly templateOption?: string;
}): Promise<void> {
    const { filesCount, promptsPerFileCount } = boilerplateCount;

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

    // Note: Every single generated prompt is one separate coding task, so each of them reserves its own fresh emoji tag
    const promptsCount = filesCount * promptsPerFileCount;
    const { availableCount, selectedEmojis } = await getFreshPromptEmojiTags({
        count: promptsCount,
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
        const emojiTags = selectedEmojis
            .slice(i * promptsPerFileCount, (i + 1) * promptsPerFileCount)
            .map((emoji) => formatPromptEmojiTag(emoji));
        const filename = buildPromptFilename(
            promptNumbering.datePrefix,
            number,
            buildPromptSlug(promptTemplate.slugPrefix, title),
        );
        const filepath = join(PROMPTS_DIRECTORY_PATH, filename);
        const absoluteFilepath = join(projectPath, filepath);
        const content = buildBoilerplatePromptFileContent({
            emojiTags,
            title,
            body: promptTemplate.content,
        });

        filesToCreate.push({
            filepath,
            absoluteFilepath,
            filename,
            content,
            emojiTags,
            number,
        });
    }

    // Create the files
    console.info(colors.yellow(`Creating ${filesToCreate.length} files:`));

    for (const file of filesToCreate) {
        writeFileSync(file.absoluteFilepath, file.content, 'utf-8');
        console.info(colors.green(`✓ Created: ${file.filename} with ${file.emojiTags.join(' ')}`));
    }

    console.info(
        colors.bgGreen(
            ` Successfully created ${promptsCount} prompts in ${filesToCreate.length} prompt boilerplate files! `,
        ),
    );
}

/**
 * Builds the markdown content of one generated prompt file with one prompt section per emoji tag.
 *
 * Multiple prompts in one file are separated by the `---` separator, exactly like the prompt runner expects them.
 *
 * @private internal utility of `generatePromptBoilerplate` command
 */
function buildBoilerplatePromptFileContent({
    emojiTags,
    title,
    body,
}: {
    readonly emojiTags: ReadonlyArray<string>;
    readonly title: string;
    readonly body: string;
}): string {
    return emojiTags
        .map((emojiTag) =>
            buildCoderPromptSection({
                statusLine: '[-]',
                emojiTag,
                title,
                body,
            }),
        )
        .join('\n\n---\n\n');
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
