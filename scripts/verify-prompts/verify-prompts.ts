import colors from 'colors';
import { mkdir, rename, stat } from 'fs/promises';
import { extname, join, relative } from 'path';
import prompts from 'prompts';
import { buildPromptLabelForDisplay } from '../run-codex-prompts/prompts/buildPromptLabelForDisplay';
import { findNextTodoPrompt } from '../run-codex-prompts/prompts/findNextTodoPrompt';
import { loadPromptFiles } from '../run-codex-prompts/prompts/loadPromptFiles';
import type { PromptFile } from '../run-codex-prompts/prompts/types/PromptFile';
import type { PromptSection } from '../run-codex-prompts/prompts/types/PromptSection';
import type { PromptSelection } from '../run-codex-prompts/prompts/types/PromptSelection';
import { writePromptFile } from '../run-codex-prompts/prompts/writePromptFile';

/**
 * Path to the directory that holds the prompt markdown files.
 */
const PROMPTS_DIR = join(process.cwd(), 'prompts');

/**
 * Destination directory for resolved prompts.
 */
const DONE_PROMPTS_DIR = join(PROMPTS_DIR, 'done');

/**
 * Maximum number of characters to display when previewing a prompt block.
 */
const SNIPPET_CHAR_LIMIT = 900;

/**
 * Maximum number of file names to show in the pending-files preview.
 */
const MAX_PENDING_FILE_NAMES = 8;

/**
 * Possible user decisions after reviewing a prompt section.
 */
type PromptDecision = 'done' | 'not-done';

/**
 * Options supported by the prompt verification helper.
 */
export type VerifyPromptsOptions = {
    /**
     * Process prompt files in reverse order.
     */
    readonly reverse?: boolean;

    /**
     * Ignore prompt files whose filename or first prompt line contains one of the provided values.
     */
    readonly ignore?: ReadonlyArray<string>;
};

/**
 * Fully normalized prompt verification options used during one run.
 */
type NormalizedVerifyPromptsOptions = {
    /**
     * Process prompt files in reverse order.
     */
    readonly reverse: boolean;

    /**
     * Ignore prompt files whose filename or first prompt line contains one of the provided values.
     */
    readonly ignore: ReadonlyArray<string>;
};

/**
 * Default verification options parsed from the current process arguments.
 */
const DEFAULT_VERIFY_PROMPTS_OPTIONS = normalizeVerifyPromptsOptions(parseVerifyPromptsCliOptions(process.argv.slice(2)));

/**
 * Starts the verification loop and exits when no `[ ]` prompts remain.
 *
 * @public exported from `@promptbook/cli`
 */
export async function verifyPrompts(options: VerifyPromptsOptions = DEFAULT_VERIFY_PROMPTS_OPTIONS): Promise<void> {
    const normalizedOptions = normalizeVerifyPromptsOptions(options);

    console.info(colors.cyan.bold('📋 Prompt verification helper'));
    if (normalizedOptions.reverse) {
        console.info(colors.gray('Processing files in reverse order'));
    }
    if (normalizedOptions.ignore.length > 0) {
        console.info(colors.gray(`Ignoring candidates matching: ${normalizedOptions.ignore.join(', ')}`));
    }
    const { promptFiles: initialFiles, ignoredPromptFiles } = await loadPromptFilesForVerification(normalizedOptions);
    if (ignoredPromptFiles.length > 0) {
        console.info(colors.gray(`Ignored ${ignoredPromptFiles.length} prompt file(s) for this run.`));
    }
    displayTopLevelFileList(initialFiles);
    await prepareArchiveDirectory();

    let promptFiles = initialFiles;
    const skippedFiles = new Set<string>();

    while (true) {
        displayPromptOverview(promptFiles);

        // First priority: verify files where all prompts are marked as done
        const fileWithAllDone = findFileWithAllDonePrompts(promptFiles, skippedFiles);
        if (fileWithAllDone) {
            const wasSkipped = await verifyDonePromptsInFile(fileWithAllDone);
            if (wasSkipped) {
                skippedFiles.add(fileWithAllDone.path);
            }
            promptFiles = (await loadPromptFilesForVerification(normalizedOptions)).promptFiles;
            continue;
        }

        // Second priority: process todo prompts
        const nextPrompt = findNextTodoPrompt(promptFiles);
        if (!nextPrompt) {
            console.info(colors.green('\n✅ All prompts have been verified.'));
            break;
        }

        await resolvePrompt(nextPrompt);
        promptFiles = (await loadPromptFilesForVerification(normalizedOptions)).promptFiles;
    }
}

