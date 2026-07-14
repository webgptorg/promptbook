import { spawn } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { spaceTrim } from 'spacetrim';
import { readToolRuntimeContextFromToolArgs } from '../../../../src/commitments/_common/toolRuntimeContext';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../src/errors/ParseError';
import { UnexpectedError } from '../../../../src/errors/UnexpectedError';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../../../src/types/string_person_fullname';
import { createAgentProject } from '../utils/agentProjects/createAgentProject';
import type { AgentProjectRecord } from '../utils/agentProjects/AgentProjectRecord';
import { listAgentProjects, resolveAgentProjectForTool } from '../utils/agentProjects/listAgentProjects';
import { readAgentProjectDirectoryUsage } from '../utils/agentProjects/readAgentProjectDirectoryUsage';
import {
    encodeProjectRelativePathForUrl,
    isFileNotFoundError,
    normalizeProjectRelativePath,
    resolveAgentProjectFilePath,
} from '../utils/agentProjects/resolveAgentProjectDirectory';
import { AgentProjectToolNames } from './AgentProjectToolNames';

/**
 * Maximum file content returned by `agent_project_read_file`.
 */
const PROJECT_READ_FILE_MAX_BYTES = 256 * 1024;

/**
 * Maximum entries returned by one directory listing.
 */
const PROJECT_LIST_FILES_MAX_ENTRIES = 300;

/**
 * Default timeout for project scripts.
 */
const PROJECT_SCRIPT_DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Maximum timeout accepted for project scripts.
 */
const PROJECT_SCRIPT_MAX_TIMEOUT_MS = 60_000;

/**
 * Maximum characters returned from script stdout or stderr.
 */
const PROJECT_SCRIPT_OUTPUT_MAX_CHARACTERS = 24_000;

/**
 * Script extensions that can be executed by the project script tool.
 */
const PROJECT_SCRIPT_EXTENSIONS = new Set(['.bat', '.cmd', '.ps1', '.sh']);

/**
 * Common args accepted by project tools.
 */
type AgentProjectToolArgsBase = {
    readonly project?: unknown;
    readonly path?: unknown;
    readonly __promptbookToolRuntimeContext?: unknown;
};

/**
 * Args accepted by `agent_project_create`.
 */
type AgentProjectCreateToolArgs = AgentProjectToolArgsBase & {
    readonly name?: unknown;
};

/**
 * Args accepted by `agent_project_write_file`.
 */
type AgentProjectWriteFileToolArgs = AgentProjectToolArgsBase & {
    readonly content?: unknown;
};

/**
 * Args accepted by `agent_project_read_file`.
 */
type AgentProjectReadFileToolArgs = AgentProjectToolArgsBase & {
    readonly forceText?: unknown;
};

/**
 * Args accepted by `agent_project_run_script`.
 */
type AgentProjectRunScriptToolArgs = AgentProjectToolArgsBase & {
    readonly args?: unknown;
    readonly timeoutMs?: unknown;
};

/**
 * Current agent project runtime derived from hidden tool context.
 */
type AgentProjectToolRuntime = {
    readonly agentPermanentId: string;
    readonly agentName?: string;
    readonly localServerUrl?: string;
};

/**
 * Creates Agents Server runtime functions for local agent projects.
 *
 * @returns Tool function map.
 */
