#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join, relative } from 'path';
import { createInterface } from 'readline';
import { assertsError } from '../../src/errors/assertsError';
import type { Usage } from '../../src/execution/Usage';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { just } from '../../src/utils/organization/just';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { ClaudeCodeRunner } from './runners/ClaudeCodeRunner';
import { ClineRunner } from './runners/ClineRunner';
import { OpenAiCodexRunner } from './runners/OpenAiCodexRunner';
import { PromptRunner } from './runners/_PromptRunner';
import { formatUsagePrice } from './runners/utils/formatUsagePrice';

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
    priority: number;
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
    done: number;
    forAgent: number;
    toBeWritten: number;
};

type RunOptions = {
    waitForUser: boolean;
    agentName: 'openai-codex' | 'cline' | 'claude-code';
};

type UpcomingTask = {
    label: string;
    summary: string;
    priority: number;
};

async function run(): Promise<void> {
    const options = parseRunOptions(process.argv.slice(2));

    let runner: PromptRunner;

    if (options.agentName === 'openai-codex') {
        runner = new OpenAiCodexRunner({
            codexCommand: 'codex',
            model: 'gpt-5.2-codex',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
        });
    } else if (options.agentName === 'cline') {
        runner = new ClineRunner({
            model: 'gemini:gemini-3-flash-preview',
        });
    } else if (options.agentName === 'claude-code') {
        runner = new ClaudeCodeRunner();
    } else {
        throw new Error(`Unknown agent: ${options.agentName}`);
    }

    console.info(colors.green(`Running prompts with ${runner.name}`));

    let hasShownUpcomingTasks = false;
    let hasWaitedForStart = false;

    while (just(true)) {
        const promptFiles = await loadPromptFiles(PROMPTS_DIR);
        const stats = summarizePrompts(promptFiles);
        printStats(stats);

        const nextPrompt = findNextTodoPrompt(promptFiles);
        if (!nextPrompt) {
            console.info(colors.green('All prompts are done.'));
            return;
        }

        if (!hasShownUpcomingTasks) {
            printUpcomingTasks(listUpcomingTasks(promptFiles));
            hasShownUpcomingTasks = true;
        }

        if (options.waitForUser && !hasWaitedForStart) {
            await waitForEnter(colors.bgWhite('Press Enter to start the first task...'));
        }
        hasWaitedForStart = true;

        await ensureWorkingTreeClean();

        const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
        const codexPrompt = buildCodexPrompt(nextPrompt.file, nextPrompt.section);

        const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);
        const promptLabel = buildPromptLabel(nextPrompt.file, nextPrompt.section);

        console.info(colors.blue(`Processing ${promptLabel}`));

        const result = await runner.runPrompt({
            prompt: codexPrompt,
            scriptPath,
            projectPath: process.cwd(),
        });

        markPromptDone(nextPrompt.file, nextPrompt.section, result.usage);
        await writePromptFile(nextPrompt.file);

        if (options.waitForUser) {
            printCommitMessage(commitMessage);
            await waitForEnter(colors.bgWhite('Press Enter to commit and continue...'));
        }

        await commitChanges(commitMessage);
    }
}

function parseRunOptions(args: string[]): RunOptions {
    let agentName: 'openai-codex' | 'cline' | 'claude-code' | undefined = undefined;

    if (args.includes('--agent')) {
        const index = args.indexOf('--agent');
        const value = args[index + 1];
        if (value === 'openai-codex' || value === 'cline' || value === 'claude-code') {
            agentName = value;
        }
    }

    if (!agentName) {
        console.error(colors.red('You must choose an agent using --agent <openai-codex|cline|claude-code>'));
        console.error(colors.gray('Usage: run-codex-prompts --agent <agent-name> [--no-wait]'));
        process.exit(1);
    }

    return {
        waitForUser: !args.includes('--no-wait'),
        agentName,
    };
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
            const parsedStatus = parseStatusLine(statusLine);
            const status = parsedStatus?.status ?? 'not-ready';
            const priority = parsedStatus?.priority ?? 0;

            sections.push({
                index,
                startLine,
                endLine,
                status,
                priority,
                statusLineIndex: parsedStatus ? firstNonEmptyLine : undefined,
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

function parseStatusLine(line: string): { status: PromptStatus; priority: number } | undefined {
    const match = line.match(/^\[(?<status>[ xX])\]\s*(?<priority>!*)\s*$/);
    if (!match) {
        return undefined;
    }
    const status = match.groups?.status?.toLowerCase() === 'x' ? 'done' : 'todo';
    const priority = status === 'todo' ? match.groups?.priority?.length ?? 0 : 0;
    return { status, priority };
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
    const stats: PromptStats = { done: 0, forAgent: 0, toBeWritten: 0 };

    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'done') {
                stats.done += 1;
            } else if (section.status === 'todo') {
                const promptText = buildCodexPrompt(file, section);
                if (promptText.includes('@@@')) {
                    stats.toBeWritten += 1;
                } else {
                    stats.forAgent += 1;
                }
            }
        }
    }

    return stats;
}