/**
 * Parses supported command-line arguments for the standalone verification script.
 */
function parseVerifyPromptsCliOptions(args: ReadonlyArray<string>): VerifyPromptsOptions {
    return {
        reverse: args.includes('--reverse'),
        ignore: readRepeatableStringOption(args, '--ignore'),
    };
}

/**
 * Loads prompt files and applies ordering plus ignore filters for one verification pass.
 */
async function loadPromptFilesForVerification(
    options: NormalizedVerifyPromptsOptions,
): Promise<{ promptFiles: PromptFile[]; ignoredPromptFiles: PromptFile[] }> {
    const loadedPromptFiles = await loadPromptFiles(PROMPTS_DIR);
    const { promptFiles, ignoredPromptFiles } = partitionPromptFilesByIgnore(loadedPromptFiles, options.ignore);

    if (options.reverse) {
        promptFiles.reverse();
    }

    return { promptFiles, ignoredPromptFiles };
}

/**
 * Splits prompt files into files that should be verified now and files ignored for this run.
 *
 * @public exported from `@promptbook/cli`
 */
export function partitionPromptFilesByIgnore(
    promptFiles: ReadonlyArray<PromptFile>,
    ignoreValues: ReadonlyArray<string>,
): { promptFiles: PromptFile[]; ignoredPromptFiles: PromptFile[] } {
    const normalizedIgnoreValues = normalizeIgnoreValues(ignoreValues);

    if (normalizedIgnoreValues.length === 0) {
        return {
            promptFiles: [...promptFiles],
            ignoredPromptFiles: [],
        };
    }

    const promptFilesToVerify: PromptFile[] = [];
    const ignoredPromptFiles: PromptFile[] = [];

    for (const promptFile of promptFiles) {
        if (matchesIgnoredPromptFile(promptFile, normalizedIgnoreValues)) {
            ignoredPromptFiles.push(promptFile);
        } else {
            promptFilesToVerify.push(promptFile);
        }
    }

    return {
        promptFiles: promptFilesToVerify,
        ignoredPromptFiles,
    };
}

/**
 * Ensures the destination directory for completed prompts exists.
 */
async function prepareArchiveDirectory(): Promise<void> {
    await mkdir(DONE_PROMPTS_DIR, { recursive: true });
}

/**
 * Normalizes verification options so the rest of the flow can assume stable defaults.
 */
function normalizeVerifyPromptsOptions(options: VerifyPromptsOptions): NormalizedVerifyPromptsOptions {
    return {
        reverse: options.reverse ?? false,
        ignore: normalizeIgnoreValues(options.ignore ?? []),
    };
}

/**
 * Normalizes ignore values and removes empty or duplicate entries case-insensitively.
 */
function normalizeIgnoreValues(ignoreValues: ReadonlyArray<string>): ReadonlyArray<string> {
    const normalizedIgnoreValues: string[] = [];
    const seenIgnoreValues = new Set<string>();

    for (const ignoreValue of ignoreValues) {
        const trimmedIgnoreValue = ignoreValue.trim();
        if (!trimmedIgnoreValue) {
            continue;
        }

        const lowerCasedIgnoreValue = trimmedIgnoreValue.toLowerCase();
        if (seenIgnoreValues.has(lowerCasedIgnoreValue)) {
            continue;
        }

        seenIgnoreValues.add(lowerCasedIgnoreValue);
        normalizedIgnoreValues.push(trimmedIgnoreValue);
    }

    return normalizedIgnoreValues;
}

