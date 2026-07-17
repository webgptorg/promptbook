import colors from 'colors';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { isAbsolute, join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { number_port } from '../../../src/types/number_positive';
import { commitChanges } from '../git/commitChanges';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import type { PriorityFilter } from '../prompts/priorityFilter';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { CoderRunUiState } from '../ui/CoderRunUiState';
import { getPauseState, getPauseTargetLabel, requestPause, requestResume } from '../common/waitForPause';
import { buildCoderServerPromptFileResponses, type CoderServerPromptFileResponse } from './buildCoderServerPromptResponse';
import { buildCoderServerRunState } from './buildCoderServerRunState';
import { updatePromptSection } from './updatePromptSection';
import { CODER_SERVER_HTML } from './coderServerHtml';

/**
 * Directory from which prompt files are loaded, relative to the current working directory.
 *
 * @private internal constant of `ptbk coder server`
 */
const PROMPTS_DIRECTORY_NAME = 'prompts';

/**
 * Directory containing human-verified prompt files, relative to `prompts/`.
 *
 * @private internal constant of `ptbk coder server`
 */
const FINISHED_PROMPTS_DIRECTORY_NAME = 'done';

/**
 * Handle returned by the running coder HTTP server.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderHttpServerHandle = {
    close: () => void;
};

/**
 * Options for the coder HTTP server.
 *
 * @private internal type of `ptbk coder server`
 */
export type StartCoderHttpServerOptions = {
    readonly port: number_port;
    readonly priorityFilter: PriorityFilter;
    readonly serverUrl: string;
    readonly uiState?: CoderRunUiState;
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
export function startCoderHttpServer(options: StartCoderHttpServerOptions): CoderHttpServerHandle {
    const { port, priorityFilter, serverUrl, uiState } = options;
    const promptsDir = join(process.cwd(), PROMPTS_DIRECTORY_NAME);

    const server: Server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
        try {
            await handleRequest(request, response, {
                promptsDir,
                priorityFilter,
                uiState,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(colors.red(`Coder server request error: ${message}`));
            if (!response.headersSent) {
                response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            }
            response.end('Internal server error');
        }
    });

    server.listen(port, () => {
        console.info(
            spaceTrim(`
                Coder server running at ${colors.cyan(serverUrl)}
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
    request: IncomingMessage,
    response: ServerResponse,
    options: {
        readonly promptsDir: string;
        readonly priorityFilter: PriorityFilter;
        readonly uiState?: CoderRunUiState;
    },
): Promise<void> {
    const { promptsDir, priorityFilter, uiState } = options;
    const urlPath = new URL(request.url || '/', `http://localhost`).pathname;
    const method = (request.method || 'GET').toUpperCase();

    // Serve the kanban UI
    if (urlPath === '/' && method === 'GET') {
        response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
        });
        response.end(CODER_SERVER_HTML);
        return;
    }

    // GET /api/status
    if (urlPath === '/api/status' && method === 'GET') {
        response.writeHead(200, jsonHeaders());
        response.end(
            JSON.stringify({
                pauseState: getPauseState(),
                pauseTargetLabel: getPauseTargetLabel(),
                runState: uiState ? buildCoderServerRunState(uiState) : undefined,
            }),
        );
        return;
    }

    // GET /api/prompts
    if (urlPath === '/api/prompts' && method === 'GET') {
        const promptData = await loadPromptsForApi({
            promptsDir,
            priorityFilter,
            uiState,
        });
        response.writeHead(200, jsonHeaders());
        response.end(JSON.stringify(promptData));
        return;
    }

    // POST /api/pause
    if (urlPath === '/api/pause' && method === 'POST') {
        requestPause();
        response.writeHead(200, jsonHeaders());
        response.end(JSON.stringify({ pauseState: getPauseState() }));
        return;
    }

    // POST /api/resume
    if (urlPath === '/api/resume' && method === 'POST') {
        requestResume();
        response.writeHead(200, jsonHeaders());
        response.end(JSON.stringify({ pauseState: getPauseState() }));
        return;
    }

    // PUT /api/prompts/update
    if (urlPath === '/api/prompts/update' && method === 'PUT') {
        const body = await readRequestBody(request);
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

        const promptFilePath = resolveEditablePromptFilePath(parsed.filePath, promptsDir);
        const isUpdated = await updatePromptSection(promptFilePath, parsed.sectionIndex, parsed.content);

        if (isUpdated) {
            await commitPromptEdit(promptFilePath, parsed.sectionIndex);
        }

        response.writeHead(200, jsonHeaders());
        response.end(JSON.stringify({ success: true, committed: isUpdated }));
        return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
}

/**
 * Loads all prompt files and converts them to the API response shape.
 */
async function loadPromptsForApi(options: {
    readonly promptsDir: string;
    readonly priorityFilter: PriorityFilter;
    readonly uiState?: CoderRunUiState;
}): Promise<CoderServerPromptFileResponse[]> {
    const { promptsDir, priorityFilter, uiState } = options;
    const promptFiles = await loadPromptFilesSafely(promptsDir);
    const finishedPromptFiles = await loadPromptFilesSafely(join(promptsDir, FINISHED_PROMPTS_DIRECTORY_NAME));

    return buildCoderServerPromptFileResponses({
        promptFiles,
        finishedPromptFiles,
        priorityFilter,
        uiState,
    });
}

/**
 * Loads prompt files from a directory that may not exist yet.
 */
async function loadPromptFilesSafely(promptsDir: string): Promise<PromptFile[]> {
    try {
        return await loadPromptFiles(promptsDir);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }

        throw error;
    }
}

/**
 * Resolves and validates one editable prompt file path received from the browser.
 */
function resolveEditablePromptFilePath(filePath: string, promptsDir: string): string {
    const promptFilePath = resolve(filePath);
    const promptsDirectoryPath = resolve(promptsDir);
    const relativePromptFilePath = relative(promptsDirectoryPath, promptFilePath);
    const isOutsidePromptsDirectory =
        relativePromptFilePath === '' ||
        relativePromptFilePath.startsWith('..') ||
        isAbsolute(relativePromptFilePath);

    if (isOutsidePromptsDirectory || !promptFilePath.toLowerCase().endsWith('.md')) {
        throw new NotAllowed(
            spaceTrim(`
                Prompt file edits are limited to Markdown files inside \`${promptsDirectoryPath}\`.

                Requested file:
                \`${filePath}\`
            `),
        );
    }

    return promptFilePath;
}

/**
 * Commits a browser prompt edit to Git without sweeping unrelated staged files into the commit.
 */
async function commitPromptEdit(promptFilePath: string, sectionIndex: number): Promise<void> {
    const relativePromptFilePath = relative(process.cwd(), promptFilePath).replace(/\\/gu, '/');

    await commitChanges(`Edit coder prompt ${relativePromptFilePath}#${sectionIndex + 1}`, {
        includePaths: [relativePromptFilePath],
        onlyPaths: [relativePromptFilePath],
    });
}

/**
 * Reads the full request body as a UTF-8 string.
 */
function readRequestBody(request: IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        request.on('error', reject);
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
