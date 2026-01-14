#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join, relative } from 'path';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../src/errors/assertsError';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { just } from '../../src/utils/organization/just';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { OpenAiCodexRunner } from './OpenAiCodexRunner';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const PROMPTS_DIR = join(process.cwd(), 'prompts');

run()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

type PromptStatus = 'done' | 'todo' | 'not-ready';

type PromptSection = {
    index: number;
    startLine: number;
    endLine: number;
    status: PromptStatus;
    statusLineIndex?: number;
};

type PromptFile = {
    path: string;
    name: string;
    lines: string[];
    eol: string;
    hasFinalEol: boolean;
    sections: PromptSection[];
};

type PromptStats = {
    total: number;
    done: number;
    todo: number;
    notReady: number;
};

async function run(): Promise<void> {
    const runner = new OpenAiCodexRunner({
        codexCommand: 'codex',
        model: 'gpt-5.2-codex',
        sandbox: 'danger-full-access',
        askForApproval: 'never',
    });

    console.info(colors.green(`Running prompts with ${runner.name}`));

    while (just(true)) {
        const promptFiles = await loadPromptFiles(PROMPTS_DIR);
        const stats = summarizePrompts(promptFiles);
        printStats(stats);

        const nextPrompt = findNextTodoPrompt(promptFiles);
        if (!nextPrompt) {
            console.info(colors.green('All prompts are done.'));
            return;
        }

        await ensureWorkingTreeClean();

        const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
        const codexPrompt = buildCodexPrompt(nextPrompt.file, nextPrompt.section);

        markPromptDone(nextPrompt.file, nextPrompt.section);
        await writePromptFile(nextPrompt.file);

        const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);
        const promptLabel = `${relative(process.cwd(), nextPrompt.file.path)}#${nextPrompt.section.index + 1}`;

        console.info(colors.blue(`Processing ${promptLabel}`));

        await runner.runPrompt({
            prompt: codexPrompt,
            scriptPath,
            projectPath: process.cwd(),
        });

        await commitChanges(commitMessage);
    }
}

async function loadPromptFiles(promptsDir: string): Promise<PromptFile[]> {
    const entries = await readdir(promptsDir, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map((entry) => join(promptsDir, entry.name))
        .sort((a, b) => a.localeCompare(b));

    const promptFiles: PromptFile[] = [];
    for (const filePath of files) {
        const content = await readFile(filePath, 'utf-8');
        promptFiles.push(parsePromptFile(filePath, content));
    }

    return promptFiles;
}

function parsePromptFile(filePath: string, content: string): PromptFile {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const hasFinalEol = content.endsWith('\n');
    const lines = content.split(/\r?\n/);
    const sections: PromptSection[] = [];

    let startLine = 0;
    let index = 0;

    for (let i = 0; i <= lines.length; i++) {
        const isSeparator = i < lines.length && lines[i].trim() === '---';
        const isEnd = i === lines.length;
        if (!isSeparator && !isEnd) {
            continue;
        }

        const endLine = i - 1;
        const firstNonEmptyLine = findFirstNonEmptyLine(lines, startLine, endLine);
        if (firstNonEmptyLine !== undefined) {
            const statusLine = lines[firstNonEmptyLine].trim();
            let status: PromptStatus = 'not-ready';

            if (statusLine === '[x]' || statusLine === '[X]') {
                status = 'done';
            } else if (statusLine === '[ ]') {
                status = 'todo';
            }

            sections.push({
                index,
                startLine,
                endLine,
                status,
                statusLineIndex: status === 'not-ready' ? undefined : firstNonEmptyLine,
            });
            index += 1;
        }

        startLine = i + 1;
    }

    return {
        path: filePath,
        name: basename(filePath),
        lines,
        eol,
        hasFinalEol,
        sections,
    };
}

function findFirstNonEmptyLine(lines: string[], startLine: number, endLine: number): number | undefined {
    for (let i = startLine; i <= endLine; i++) {
        if (lines[i] !== undefined && lines[i].trim() !== '') {
            return i;
        }
    }
    return undefined;
}

function summarizePrompts(files: PromptFile[]): PromptStats {
    const stats: PromptStats = { total: 0, done: 0, todo: 0, notReady: 0 };

    for (const file of files) {
        for (const section of file.sections) {
            stats.total += 1;
            if (section.status === 'done') {
                stats.done += 1;
            } else if (section.status === 'todo') {
                stats.todo += 1;
            } else {
                stats.notReady += 1;
            }
        }
    }

    return stats;
}

function printStats(stats: PromptStats): void {
    console.info(
        colors.cyan(
            `Prompts total: ${stats.total} | done: ${stats.done} | todo: ${stats.todo} | not ready: ${stats.notReady}`,
        ),
    );
}

function findNextTodoPrompt(files: PromptFile[]): { file: PromptFile; section: PromptSection } | undefined {
    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'todo') {
                return { file, section };
            }
        }
    }
    return undefined;
}