/**
 * Reads one repeatable string option from raw CLI arguments.
 */
function readRepeatableStringOption(args: ReadonlyArray<string>, flag: string): ReadonlyArray<string> {
    const values: string[] = [];

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (!argument) {
            continue;
        }

        if (argument === flag) {
            const nextValue = args[index + 1];
            if (nextValue !== undefined && !nextValue.startsWith('--')) {
                values.push(nextValue);
                index += 1;
            }
            continue;
        }

        if (argument.startsWith(`${flag}=`)) {
            values.push(argument.slice(flag.length + 1));
        }
    }

    return values;
}

/**
 * Resolves whether a prompt file should be ignored for this verification run.
 */
function matchesIgnoredPromptFile(promptFile: PromptFile, ignoreValues: ReadonlyArray<string>): boolean {
    const searchableValues = [promptFile.name, getPromptFileFirstLine(promptFile)].map((value) => value.toLowerCase());
    return ignoreValues.some((ignoreValue) => {
        const lowerCasedIgnoreValue = ignoreValue.toLowerCase();
        return searchableValues.some((searchableValue) => searchableValue.includes(lowerCasedIgnoreValue));
    });
}

/**
 * Returns the first meaningful line of the prompt file after the status line.
 */
function getPromptFileFirstLine(promptFile: PromptFile): string {
    const firstSection = promptFile.sections[0];
    const startLineIndex =
        firstSection?.statusLineIndex !== undefined ? firstSection.statusLineIndex + 1 : (firstSection?.startLine ?? 0);

    for (let index = startLineIndex; index < promptFile.lines.length; index += 1) {
        const line = promptFile.lines[index];
        if (line !== undefined && line.trim() !== '') {
            return line.trim();
        }
    }

    return '';
}

/**
 * Displays the list of files that currently live in the prompts root.
 */
function displayTopLevelFileList(promptFiles: PromptFile[]): void {
    console.info(colors.cyan('\nTop-level prompt files:'));
    if (!promptFiles.length) {
        console.info(colors.gray('  (no prompt markdown files found for this run in prompts/)'));
        return;
    }

    for (const file of promptFiles) {
        const doneCount = file.sections.filter((section) => section.status === 'done').length;
        const todoCount = file.sections.filter((section) => section.status === 'todo').length;
        const notReadyCount = file.sections.filter((section) => section.status === 'not-ready').length;
        const needsVerification = file.sections.length > 0 && todoCount === 0 && doneCount > 0;
        const statusParts: string[] = [];

        if (needsVerification) {
            statusParts.push(colors.cyan.bold(`🔍 ${doneCount} done [x] - NEEDS VERIFICATION`));
        } else {
            if (todoCount > 0) {
                statusParts.push(colors.yellow(`${todoCount} todo [ ]`));
            }
            if (doneCount > 0) {
                statusParts.push(colors.green(`${doneCount} done [x]`));
            }
            if (notReadyCount > 0) {
                statusParts.push(colors.gray(`${notReadyCount} not-ready [-]`));
            }
        }

        if (!statusParts.length) {
            statusParts.push(colors.gray('no recognizable sections'));
        }

        console.info(`  ${statusParts.join(' · ')}  ${file.name}`);
    }

    console.info(colors.gray('Goal: verify all done prompts, then process remaining todo prompts.'));
}

/**
 * Finds the first file where at least one prompt is marked as done [x] and no prompts are todo [ ].
 * Completely ignores not-ready prompts like [-], [.], [?], etc.
 * Also excludes files that have been skipped in this session.
 */
