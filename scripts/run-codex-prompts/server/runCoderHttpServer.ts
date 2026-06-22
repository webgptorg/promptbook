import colors from 'colors';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { isAbsolute, join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { number_port } from '../../../src/types/number_positive';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { getPauseState, getPauseTargetLabel, requestPause, requestResume } from '../common/waitForPause';
import { commitChanges } from '../git/commitChanges';
import type { CoderRunUiSnapshot } from '../ui/CoderRunUiState';
import { classifyPromptSectionForCoderBoard } from './classifyPromptSectionForCoderBoard';
import { updatePromptSection } from './updatePromptSection';
import { CODER_SERVER_HTML } from './coderServerHtml';

/**
 * Directory from which prompt files are loaded, relative to the current working directory.
 *
 * @private internal constant of `ptbk coder server`
 */
const PROMPTS_DIRECTORY_NAME = 'prompts';

/**
 * Handle returned by the running coder HTTP server.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderHttpServerHandle = {
    close: () => void;
};

/**
 * Runtime inputs used by the coder HTTP server.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderHttpServerOptions = {
    readonly autoPushPromptEdits: boolean;
    readonly getUiSnapshot: () => CoderRunUiSnapshot | undefined;
    readonly minimumPriority: number;
    readonly serverUrl: string;
};

/**
 * Starts the lightweight HTTP server that serves the coder kanban UI and REST API.
 *
 * API endpoints:
 * - `GET /`                    → HTML kanban page
 * - `GET /api/prompts`         → JSON list of all prompt files and sections
 * - `GET /api/status`          → JSON current pause state
 * - `POST /api/pause`          → request pause
 * - `POST /api/resume`         → request resume
 * - `PUT /api/prompts/update`  → update prompt section content
 *
 * @private internal utility of `ptbk coder server`
 */
export function startCoderHttpServer(port: number_port, options: CoderHttpServerOptions): CoderHttpServerHandle {
    const promptsDir = join(process.cwd(), PROMPTS_DIRECTORY_NAME);

    const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
            await handleRequest(req, res, promptsDir, options);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(colors.red(`Coder server request error: ${message}`));
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            }
            res.end('Internal server error');
        }
    });

    server.listen(port, () => {
        console.info(
            spaceTrim(`
                Coder server running at ${colors.cyan(options.serverUrl)}
                Open the URL above in your browser to see the kanban board.
                Press ${colors.bold('p')} to pause / resume the agent runner.
            `),
        );
    });

    return {
        close: (): void => {
            server.close();
        },
    };
}

/**
 * Routes one HTTP request to the appropriate handler.
 */
