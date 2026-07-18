import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { readdir, readFile, stat } from 'fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { assertSafeAgentProjectPathSegment } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { resolveAgentProjectFileContentType } from './resolveAgentProjectFileContentType';

/**
 * Filenames served automatically when a request targets a project directory.
 */
const STATIC_DIRECTORY_INDEX_FILENAMES = ['index.html', 'index.htm'] as const;

/**
 * HTML content type used for generated static directory listings.
 */
const STATIC_DIRECTORY_LIST_CONTENT_TYPE = 'text/html; charset=utf-8';

/**
 * Base URL used only for parsing relative request URLs.
 */
const STATIC_REQUEST_PARSE_BASE_URL = 'http://localhost';

/**
 * Creates an HTTP static-file server for one agent project directory.
 *
 * @param projectPath - Absolute project directory path.
 * @returns Unbound HTTP server.
 */
export function createStaticAgentProjectServer(projectPath: string): Server {
    const projectRootPath = resolve(projectPath);

    return createServer((request, response) => {
        handleStaticAgentProjectRequest({ projectRootPath, request, response }).catch((error) => {
            writeStaticErrorResponse({
                response,
                statusCode: error instanceof NotAllowed ? 400 : 500,
                message: error instanceof Error ? error.message : 'Failed to serve project file.',
            });
        });
    });
}

/**
 * Handles one static-file request.
 */
async function handleStaticAgentProjectRequest(options: {
    readonly projectRootPath: string;
    readonly request: IncomingMessage;
    readonly response: ServerResponse;
}): Promise<void> {
    const requestTarget = resolveStaticRequestTarget(options.projectRootPath, options.request.url || '/');

    if (!requestTarget) {
        writeStaticErrorResponse({
            response: options.response,
            statusCode: 400,
            message: 'Invalid project file path.',
        });
        return;
    }

    const targetStats = await stat(requestTarget.absolutePath).catch((error) => {
        if (isMissingPathError(error)) {
            return null;
        }

        throw error;
    });

    if (!targetStats) {
        writeStaticErrorResponse({
            response: options.response,
            statusCode: 404,
            message: 'Project file not found.',
        });
        return;
    }

    if (targetStats.isDirectory()) {
        await serveStaticProjectDirectory({
            projectRootPath: options.projectRootPath,
            requestPathname: requestTarget.requestPathname,
            directoryPath: requestTarget.absolutePath,
            response: options.response,
        });
        return;
    }

    if (!targetStats.isFile()) {
        writeStaticErrorResponse({
            response: options.response,
            statusCode: 404,
            message: 'Project file not found.',
        });
        return;
    }

    await serveStaticProjectFile(requestTarget.absolutePath, options.response);
}

/**
 * Resolves and validates one static request path.
 */
function resolveStaticRequestTarget(
    projectRootPath: string,
    requestUrl: string,
): { readonly absolutePath: string; readonly requestPathname: string } | null {
    let requestPathname: string;

    try {
        requestPathname = new URL(requestUrl, STATIC_REQUEST_PARSE_BASE_URL).pathname;
    } catch {
        return null;
    }

    let pathSegments: ReadonlyArray<string>;

    try {
        pathSegments = requestPathname
            .split('/')
            .filter((pathSegment) => pathSegment.length > 0)
            .map((pathSegment) => decodeURIComponent(pathSegment));
    } catch {
        return null;
    }

    for (const pathSegment of pathSegments) {
        assertSafeAgentProjectPathSegment(pathSegment, 'static project path segment');
    }

    const absolutePath = resolve(projectRootPath, ...pathSegments);
    const relativePath = relative(projectRootPath, absolutePath);
    const isInsideProjectRoot = relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));

    if (!isInsideProjectRoot) {
        throw new NotAllowed(
            spaceTrim(`
                Static project request escaped the project root.

                **Requested path:** \`${requestPathname}\`
            `),
        );
    }

    return { absolutePath, requestPathname };
}

/**
 * Serves a file response.
 */
async function serveStaticProjectFile(filePath: string, response: ServerResponse): Promise<void> {
    const content = await readFile(filePath);

    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': resolveAgentProjectFileContentType(basename(filePath)),
        'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
}

/**
 * Serves a directory by preferring an index file and falling back to a listing.
 */
async function serveStaticProjectDirectory(options: {
    readonly projectRootPath: string;
    readonly requestPathname: string;
    readonly directoryPath: string;
    readonly response: ServerResponse;
}): Promise<void> {
    for (const indexFileName of STATIC_DIRECTORY_INDEX_FILENAMES) {
        const indexFilePath = join(options.directoryPath, indexFileName);
        const indexFileStats = await stat(indexFilePath).catch((error) => {
            if (isMissingPathError(error)) {
                return null;
            }

            throw error;
        });

        if (indexFileStats?.isFile()) {
            await serveStaticProjectFile(indexFilePath, options.response);
            return;
        }
    }

    const listing = await createStaticProjectDirectoryListingHtml({
        projectRootPath: options.projectRootPath,
        requestPathname: options.requestPathname,
        directoryPath: options.directoryPath,
    });

    options.response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': STATIC_DIRECTORY_LIST_CONTENT_TYPE,
        'X-Content-Type-Options': 'nosniff',
    });
    options.response.end(listing);
}

/**
 * Creates an HTML listing for one project directory.
 */
async function createStaticProjectDirectoryListingHtml(options: {
    readonly projectRootPath: string;
    readonly requestPathname: string;
    readonly directoryPath: string;
}): Promise<string> {
    const entries = await readdir(options.directoryPath, { withFileTypes: true });
    const normalizedRequestPathname = options.requestPathname.endsWith('/')
        ? options.requestPathname
        : `${options.requestPathname}/`;
    const title = `Index of /${relative(options.projectRootPath, options.directoryPath).replace(/\\/gu, '/')}`;
    const items = entries
        .filter((entry) => entry.isDirectory() || entry.isFile())
        .sort((firstEntry, secondEntry) => firstEntry.name.localeCompare(secondEntry.name))
        .map((entry) => {
            const href = `${normalizedRequestPathname}${encodeURIComponent(entry.name)}${entry.isDirectory() ? '/' : ''}`;
            const label = `${entry.name}${entry.isDirectory() ? '/' : ''}`;

            return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`;
        })
        .join('');

    return spaceTrim(`
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>${escapeHtml(title)}</title>
            </head>
            <body>
                <h1>${escapeHtml(title)}</h1>
                <ul>${items}</ul>
            </body>
        </html>
    `);
}

/**
 * Writes a plain-text error response.
 */
function writeStaticErrorResponse(options: {
    readonly response: ServerResponse;
    readonly statusCode: number;
    readonly message: string;
}): void {
    if (options.response.headersSent) {
        options.response.end();
        return;
    }

    options.response.writeHead(options.statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
    });
    options.response.end(options.message);
}

/**
 * Escapes text for a small generated HTML document.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&#39;');
}