function findFileWithAllDonePrompts(promptFiles: PromptFile[], skippedFiles: Set<string>): PromptFile | undefined {
    return promptFiles.find((file) => {
        if (file.sections.length === 0) {
            return false;
        }
        // Skip files that were already skipped in this session
        if (skippedFiles.has(file.path)) {
            return false;
        }
        // File is ready for verification if it has at least one done prompt and no todo prompts
        const hasTodoPrompts = file.sections.some((section) => section.status === 'todo');
        const hasDonePrompts = file.sections.some((section) => section.status === 'done');
        return !hasTodoPrompts && hasDonePrompts;
    });
}

/**
 * Verifies the last done [x] prompt in a file and decides whether to archive it or add a repair prompt.
 * Ignores not-ready prompts like [-], [.], [?], etc.
 * Returns true if the file was skipped, false otherwise.
 */
async function verifyDonePromptsInFile(file: PromptFile): Promise<boolean> {
    const doneCount = file.sections.filter((s) => s.status === 'done').length;

    console.info(colors.cyan.bold(`\n🔍 Verifying file: ${file.name}`));
    console.info(colors.gray(`${doneCount} done [x] prompt(s) ready to verify.`));

    // Find the last done prompt (ignore not-ready prompts)
    let lastDoneSection: PromptSection | undefined;
    for (let i = file.sections.length - 1; i >= 0; i--) {
        const section = file.sections[i];
        if (!section) {
            continue;
        }
        if (section.status === 'done') {
            lastDoneSection = section;
            break;
        }
    }

    if (!lastDoneSection) {
        console.info(colors.gray('No done [x] prompts found in this file.'));
        return false;
    }

    console.info(colors.gray('Verifying the last [x] prompt in the file...\n'));
    displayPromptSnippet({ file, section: lastDoneSection });
    const decision = await promptForDoneVerification(file, lastDoneSection);

    if (decision === 'done') {
        await archivePromptFile(file);
        return false;
    } else if (decision === 'needs-work') {
        console.info(colors.yellow('\n⚠️  This prompt needs repair.'));
        await appendRepairPrompt(file, lastDoneSection);
        return false;
    } else {
        console.info(colors.gray('\n⏩ Skipped, no changes made.'));
        return true;
    }
}

/**
 * Asks the user to verify if a done prompt is actually completed.
 * Returns 'done' if verified, 'needs-work' if not done, or 'skip' to skip this file.
 */
async function promptForDoneVerification(
    file: PromptFile,
    section: PromptSection,
): Promise<'done' | 'needs-work' | 'skip'> {
    const promptLabel = buildPromptLabelForDisplay(file, section);
    const response = await prompts<'verified'>(
        {
            type: 'select',
            name: 'verified',
            message: `Is ${colors.bold(promptLabel)} actually done?`,
            choices: [
                {
                    title: "✅ Yes, it's done",
                    value: 'done',
                },
                {
                    title: '❌ No, needs work',
                    value: 'needs-work',
                },
                {
                    title: '⏩ Skip, do nothing',
                    value: 'skip',
                },
            ],
            initial: 2,
        },
        {
            onCancel: () => {
                console.info(colors.yellow('Prompt verification interrupted.'));
                process.exit(0);
            },
        },
    );

    return response.verified as 'done' | 'needs-work' | 'skip';
}

/**
 * Changes a prompt's status from [x] or [-] to [ ].
 */
async function changePromptStatusToTodo(file: PromptFile, section: PromptSection): Promise<void> {
    if (section.statusLineIndex === undefined) {
        // If no status line exists, add one at the start of the section
        file.lines.splice(section.startLine, 0, '[ ]', '');
        await writePromptFile(file);
        return;
    }

    const statusLine = file.lines[section.statusLineIndex];
    if (statusLine === undefined) {
        file.lines.splice(section.startLine, 0, '[ ]', '');
        await writePromptFile(file);
        return;
    }
    const updatedLine = statusLine.replace(/\[(x|-)]\s*!*/i, '[ ]');
    file.lines[section.statusLineIndex] = updatedLine;
    await writePromptFile(file);
}

/**
 * Prints a summary of pending and resolved prompt sections.
 */