export function createAgentProjectToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [AgentProjectToolNames.listProjects](args: AgentProjectToolArgsBase): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const projects = await listAgentProjects({ agentPermanentId: runtime.agentPermanentId });
            const projectPayloads = await Promise.all(
                projects.map(async (project) => ({
                    ...createProjectPayload(project, runtime),
                    ...(await readAgentProjectDirectoryUsage(project.directoryPath)),
                })),
            );

            return stringifyToolResult({
                agentPermanentId: runtime.agentPermanentId,
                agentName: runtime.agentName,
                projects: projectPayloads,
            });
        },

        async [AgentProjectToolNames.createProject](args: AgentProjectCreateToolArgs): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await createAgentProject({
                agentPermanentId: runtime.agentPermanentId,
                name: normalizeRequiredText(args.name, 'name'),
            });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
            });
        },

        async [AgentProjectToolNames.listFiles](args: AgentProjectToolArgsBase): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const { absolutePath, relativePath } = resolveAgentProjectFilePath(project.directoryPath, args.path ?? '', {
                isEmptyPathAllowed: true,
            });
            const directoryStats = await readPathStats(absolutePath, relativePath);
            if (!directoryStats.isDirectory()) {
                throw new ParseError(`Project path \`${relativePath || '.'}\` is not a directory.`);
            }

            const entries = await readdir(absolutePath, { withFileTypes: true });
            const sortedEntries = [...entries].sort((left, right) => {
                if (left.isDirectory() !== right.isDirectory()) {
                    return left.isDirectory() ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            });
            const limitedEntries = sortedEntries.slice(0, PROJECT_LIST_FILES_MAX_ENTRIES);
            const payloadEntries = await Promise.all(
                limitedEntries.map(async (entry) => {
                    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                    const { absolutePath: entryAbsolutePath } = resolveAgentProjectFilePath(
                        project.directoryPath,
                        entryRelativePath,
                    );
                    const entryStats = await lstat(entryAbsolutePath);
                    return {
                        name: entry.name,
                        path: entryRelativePath,
                        type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
                        sizeBytes: entryStats.size,
                        updatedAt: entryStats.mtime.toISOString(),
                    };
                }),
            );

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                path: relativePath,
                entries: payloadEntries,
                totalEntryCount: sortedEntries.length,
                isTruncated: sortedEntries.length > limitedEntries.length,
            });
        },

        async [AgentProjectToolNames.readFile](args: AgentProjectReadFileToolArgs): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const { absolutePath, relativePath } = resolveAgentProjectFilePath(project.directoryPath, args.path);
            const fileStats = await readPathStats(absolutePath, relativePath);
            if (!fileStats.isFile() && !fileStats.isSymbolicLink()) {
                throw new ParseError(`Project path \`${relativePath}\` is not a file.`);
            }

            if (fileStats.size > PROJECT_READ_FILE_MAX_BYTES) {
                throw new LimitReachedError(
                    spaceTrim(`
                        Project file is too large to read in one tool call.

                        - File: \`${relativePath}\`
                        - Size: \`${fileStats.size}\` bytes
                        - Maximum: \`${PROJECT_READ_FILE_MAX_BYTES}\` bytes
                    `),
                );
            }

            const buffer = await readFile(absolutePath);
            const isBinary = isBinaryBuffer(buffer);
            const isForceText = args.forceText === true;

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                path: relativePath,
                sizeBytes: buffer.byteLength,
                wasBinary: isBinary,
                content: isBinary && !isForceText ? null : buffer.toString('utf-8'),
                warnings: isBinary && !isForceText ? ['File looks binary. Pass `forceText: true` to decode anyway.'] : [],
            });
        },

        async [AgentProjectToolNames.writeFile](args: AgentProjectWriteFileToolArgs): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const content = normalizeFileContent(args.content);
            const { absolutePath, relativePath } = resolveAgentProjectFilePath(project.directoryPath, args.path);

            await mkdir(dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, content, 'utf-8');

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                path: relativePath,
                sizeBytes: Buffer.byteLength(content, 'utf-8'),
                url: createProjectFileUrl(project, runtime, relativePath),
            });
        },

        async [AgentProjectToolNames.deletePath](args: AgentProjectToolArgsBase): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const { absolutePath, relativePath } = resolveAgentProjectFilePath(project.directoryPath, args.path);

            await rm(absolutePath, { recursive: true, force: true });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                path: relativePath,
                deleted: true,
            });
        },

        async [AgentProjectToolNames.runScript](args: AgentProjectRunScriptToolArgs): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const { absolutePath, relativePath } = resolveAgentProjectFilePath(project.directoryPath, args.path);
            const scriptStats = await readPathStats(absolutePath, relativePath);
            if (!scriptStats.isFile() && !scriptStats.isSymbolicLink()) {
                throw new ParseError(`Project script \`${relativePath}\` is not a file.`);
            }

            const extension = extname(relativePath).toLowerCase();
            if (!PROJECT_SCRIPT_EXTENSIONS.has(extension)) {
                throw new ParseError(
                    spaceTrim(`
                        Project script extension is not supported.

                        - Script: \`${relativePath}\`
                        - Supported extensions: \`${Array.from(PROJECT_SCRIPT_EXTENSIONS).join('`, `')}\`
                    `),
                );
            }

            const scriptResult = await runProjectScript({
                project,
                scriptPath: absolutePath,
                relativePath,
                args: normalizeScriptArgs(args.args),
                timeoutMs: normalizeScriptTimeoutMs(args.timeoutMs),
            });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                script: relativePath,
                ...scriptResult,
            });
        },

        async [AgentProjectToolNames.linkFile](args: AgentProjectToolArgsBase): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const relativePath =
                args.path === undefined || args.path === null || args.path === ''
                    ? ''
                    : normalizeProjectRelativePath(args.path);
            const url = relativePath
                ? createProjectFileUrl(project, runtime, relativePath)
                : createProjectOverviewUrl(project, runtime);
            const label = relativePath ? `${project.name}/${relativePath}` : project.name;

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                path: relativePath,
                url,
                markdown: `[${label}](${url})`,
            });
        },
    };
}

