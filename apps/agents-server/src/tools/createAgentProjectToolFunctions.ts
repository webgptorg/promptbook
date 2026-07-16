import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../../../src/_packages/types.index';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../src/errors/ParseError';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import type { AgentProjectRecord } from '../utils/agentProjects/AgentProjectRecord';
import {
    createAgentProjectFileUrl,
    createAgentProjectOverviewUrl,
} from '../utils/agentProjects/createAgentProjectLinks';
import { createAgentProject } from '../utils/agentProjects/createAgentProject';
import { listAgentProjectDirectoryEntries } from '../utils/agentProjects/listAgentProjectDirectoryEntries';
import { listAgentProjects, resolveAgentProjectForTool } from '../utils/agentProjects/listAgentProjects';
import { readAgentProjectDirectoryUsage } from '../utils/agentProjects/readAgentProjectDirectoryUsage';
import {
    isFileNotFoundError,
    normalizeProjectRelativePath,
    resolveAgentProjectFilePath,
} from '../utils/agentProjects/resolveAgentProjectDirectory';
import {
    resolveAgentProjectToolRuntime,
    type AgentProjectToolRuntime,
} from '../utils/agentProjects/resolveAgentProjectToolRuntime';
import {
    normalizeAgentProjectProcessArgs,
    normalizeAgentProjectProcessTimeoutMs,
    runAgentProjectProcess,
} from '../utils/agentProjects/runAgentProjectProcess';
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
 * Args accepted by `agent_project_run_script` and `agent_project_git`.
 */
type AgentProjectProcessToolArgs = AgentProjectToolArgsBase & {
    readonly args?: unknown;
    readonly timeoutMs?: unknown;
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
            const listing = await listAgentProjectDirectoryEntries(project.directoryPath, args.path, {
                maxEntries: PROJECT_LIST_FILES_MAX_ENTRIES,
            }).catch((error) => {
                if (isFileNotFoundError(error)) {
                    throw new NotFoundError(`Project path \`${String(args.path ?? '.')}\` was not found.`);
                }

                throw error;
            });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                ...listing,
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
                warnings:
                    isBinary && !isForceText ? ['File looks binary. Pass `forceText: true` to decode anyway.'] : [],
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
                url: createAgentProjectFileUrl(project, relativePath, runtime.localServerUrl),
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

        async [AgentProjectToolNames.runScript](args: AgentProjectProcessToolArgs): Promise<string> {
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

            const command = resolveScriptCommand(
                absolutePath,
                relativePath,
                normalizeAgentProjectProcessArgs(args.args),
            );
            const scriptResult = await runAgentProjectProcess({
                project,
                command: command.command,
                args: command.args,
                timeoutMs: normalizeAgentProjectProcessTimeoutMs(args.timeoutMs),
            });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                script: relativePath,
                ...scriptResult,
            });
        },

        async [AgentProjectToolNames.git](args: AgentProjectProcessToolArgs): Promise<string> {
            const runtime = resolveAgentProjectToolRuntime(args);
            const project = await resolveAgentProjectForTool(runtime.agentPermanentId, args.project);
            const gitArgs = normalizeAgentProjectProcessArgs(args.args);

            if (gitArgs.length === 0) {
                throw new ParseError(
                    spaceTrim(`
                        Git command is required.

                        Provide the \`args\` array without the leading \`git\`, for example \`["status"]\` or \`["init"]\`.
                    `),
                );
            }

            const gitResult = await runAgentProjectProcess({
                project,
                command: 'git',
                args: gitArgs,
                timeoutMs: normalizeAgentProjectProcessTimeoutMs(args.timeoutMs),
            });

            return stringifyToolResult({
                project: createProjectPayload(project, runtime),
                command: `git ${gitArgs.join(' ')}`,
                ...gitResult,
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
                ? createAgentProjectFileUrl(project, relativePath, runtime.localServerUrl)
                : createAgentProjectOverviewUrl(project, runtime.localServerUrl);
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
        url: createAgentProjectOverviewUrl(project, runtime.localServerUrl),
    };
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
 * Resolves the process command used to execute one script file.
 *
 * @private function of `createAgentProjectToolFunctions`
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
 * Serializes one tool result.
 *
 * @private function of `createAgentProjectToolFunctions`
 */
function stringifyToolResult(value: unknown): string {
    return JSON.stringify(value, null, 2);
}
