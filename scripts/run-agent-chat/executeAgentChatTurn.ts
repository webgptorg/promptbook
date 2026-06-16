import { mkdir, readFile, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { Book } from '../../src/book-3.0/Book';
import type { string_book } from '../../src/book-2.0/agent-source/string_book';
import {
    AGENT_BOOK_FILE_PATH,
    AGENT_QUEUED_MESSAGES_DIRECTORY_PATH,
} from '../../src/book-3.0/agentFolderPaths';
import { NotAllowed } from '../../src/errors/NotAllowed';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { resolvePromptbookTemporaryPath } from '../../src/utils/filesystem/promptbookTemporaryPath';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';
import { $randomToken } from '../../src/utils/random/$randomToken';
import { appendCoderContext } from '../run-codex-prompts/common/appendCoderContext';
import { withPromptRuntimeLog } from '../run-codex-prompts/common/runGoScript/withPromptRuntimeLog';
import type { RunOptions } from '../run-codex-prompts/cli/RunOptions';
import { resolvePromptRunner } from '../run-codex-prompts/main/resolvePromptRunner';
import { buildAgentMessagePrompt } from '../run-agent-messages/messages/buildAgentMessagePrompt';
import { buildAgentMessageScriptPath } from '../run-agent-messages/messages/buildAgentMessageScriptPath';
import { createAgentRunnerSystemMessage } from '../run-agent-messages/messages/createAgentRunnerSystemMessage';
import type { AgentMessageFile } from '../run-agent-messages/messages/AgentMessageFile';
import type { AgentCliHistoryMessage, AgentCliRunOptions } from './AgentCliRunOptions';

/**
 * Stable message-book filename reused for one temporary chat session.
 */
const AGENT_CHAT_MESSAGE_FILE_NAME = 'thread.book';

/**
 * Directory name used for `ptbk agent` temporary chat workspaces.
 */
const AGENT_CHAT_TEMPORARY_DIRECTORY_NAME = 'agent';

/**
 * Directory name grouping individual `ptbk agent` sessions.
 */
const AGENT_CHAT_SESSIONS_DIRECTORY_NAME = 'sessions';

/**
 * Result of one local agent CLI turn.
 */
export type AgentChatTurnResult = {
    readonly answer: string;
    readonly workspacePath: string;
    readonly messageFilePath: string;
    readonly agentPath: string;
};

/**
 * Options for executing one local agent CLI turn.
 */
export type ExecuteAgentChatTurnOptions = AgentCliRunOptions & {
    readonly messages: ReadonlyArray<AgentCliHistoryMessage>;
    readonly workspacePath?: string;
};

/**
 * Executes one user turn by asking the selected harness to append `MESSAGE @Agent` to a temporary thread book.
 */
export async function executeAgentChatTurn(options: ExecuteAgentChatTurnOptions): Promise<AgentChatTurnResult> {
    const currentWorkingDirectory = options.currentWorkingDirectory || process.cwd();
    const agentSourceFile = await readAgentSourceFile(options.agentPath, currentWorkingDirectory);
    const workspacePath =
        options.workspacePath ||
        createAgentChatWorkspacePath({
            currentWorkingDirectory,
            agentPath: agentSourceFile.agentPath,
        });

    await prepareAgentChatWorkspace({
        workspacePath,
        agentSource: agentSourceFile.agentSource,
    });

    const messageFile = await writeQueuedMessageBook({
        workspacePath,
        messages: options.messages,
    });
    const agentSystemMessage = await createAgentRunnerSystemMessage(agentSourceFile.agentSource);
    const prompt = appendAgentCliContext(
        buildAgentMessagePrompt(messageFile.relativePath, agentSystemMessage),
        options.context,
    );
    const scriptPath = buildAgentMessageScriptPath(workspacePath, messageFile);
    const { runner } = resolvePromptRunner(createPromptRunnerOptions(options));

    await withPromptRuntimeLog(
        scriptPath,
        async (logPath) => {
            await runner.runPrompt({
                prompt,
                scriptPath,
                projectPath: workspacePath,
                logPath,
                shouldPrintLiveOutput: options.isVerbose,
                preserveArtifactsOnSuccess: false,
            });
        },
        { preserveArtifactsOnSuccess: false },
    );

    const updatedMessageBook = await readFile(messageFile.absolutePath, 'utf-8');
    const answer = parseAgentAnswerFromMessageBook({
        bookContent: updatedMessageBook,
        expectedMessagesBeforeAnswer: options.messages.length,
    });

    if (!answer) {
        throw new NotAllowed(
            spaceTrim(`
                The selected harness finished, but it did not append a new \`MESSAGE @Agent\` answer.

                - Message file: \`${messageFile.relativePath}\`
                - Workspace: \`${workspacePath}\`

                The agent harness must only edit the queued message file by appending one new agent message.
            `),
        );
    }

    return {
        answer,
        workspacePath,
        messageFilePath: messageFile.absolutePath,
        agentPath: agentSourceFile.agentPath,
    };
}

/**
 * Creates an isolated workspace path under the project-local Promptbook temporary directory.
 */
export function createAgentChatWorkspacePath(options: {
    readonly currentWorkingDirectory: string;
    readonly agentPath: string;
}): string {
    const safeAgentName = basename(options.agentPath)
        .replace(/\.[^.]+$/u, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/gu, '-')
        .replace(/^[._-]+|[._-]+$/gu, '');
    const sessionName = [
        safeAgentName || 'agent',
        Date.now().toString(36),
        $randomToken(4),
    ].join('-');

    return resolvePromptbookTemporaryPath(
        options.currentWorkingDirectory,
        AGENT_CHAT_TEMPORARY_DIRECTORY_NAME,
        AGENT_CHAT_SESSIONS_DIRECTORY_NAME,
        sessionName,
    );
}

/**
 * Reads and validates the source book path selected through `--agent`.
 */
async function readAgentSourceFile(
    agentPathReference: string,
    currentWorkingDirectory: string,
): Promise<{ agentPath: string; agentSource: string_book }> {
    const agentPath = resolve(currentWorkingDirectory, agentPathReference);
    const agentPathStats = await readFile(agentPath, 'utf-8')
        .then((agentSource) => ({ agentSource }))
        .catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT' || error.code === 'EISDIR') {
                return undefined;
            }
            throw error;
        });

    if (!agentPathStats) {
        throw new NotFoundError(
            spaceTrim(`
                Agent book \`${agentPathReference}\` was not found or is not a file.

                Pass a path to a \`.book\` file in \`--agent\`.
            `),
        );
    }

    return {
        agentPath,
        agentSource: agentPathStats.agentSource as string_book,
    };
}