function displayPromptOverview(promptFiles: PromptFile[]): void {
    const totals = promptFiles.reduce(
        (acc, file) => {
            acc.total += file.sections.length;
            acc.todo += file.sections.filter((section) => section.status === 'todo').length;
            acc.done += file.sections.filter((section) => section.status === 'done').length;
            acc.notReady += file.sections.filter((section) => section.status === 'not-ready').length;
            return acc;
        },
        { total: 0, todo: 0, done: 0, notReady: 0 },
    );

    console.info(colors.white.bold('\nPrompt queue summary:'));
    console.info(
        `  ${colors.green(`${totals.done} done [x]`)} ${colors.yellow(`${totals.todo} todo [ ]`)} ${colors.gray(
            `${totals.notReady} not-ready`,
        )} (total ${totals.total})`,
    );

    const filesNeedingVerification = promptFiles.filter((file) => {
        if (file.sections.length === 0) return false;
        const hasTodo = file.sections.some((section) => section.status === 'todo');
        const hasDone = file.sections.some((section) => section.status === 'done');
        return !hasTodo && hasDone;
    });
    const pendingFiles = promptFiles.filter((file) => file.sections.some((section) => section.status === 'todo'));

    if (filesNeedingVerification.length) {
        const formattedNames = formatPendingFileNames(filesNeedingVerification.map((file) => file.name));
        console.info(
            colors.cyan(`  🔍 Files needing verification (${filesNeedingVerification.length}): ${formattedNames}`),
        );
    }

    if (pendingFiles.length) {
        const formattedNames = formatPendingFileNames(pendingFiles.map((file) => file.name));
        console.info(colors.gray(`  Todo files (${pendingFiles.length}): ${formattedNames}`));
    }

    if (!filesNeedingVerification.length && !pendingFiles.length) {
        console.info(colors.green('  All files have been verified!'));
    }
}

/**
 * Resolves a single prompt section by asking the user for its status.
 */
async function resolvePrompt(selection: PromptSelection): Promise<void> {
    displayPromptSnippet(selection);
    const decision = await promptForDecision(selection);

    if (decision === 'done') {
        await archivePromptFile(selection.file);
    } else {
        await appendRepairPrompt(selection.file, selection.section);
    }
}

/**
 * Presents the interactive decision menu for the current prompt section.
 */
async function promptForDecision(selection: PromptSelection): Promise<PromptDecision> {
    const promptLabel = buildPromptLabelForDisplay(selection.file, selection.section);
    const response = await prompts<'decision'>(
        {
            type: 'select',
            name: 'decision',
            message: `Is ${colors.bold(promptLabel)} resolved?`,
            choices: [
                {
                    title: '✅ Done — archive the prompt',
                    value: 'done',
                    // description: 'Move this file under prompts/done',
                },
                {
                    title: '🛠️ Not done — add follow-up prompt',
                    value: 'not-done',
                    // description: 'Append a Fix prompt referencing the previous section',
                },
            ],
            initial: 0,
        },
        {
            onCancel: () => {
                console.info(colors.yellow('Prompt verification interrupted.'));
                process.exit(0);
            },
        },
    );

    return response.decision as PromptDecision;
}

/**
 * Prints a short snippet of the current prompt section for context.
 */
function displayPromptSnippet(selection: PromptSelection): void {
    const { file, section } = selection;
    const label = buildPromptLabelForDisplay(file, section);
    console.info(colors.blue(`\n👉 Reviewing ${label}`));

    const snippetLines = file.lines.slice(section.startLine, section.endLine + 1);
    const snippet = snippetLines.join(file.eol).trim();
    const preview =
        snippet.length > SNIPPET_CHAR_LIMIT
            ? `${snippet.slice(0, SNIPPET_CHAR_LIMIT)}…`
            : snippet || '(no prompt text found)';

    const relativePath = relative(process.cwd(), file.path);
    console.info(colors.gray(`File: ${relativePath} (lines ${section.startLine + 1}-${section.endLine + 1})`));
    console.info(colors.white(preview));
}