/**
 * Resolves hidden runtime context needed by local project tools.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function resolveAgentProjectToolRuntime(args: AgentProjectToolArgsBase): AgentProjectToolRuntime {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args as Record<string, unknown>);
    const agentPermanentId =
        normalizeOptionalText(runtimeContext?.agentProjects?.agentId) ||
        normalizeOptionalText(runtimeContext?.chat?.agentId) ||
        normalizeOptionalText(runtimeContext?.memory?.agentId);

    if (!agentPermanentId) {
        throw new UnexpectedError(
            spaceTrim(`
                Agent project tools require agent runtime context.

                The server did not provide an agent id in hidden tool context, so the project scope cannot be enforced.
            `),
        );
    }

    return {
        agentPermanentId,
        agentName:
            normalizeOptionalText(runtimeContext?.agentProjects?.agentName) ||
            normalizeOptionalText(runtimeContext?.chat?.agentName) ||
            normalizeOptionalText(runtimeContext?.memory?.agentName),
        localServerUrl:
            normalizeOptionalText(runtimeContext?.agentProjects?.localServerUrl) ||
            normalizeOptionalText(runtimeContext?.agentsServer?.localServerUrl),
    };
}

/**
 * Creates a serializable project payload shared by tool results.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function createProjectPayload(project: AgentProjectRecord, runtime: AgentProjectToolRuntime) {
    return {
        id: project.id,
        name: project.name,
        agentPermanentId: project.agentPermanentId,
        directoryPath: project.directoryPath,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        url: createProjectOverviewUrl(project, runtime),
    };
}

/**
 * Builds a project overview URL.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function createProjectOverviewUrl(project: Pick<AgentProjectRecord, 'id'>, runtime: AgentProjectToolRuntime): string {
    return createToolUrl(runtime, `/api/agent-projects/${project.id}`);
}

/**
 * Builds a project file URL.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function createProjectFileUrl(
    project: Pick<AgentProjectRecord, 'id'>,
    runtime: AgentProjectToolRuntime,
    relativePath: string,
): string {
    return createToolUrl(
        runtime,
        `/api/agent-projects/${project.id}/files/${encodeProjectRelativePathForUrl(relativePath)}`,
    );
}

/**
 * Builds an absolute URL when server origin is available, otherwise returns a root-relative URL.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function createToolUrl(runtime: AgentProjectToolRuntime, pathname: string): string {
    if (!runtime.localServerUrl) {
        return pathname;
    }

    return new URL(pathname, runtime.localServerUrl).href;
}

/**
 * Reads filesystem stats and normalizes missing files to branded errors.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
async function readPathStats(absolutePath: string, relativePath: string) {
    try {
        return await lstat(absolutePath);
    } catch (error) {
        if (isFileNotFoundError(error)) {
            throw new NotFoundError(`Project path \`${relativePath || '.'}\` was not found.`);
        }

        throw error;
    }
}

/**
 * Executes one supported project script.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
async function runProjectScript(options: {
    readonly project: AgentProjectRecord;
    readonly scriptPath: string;
    readonly relativePath: string;
    readonly args: ReadonlyArray<string>;
    readonly timeoutMs: number;
}): Promise<{
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly didTimeout: boolean;
}> {
    const command = resolveScriptCommand(options.scriptPath, options.relativePath, options.args);

    return await new Promise((resolvePromise, rejectPromise) => {
        let stdout = '';
        let stderr = '';
        let isSettled = false;
        let didTimeout = false;
        const childProcess = spawn(command.command, command.args, {
            cwd: options.project.directoryPath,
            env: {
                ...process.env,
                PROMPTBOOK_AGENT_PROJECT_DIRECTORY: options.project.directoryPath,
                PROMPTBOOK_AGENT_PROJECT_ID: String(options.project.id),
                PROMPTBOOK_AGENT_PROJECT_NAME: options.project.name,
            },
            windowsHide: true,
        });
        const timeout = setTimeout(() => {
            didTimeout = true;
            childProcess.kill();
        }, options.timeoutMs);

        childProcess.stdout?.setEncoding('utf-8');
        childProcess.stderr?.setEncoding('utf-8');
        childProcess.stdout?.on('data', (chunk) => {
            stdout = appendLimitedOutput(stdout, String(chunk));
        });
        childProcess.stderr?.on('data', (chunk) => {
            stderr = appendLimitedOutput(stderr, String(chunk));
        });
        childProcess.on('error', (error) => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            clearTimeout(timeout);
            rejectPromise(error);
        });
        childProcess.on('close', (exitCode, signal) => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            clearTimeout(timeout);
            resolvePromise({
                exitCode,
                signal,
                stdout,
                stderr,
                didTimeout,
            });
        });
    });
}

/**
 * Resolves the process command used to execute one script file.
 *
 * @private function of `runProjectScript`
 */