function printStats(stats: PromptStats): void {
    console.info(
        colors.cyan(`Done: ${stats.done} | For agent: ${stats.forAgent} | To be written: ${stats.toBeWritten}`),
    );
}

function listUpcomingTasks(files: PromptFile[]): UpcomingTask[] {
    return listTodoPrompts(files).map(({ file, section }) => ({
        label: buildPromptLabel(file, section),
        summary: buildPromptSummary(file, section),
        priority: section.priority,
    }));
}

function printUpcomingTasks(tasks: UpcomingTask[]): void {
    if (tasks.length === 0) {
        console.info(colors.green('No upcoming tasks.'));
        return;
    }

    console.info(colors.cyan('Upcoming tasks (grouped by priority):'));
    for (const group of groupUpcomingTasksByPriority(tasks)) {
        console.info(colors.cyan(`Priority ${group.priority}:`));
        for (const [index, task] of group.tasks.entries()) {
            const summary = task.summary ? ` - ${task.summary}` : '';
            console.info(` ${index + 1}. ${task.label}${summary}`);
        }
    }
}

function groupUpcomingTasksByPriority(tasks: UpcomingTask[]): Array<{ priority: number; tasks: UpcomingTask[] }> {
    const grouped = new Map<number, UpcomingTask[]>();
    for (const task of tasks) {
        const group = grouped.get(task.priority);
        if (group) {
            group.push(task);
        } else {
            grouped.set(task.priority, [task]);
        }
    }

    return Array.from(grouped.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([priority, groupedTasks]) => ({ priority, tasks: groupedTasks }));
}

function buildPromptLabel(file: PromptFile, section: PromptSection): string {
    return `${relative(process.cwd(), file.path)}#${section.index + 1}`;
}

function buildPromptSummary(file: PromptFile, section: PromptSection): string {
    const lines = buildCodexPrompt(file, section).split(/\r?\n/);
    const firstLine = lines.find((line) => line.trim() !== '');
    return firstLine?.trim() || '(empty prompt)';
}

function findNextTodoPrompt(files: PromptFile[]): { file: PromptFile; section: PromptSection } | undefined {
    let nextPrompt: { file: PromptFile; section: PromptSection } | undefined;

    for (const prompt of listTodoPrompts(files)) {
        const promptText = buildCodexPrompt(prompt.file, prompt.section);
        if (promptText.includes('@@@')) {
            continue;
        }
        if (!nextPrompt || prompt.section.priority > nextPrompt.section.priority) {
            nextPrompt = prompt;
        }
    }

    return nextPrompt;
}

function listTodoPrompts(files: PromptFile[]): Array<{ file: PromptFile; section: PromptSection }> {
    const prompts: Array<{ file: PromptFile; section: PromptSection }> = [];
    for (const file of files) {
        for (const section of file.sections) {
            if (section.status === 'todo') {
                prompts.push({ file, section });
            }
        }
    }
    return prompts;
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

function markPromptDone(file: PromptFile, section: PromptSection, usage: Usage): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    const priceString = formatUsagePrice(usage);

    // Replace "[ ]" or "[ ] !!..." with "[x] $price"
    file.lines[section.statusLineIndex] = line.replace(/\[\s*\]\s*!*\s*$/, `[x] ${priceString}`);
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

function printCommitMessage(message: string): void {
    console.info(colors.cyan('Commit message:'));
    console.info(formatCommitMessageForDisplay(message));
}

function formatCommitMessageForDisplay(message: string): string {
    const lines = message.split(/\r?\n/);
    return lines.map((line) => colors.bgBlue.white(` ${line} `)).join('\n');
}

async function waitForEnter(prompt: string): Promise<void> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await new Promise<void>((resolve) => {
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}

/**
 * @deprecated Use `toPosixPath` from `./runners/utils/$runGoScript` instead
 */
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
 * TODO: Prompt: Split utiluity functions into separate files in ./utils
 * Note: [⚫] Code in this file should never be published in any package
 */