/**
 * Writes the local `agent.book` and message queue directory expected by the shared prompt contract.
 */
async function prepareAgentChatWorkspace(options: {
    readonly workspacePath: string;
    readonly agentSource: string_book;
}): Promise<void> {
    await mkdir(join(options.workspacePath, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH), { recursive: true });
    await writeFile(join(options.workspacePath, AGENT_BOOK_FILE_PATH), normalizeAgentSource(options.agentSource), 'utf-8');
}

/**
 * Persists the current in-memory thread into the queued message book.
 */
async function writeQueuedMessageBook(options: {
    readonly workspacePath: string;
    readonly messages: ReadonlyArray<AgentCliHistoryMessage>;
}): Promise<AgentMessageFile> {
    const messageRelativePath = normalizeRelativePath(
        join(AGENT_QUEUED_MESSAGES_DIRECTORY_PATH, AGENT_CHAT_MESSAGE_FILE_NAME),
    );
    const messageAbsolutePath = join(options.workspacePath, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH, AGENT_CHAT_MESSAGE_FILE_NAME);

    await writeFile(messageAbsolutePath, Book.fromMessages(options.messages).stringify(), 'utf-8');

    return {
        absolutePath: messageAbsolutePath,
        relativePath: messageRelativePath,
        fileName: AGENT_CHAT_MESSAGE_FILE_NAME,
    };
}

/**
 * Builds the shared prompt-runner option shape used by existing harness implementations.
 */
function createPromptRunnerOptions(options: AgentCliRunOptions): RunOptions {
    return {
        dryRun: false,
        context: undefined,
        testCommand: undefined,
        preserveLogs: false,
        noUi: options.noUi,
        thinkingLevel: options.thinkingLevel,
        waitForUser: false,
        waitBetweenPrompts: 0,
        noCommit: true,
        ignoreGitChanges: true,
        normalizeLineEndings: false,
        allowCredits: options.allowCredits,
        isVerbose: options.isVerbose,
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
        autoPush: false,
        autoPull: false,
        agentName: options.agentName,
        model: options.model,
        priority: 0,
    };
}

/**
 * Appends optional user-provided context to the generated agent prompt.
 */
function appendAgentCliContext(prompt: string, context: string | undefined): string {
    const normalizedContext = context?.trim();
    if (!normalizedContext) {
        return prompt;
    }

    return appendCoderContext(
        prompt,
        spaceTrim(
            (block) => `
                ## Additional context

                ${block(normalizedContext)}
            `,
        ),
    );
}

/**
 * Extracts the new agent answer from a message book after the harness has edited it.
 */
function parseAgentAnswerFromMessageBook(options: {
    readonly bookContent: string;
    readonly expectedMessagesBeforeAnswer: number;
}): string | null {
    const messages = Book.parse(options.bookContent as string_book).getMessages();
    const answerMessage = messages[options.expectedMessagesBeforeAnswer];

    if (!answerMessage || answerMessage.sender !== 'AGENT') {
        return null;
    }

    const answer = answerMessage.content.trim();
    return answer.length > 0 ? answer : null;
}

/**
 * Keeps persisted agent source readable by the runner.
 */
function normalizeAgentSource(agentSource: string): string {
    return agentSource.endsWith('\n') ? agentSource : `${agentSource}\n`;
}

/**
 * Normalizes a relative path for prompt text and display.
 */
function normalizeRelativePath(relativePath: string): string {
    return relativePath.replace(/\\/gu, '/');
}
