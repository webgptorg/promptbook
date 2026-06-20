import colors from 'colors';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { number_port } from '../../../src/types/number_positive';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { getPauseState, getPauseTargetLabel, requestPause, requestResume } from '../common/waitForPause';
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
export function startCoderHttpServer(port: number_port): CoderHttpServerHandle {
    const promptsDir = join(process.cwd(), PROMPTS_DIRECTORY_NAME);

    const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
            await handleRequest(req, res, promptsDir);
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
                Coder server running at ${colors.cyan(`http://localhost:${port}`)}
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
            }),
        );
        return;
    }

    // GET /api/prompts
    if (urlPath === '/api/prompts' && method === 'GET') {
        const promptData = await loadPromptsForApi(promptsDir);
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

        await updatePromptSection(parsed.filePath, parsed.sectionIndex, parsed.content);
        res.writeHead(200, jsonHeaders());
        res.end(JSON.stringify({ success: true }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
}

/**
 * Loads all prompt files and converts them to the API response shape.
 */
async function loadPromptsForApi(promptsDir: string): Promise<object[]> {
    try {
        const promptFiles = await loadPromptFiles(promptsDir);
        return promptFiles.map((file) => ({
            filePath: file.path,
            fileName: file.name,
            sections: file.sections.map((section) => ({
                index: section.index,
                status: section.status,
                priority: section.priority,
                summary: buildPromptSummary(file, section),
                content: buildCodexPrompt(file, section),
            })),
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

// Note: [⚫] Code in this file should never be published in any package