async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    promptsDir: string,
    options: CoderHttpServerOptions,
): Promise<void> {
    const urlPath = new URL(req.url || '/', `http://localhost`).pathname;
    const method = (req.method || 'GET').toUpperCase();

    // Serve the kanban UI
    if (urlPath === '/' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
        });
        res.end(CODER_SERVER_HTML);
        return;
    }

    // GET /api/status
    if (urlPath === '/api/status' && method === 'GET') {
        res.writeHead(200, jsonHeaders());
        res.end(
            JSON.stringify({
                pauseState: getPauseState(),
                pauseTargetLabel: getPauseTargetLabel(),
                run: options.getUiSnapshot(),
            }),
        );
        return;
    }

    // GET /api/prompts
    if (urlPath === '/api/prompts' && method === 'GET') {
        const promptData = await loadPromptsForApi({
            activeSnapshot: options.getUiSnapshot(),
            minimumPriority: options.minimumPriority,
            promptsDir,
        });
        res.writeHead(200, jsonHeaders());
        res.end(JSON.stringify(promptData));
        return;
    }

    // POST /api/pause
    if (urlPath === '/api/pause' && method === 'POST') {
        requestPause();
        res.writeHead(200, jsonHeaders());
        res.end(JSON.stringify({ pauseState: getPauseState() }));
        return;
    }

    // POST /api/resume
    if (urlPath === '/api/resume' && method === 'POST') {
        requestResume();
        res.writeHead(200, jsonHeaders());
        res.end(JSON.stringify({ pauseState: getPauseState() }));
        return;
    }

    // PUT /api/prompts/update
    if (urlPath === '/api/prompts/update' && method === 'PUT') {
        const body = await readRequestBody(req);
        const parsed = JSON.parse(body) as Partial<{
            filePath: string;
            sectionIndex: number;
            content: string;
        }>;

        if (
            typeof parsed.filePath !== 'string' ||
            typeof parsed.sectionIndex !== 'number' ||
            typeof parsed.content !== 'string'
        ) {
            throw new NotAllowed(
                spaceTrim(`
                    Invalid request body for \`PUT /api/prompts/update\`.

                    Expected: \`{ filePath: string, sectionIndex: number, content: string }\`
                `),
            );
        }

        assertPromptFilePathInsidePromptsDirectory(parsed.filePath, promptsDir);
        const updateResult = await updatePromptSection(parsed.filePath, parsed.sectionIndex, parsed.content);

        if (updateResult.changed) {
            await commitPromptSectionEdit({
                autoPush: options.autoPushPromptEdits,
                filePath: parsed.filePath,
                sectionIndex: parsed.sectionIndex,
            });
        }

        res.writeHead(200, jsonHeaders());
        res.end(JSON.stringify({ success: true, changed: updateResult.changed, committed: updateResult.changed }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
}

/**
 * Loads all prompt files and converts them to the API response shape.
 */
async function loadPromptsForApi(options: {
    readonly activeSnapshot: CoderRunUiSnapshot | undefined;
    readonly minimumPriority: number;
    readonly promptsDir: string;
}): Promise<object[]> {
    try {
        const promptFiles = await loadPromptFiles(options.promptsDir);
        const activePrompt =
            options.activeSnapshot?.currentPromptLabel
                ? {
                      currentPromptLabel: options.activeSnapshot.currentPromptLabel,
                      phase: options.activeSnapshot.phase,
                  }
                : undefined;

        return promptFiles.map((file) => ({
            filePath: file.path,
            fileName: file.name,
            sections: file.sections.map((section) => {
                const boardClassification = classifyPromptSectionForCoderBoard({
                    activePrompt,
                    file,
                    minimumPriority: options.minimumPriority,
                    section,
                });

                return {
                    index: section.index,
                    status: section.status,
                    boardStatus: boardClassification.boardStatus,
                    tags: boardClassification.tags,
                    priority: section.priority,
                    summary: buildPromptSummary(file, section),
                    content: buildCodexPrompt(file, section),
                };
            }),
        }));
    } catch (error) {
        // Prompts directory may not exist yet; return empty list
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

/**
 * Guards prompt edits so browser requests cannot write outside the prompts directory.
 */
function assertPromptFilePathInsidePromptsDirectory(filePath: string, promptsDir: string): void {
    const promptFilePath = resolve(filePath);
    const promptsDirectoryPath = resolve(promptsDir);
    const relativePromptPath = relative(promptsDirectoryPath, promptFilePath);

    if (
        relativePromptPath === '' ||
        relativePromptPath.startsWith('..') ||
        isAbsolute(relativePromptPath) ||
        !promptFilePath.toLowerCase().endsWith('.md')
    ) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid prompt file path: \`${filePath}\`.

                Prompt edits must target Markdown files inside \`${promptsDir}\`.
            `),
        );
    }
}

/**
 * Commits one browser-edited prompt section using the shared coding-agent git helper.
 */
async function commitPromptSectionEdit(options: {
    readonly autoPush: boolean;
    readonly filePath: string;
    readonly sectionIndex: number;
}): Promise<void> {
    const relativeFilePath = relative(process.cwd(), options.filePath).replace(/\\/gu, '/');

    await commitChanges(buildPromptSectionEditCommitMessage(relativeFilePath, options.sectionIndex), {
        autoPush: options.autoPush,
        includePaths: [relativeFilePath],
    });
}

/**
 * Builds a focused commit message for one browser edit.
 */
function buildPromptSectionEditCommitMessage(relativeFilePath: string, sectionIndex: number): string {
    return spaceTrim(`
        docs: update coder prompt

        Edited ${relativeFilePath} section #${sectionIndex + 1} from ptbk coder server.
    `);
}

/**
 * Reads the full request body as a UTF-8 string.
 */
function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

/**
 * Returns standard JSON response headers with no-cache directives.
 */
function jsonHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
    };
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/runCoderHttpServer.ts) should never be published outside of `@promptbook/cli`