function resolveScriptCommand(
    scriptPath: string,
    relativePath: string,
    args: ReadonlyArray<string>,
): { readonly command: string; readonly args: ReadonlyArray<string> } {
    const extension = extname(relativePath).toLowerCase();

    if (extension === '.ps1') {
        return process.platform === 'win32'
            ? {
                  command: 'powershell.exe',
                  args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
              }
            : {
                  command: 'pwsh',
                  args: ['-NoProfile', '-File', scriptPath, ...args],
              };
    }

    if (extension === '.sh') {
        return {
            command: 'sh',
            args: [scriptPath, ...args],
        };
    }

    if (extension === '.bat' || extension === '.cmd') {
        if (process.platform !== 'win32') {
            throw new ParseError(`Project script \`${relativePath}\` can run only on Windows.`);
        }

        return {
            command: 'cmd.exe',
            args: [
                '/d',
                '/s',
                '/c',
                ['call', quoteWindowsCommandArgument(scriptPath), ...args.map(quoteWindowsCommandArgument)].join(' '),
            ],
        };
    }

    throw new ParseError(`Project script \`${relativePath}\` has an unsupported extension.`);
}

/**
 * Quotes one argument for a `cmd.exe /c` command string.
 *
 * @private function of `resolveScriptCommand`
 */
function quoteWindowsCommandArgument(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`;
}

/**
 * Normalizes a required string tool argument.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function normalizeRequiredText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new ParseError(`Tool argument \`${fieldName}\` must be a string.`);
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        throw new ParseError(`Tool argument \`${fieldName}\` must not be empty.`);
    }

    return normalizedValue;
}

/**
 * Normalizes file content without trimming significant whitespace.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function normalizeFileContent(value: unknown): string {
    if (typeof value !== 'string') {
        throw new ParseError('Tool argument `content` must be a string.');
    }

    return value;
}

/**
 * Normalizes optional string.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue || undefined;
}

/**
 * Normalizes optional script arguments.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function normalizeScriptArgs(rawArgs: unknown): ReadonlyArray<string> {
    if (rawArgs === undefined || rawArgs === null) {
        return [];
    }

    if (!Array.isArray(rawArgs)) {
        throw new ParseError('Tool argument `args` must be an array of strings.');
    }

    return rawArgs.map((arg, index) => {
        if (typeof arg !== 'string') {
            throw new ParseError(`Tool argument \`args[${index}]\` must be a string.`);
        }

        return arg;
    });
}

/**
 * Normalizes optional script timeout.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function normalizeScriptTimeoutMs(rawTimeoutMs: unknown): number {
    if (rawTimeoutMs === undefined || rawTimeoutMs === null) {
        return PROJECT_SCRIPT_DEFAULT_TIMEOUT_MS;
    }

    if (typeof rawTimeoutMs !== 'number' || !Number.isFinite(rawTimeoutMs)) {
        throw new ParseError('Tool argument `timeoutMs` must be a finite number.');
    }

    return Math.max(1, Math.min(Math.floor(rawTimeoutMs), PROJECT_SCRIPT_MAX_TIMEOUT_MS));
}

/**
 * Detects simple binary buffers.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function isBinaryBuffer(buffer: Buffer): boolean {
    const inspectedLength = Math.min(buffer.byteLength, 1024);
    for (let index = 0; index < inspectedLength; index += 1) {
        if (buffer[index] === 0) {
            return true;
        }
    }

    return false;
}

/**
 * Appends captured process output while capping returned text.
 *
 * @private function of `runProjectScript`
 */
function appendLimitedOutput(currentOutput: string, chunk: string): string {
    const nextOutput = currentOutput + chunk;
    if (nextOutput.length <= PROJECT_SCRIPT_OUTPUT_MAX_CHARACTERS) {
        return nextOutput;
    }

    return `${nextOutput.slice(0, PROJECT_SCRIPT_OUTPUT_MAX_CHARACTERS)}\n[output truncated]`;
}

/**
 * Serializes one tool result.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function stringifyToolResult(value: unknown): string {
    return JSON.stringify(value, null, 2);
}
