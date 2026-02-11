#!/usr/bin/env ts-node

import colors from 'colors';
import prompts from 'prompts';
import { extname, join, relative } from 'path';
import { mkdir, rename, stat } from 'fs/promises';
import { buildPromptLabelForDisplay } from '../run-codex-prompts/prompts/buildPromptLabelForDisplay';
import { findNextTodoPrompt } from '../run-codex-prompts/prompts/findNextTodoPrompt';
import { loadPromptFiles } from '../run-codex-prompts/prompts/loadPromptFiles';
import { writePromptFile } from '../run-codex-prompts/prompts/writePromptFile';
import type { PromptFile } from '../run-codex-prompts/prompts/types/PromptFile';
import type { PromptSection } from '../run-codex-prompts/prompts/types/PromptSection';
import type { PromptSelection } from '../run-codex-prompts/prompts/types/PromptSelection';

/** Path to the directory that holds the prompt markdown files. */
const PROMPTS_DIR = join(process.cwd(), 'prompts');

/** Destination directory for resolved prompts. */
const DONE_PROMPTS_DIR = join(PROMPTS_DIR, 'done');

/** Maximum number of characters to display when previewing a prompt block. */
const SNIPPET_CHAR_LIMIT = 900;

/** Maximum number of file names to show in the pending-files preview. */
const MAX_PENDING_FILE_NAMES = 8;

/** Possible user decisions after reviewing a prompt section. */
type PromptDecision = 'done' | 'not-done';

/**
 * Starts the verification loop and exits when no `[ ]` prompts remain.
 */
async function main(): Promise<void> {
    console.info(colors.cyan.bold('📋 Prompt verification helper'));
    const initialFiles = await loadPromptFiles(PROMPTS_DIR);
    displayTopLevelFileList(initialFiles);
    await prepareArchiveDirectory();

    let promptFiles = initialFiles;

    while (true) {
        displayPromptOverview(promptFiles);
        const nextPrompt = findNextTodoPrompt(promptFiles);
        if (!nextPrompt) {
            console.info(colors.green('\n✅ All top-level prompts are marked as done.'));
            break;
        }

        await resolvePrompt(nextPrompt);
        promptFiles = await loadPromptFiles(PROMPTS_DIR);
    }
}

/**
 * Ensures the destination directory for completed prompts exists.
 */
async function prepareArchiveDirectory(): Promise<void> {
    await mkdir(DONE_PROMPTS_DIR, { recursive: true });
}

/**
 * Displays the list of files that currently live in the prompts root.
 */
function displayTopLevelFileList(promptFiles: PromptFile[]): void {
    console.info(colors.cyan('\nTop-level prompt files:'));
    if (!promptFiles.length) {
        console.info(colors.gray('  (no markdown files found in prompts/)'));
        return;
    }

    for (const file of promptFiles) {
        const doneCount = file.sections.filter((section) => section.status === 'done').length;
        const todoCount = file.sections.filter((section) => section.status === 'todo').length;
        const notReadyCount = file.sections.filter((section) => section.status === 'not-ready').length;
        const statusParts: string[] = [];
        if (todoCount > 0) {
            statusParts.push(colors.yellow(`${todoCount} todo [ ]`));
        }
        if (doneCount > 0) {
            statusParts.push(colors.green(`${doneCount} done [x]`));
        }
        if (notReadyCount > 0) {
            statusParts.push(colors.gray(`${notReadyCount} not-ready`));
        }
        if (!statusParts.length) {
            statusParts.push(colors.gray('no recognizable sections'));
        }

        console.info(`  ${statusParts.join(' · ')}  ${file.name}`);
    }

    console.info(colors.gray('Goal: keep this folder populated only with prompts that still need review ([ ]).'));
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

    const pendingFiles = promptFiles.filter((file) => file.sections.some((section) => section.status === 'todo'));
    if (pendingFiles.length) {
        const formattedNames = formatPendingFileNames(pendingFiles.map((file) => file.name));
        console.info(colors.gray(`  Pending files (${pendingFiles.length}): ${formattedNames}`));
    } else {
        console.info(colors.green('  No files currently contain `[ ]` prompts.'));
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
    const response = await prompts<{ decision: PromptDecision }>(
        {
            type: 'select',
            name: 'decision',
            message: `Is ${colors.bold(promptLabel)} resolved?`,
            choices: [
                {
                    title: '✅ Done — archive the prompt',
                    value: 'done',
                    description: 'Move this file under prompts/done',
                },
                {
                    title: '🛠️ Not done — add follow-up prompt',
                    value: 'not-done',
                    description: 'Append a Fix prompt referencing the previous section',
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

    return response.decision;
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
        snippet.length > SNIPPET_CHAR_LIMIT ? `${snippet.slice(0, SNIPPET_CHAR_LIMIT)}…` : snippet || '(no prompt text found)';

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

    if (file.lines.length && file.lines[file.lines.length - 1].trim() !== '') {
        file.lines.push('');
    }

    file.lines.push(
        '---',
        '',
        '[ ]',
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
                emoji: match.groups.emoji.trim() || '✨',
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
    const suffix = fileNames.length > MAX_PENDING_FILE_NAMES ? ` +${fileNames.length - MAX_PENDING_FILE_NAMES} more` : '';
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

main().catch((error) => {
    console.error(colors.bgRed('Prompt verification failed:'), error);
    process.exit(1);
});