async function ensureWorkingTreeClean(): Promise<void> {
    const isClean = await isWorkingTreeClean(process.cwd());
    if (!isClean) {
        throw new Error('Git working tree is not clean. Aborting.');
    }
}

function buildCommitMessage(file: PromptFile, section: PromptSection): string {
    const lines = buildPromptLinesWithoutStatus(file, section);
    return lines.join(file.eol);
}

function buildCodexPrompt(file: PromptFile, section: PromptSection): string {
    const lines = buildPromptLinesWithoutStatus(file, section);

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            continue;
        }
        lines[i] = lines[i].replace(/^\[[^\]]+\]\s*/, '');
        break;
    }

    return lines.join(file.eol);
}

function buildPromptLinesWithoutStatus(file: PromptFile, section: PromptSection): string[] {
    const lines = file.lines.slice(section.startLine, section.endLine + 1);

    if (section.statusLineIndex !== undefined) {
        const relativeIndex = section.statusLineIndex - section.startLine;
        if (relativeIndex >= 0 && relativeIndex < lines.length) {
            lines.splice(relativeIndex, 1);
        }
    }

    return trimEmptyEdges(lines);
}

function trimEmptyEdges(lines: string[]): string[] {
    let start = 0;
    while (start < lines.length && lines[start].trim() === '') {
        start += 1;
    }
    let end = lines.length - 1;
    while (end >= start && lines[end].trim() === '') {
        end -= 1;
    }
    return lines.slice(start, end + 1);
}

function markPromptDone(file: PromptFile, section: PromptSection): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    file.lines[section.statusLineIndex] = line.replace('[ ]', '[x]');
}

async function writePromptFile(file: PromptFile): Promise<void> {
    const content = file.lines.join(file.eol) + (file.hasFinalEol ? file.eol : '');
    await writeFile(file.path, content, 'utf-8');
}

function buildScriptPath(file: PromptFile, section: PromptSection): string {
    const basePath = file.path.replace(/\.md$/i, '');
    const suffix = file.sections.length > 1 ? `-${section.index + 1}` : '';
    return `${basePath}${suffix}.sh`;
}

type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    codexCommand: string;
};

export function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = 'CODEX_PROMPT';
    const projectPath = toPosixPath(options.projectPath);

    return spaceTrim(
        (block) => `
            ${options.codexCommand} \
              --ask-for-approval ${options.askForApproval} \
              exec --model ${options.model} \
              --sandbox ${options.sandbox} \
              -C ${projectPath} \
              <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}

export function toPosixPath(filePath: string): string {
    if (process.platform === 'win32') {
        const match = filePath.match(/^([a-zA-Z]):\\(.*)$/);
        if (match) {
            return `/${match[1]!.toLowerCase()}/${match[2]!.replace(/\\/g, '/')}`;
        }
    }
    return filePath.replace(/\\/g, '/');
}

async function commitChanges(message: string): Promise<void> {
    const commitMessagePath = join(process.cwd(), '.tmp', 'codex-prompts', `COMMIT_MESSAGE_${Date.now()}.txt`);
    await mkdir(dirname(commitMessagePath), { recursive: true });
    await writeFile(commitMessagePath, message, 'utf-8');

    try {
        await $execCommand({
            command: 'git add .',
        });

        await $execCommand({
            command: `git commit --file "${commitMessagePath}"`,
        });
    } finally {
        await unlink(commitMessagePath).catch(() => undefined);
    }
}

/**
 * Note: [?] Code in this file should never be published in any package
 */