/**
 * Moves a prompt file to the done folder, avoiding name collisions.
 */
async function archivePromptFile(file: PromptFile): Promise<void> {
    const destination = join(DONE_PROMPTS_DIR, file.name);
    const uniqueDestination = await ensureUniqueDestination(destination);
    await rename(file.path, uniqueDestination);
    const relativePath = relative(process.cwd(), uniqueDestination);
    console.info(colors.green(`  Archived ${file.name} → ${relativePath}`));
}

/**
 * Adds the repair prompt template to the end of a file that still has `[ ]` prompts.
 */
async function appendRepairPrompt(file: PromptFile, section: PromptSection): Promise<void> {
    const headline = extractPromptHeadline(file, section);
    const emojiTag = headline?.emoji ?? '✨';
    const previousTitle = headline?.title ?? 'previous prompt';
    const sanitizedTitle = previousTitle.replace(/"/g, '\\"');
    const fixTitle = `Fix "${sanitizedTitle}"`;

    const lastLine = file.lines[file.lines.length - 1];
    if (file.lines.length && lastLine !== undefined && lastLine.trim() !== '') {
        file.lines.push('');
    }

    file.lines.push(
        '---',
        '',
        `[ ]`,
        '',
        `[${emojiTag}] ${fixTitle}`,
        '',
        '-   @@@',
        `-   You have implemented the "${sanitizedTitle}" feature, but it is not working, fix it`,
        '',
    );

    file.hasFinalEol = true;
    await writePromptFile(file);
    console.info(colors.yellow(`  Added repair prompt referencing "${previousTitle}".`));
}

/**
 * Extracts the emoji badge and title of the previous prompt section.
 */
function extractPromptHeadline(file: PromptFile, section: PromptSection): { emoji: string; title: string } | undefined {
    const startIndex = (section.statusLineIndex ?? section.startLine) + 1;

    for (let i = startIndex; i <= section.endLine; i += 1) {
        const raw = file.lines[i];
        if (!raw) {
            continue;
        }

        const trimmed = raw.trim();
        if (!trimmed) {
            continue;
        }

        const match = trimmed.match(/^\[(?<emoji>[^\]]+)\]\s*(?<title>.+)$/);
        if (match?.groups?.title) {
            return {
                emoji: match.groups.emoji?.trim() || '✨',
                title: match.groups.title.trim(),
            };
        }
    }

    return undefined;
}

/**
 * Limits the number of pending file names shown in the overview.
 */
function formatPendingFileNames(fileNames: string[]): string {
    const namesToShow = fileNames.slice(0, MAX_PENDING_FILE_NAMES);
    const suffix =
        fileNames.length > MAX_PENDING_FILE_NAMES ? ` +${fileNames.length - MAX_PENDING_FILE_NAMES} more` : '';
    return `${namesToShow.map((name) => colors.yellow(name)).join(', ')}${suffix}`;
}

/**
 * Ensures the destination path does not collide with existing files.
 */
async function ensureUniqueDestination(basePath: string): Promise<string> {
    try {
        await stat(basePath);
    } catch (error) {
        if (isNotFound(error)) {
            return basePath;
        }
        throw error;
    }

    const extension = extname(basePath);
    const baseName = basePath.slice(0, basePath.length - extension.length);

    let counter = 1;
    while (true) {
        const candidate = `${baseName}-${counter}${extension}`;
        try {
            await stat(candidate);
            counter += 1;
        } catch (error) {
            if (isNotFound(error)) {
                return candidate;
            }
            throw error;
        }
    }
}

/**
 * Detects ENOENT errors thrown by fs utilities.
 */
function isNotFound(error: unknown): boolean {
    return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

// Note: When run as a standalone script, call the exported function
if (require.main === module) {
    verifyPrompts(DEFAULT_VERIFY_PROMPTS_OPTIONS).catch((error) => {
        console.error(colors.bgRed('Prompt verification failed:'), error);
        process.exit(1);
    });
}
