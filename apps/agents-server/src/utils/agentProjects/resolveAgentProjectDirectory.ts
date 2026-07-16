import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { resolvePromptbookTemporaryPath } from '../../../../../src/utils/filesystem/promptbookTemporaryPath';

/**
 * Runtime environment variable that overrides the root directory for agent project folders.
 */
const AGENT_PROJECTS_STORAGE_DIRECTORY_ENV = 'AGENT_PROJECTS_STORAGE_DIRECTORY';

/**
 * Maximum length accepted for a user-facing project name.
 */
const AGENT_PROJECT_NAME_MAX_LENGTH = 120;

/**
 * Maximum length kept from a sanitized project directory stem.
 */
const AGENT_PROJECT_DIRECTORY_STEM_MAX_LENGTH = 72;

/**
 * Pattern of characters replaced inside one filesystem directory segment.
 */
const AGENT_PROJECT_DIRECTORY_UNSAFE_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Pattern matching path segments that are unsafe or ambiguous for project-relative paths.
 */
const UNSAFE_PROJECT_PATH_SEGMENT_PATTERN = /(^|[/\\])\.\.?($|[/\\])/u;

/**
 * Resolves the root filesystem directory holding all per-agent project folders.
 *
 * The projects are persistent for the whole agent life (they survive server restarts),
 * they are only co-located with other Promptbook working files by default.
 *
 * @returns Absolute or project-relative storage root.
 */
export function resolveAgentProjectsStorageDirectory(): string {
    const configuredStorageDirectory = process.env[AGENT_PROJECTS_STORAGE_DIRECTORY_ENV];
    if (configuredStorageDirectory && configuredStorageDirectory.trim()) {
        return configuredStorageDirectory.trim();
    }

    return resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'projects');
}

/**
 * Resolves the filesystem directory holding all projects of one agent.
 *
 * @param agentPermanentId - Canonical `Agent.permanentId`.
 * @returns Agent project root directory.
 */
export function resolveAgentProjectsAgentDirectory(agentPermanentId: string): string {
    const normalizedAgentPermanentId = normalizeAgentPermanentId(agentPermanentId);
    return `${resolveAgentProjectsStorageDirectory()}/agent-${sanitizeAgentProjectDirectorySegment(
        normalizedAgentPermanentId,
    )}`;
}

/**
 * Resolves the filesystem directory of one persisted project.
 *
 * @param agentPermanentId - Canonical `Agent.permanentId`.
 * @param directoryName - Persisted filesystem-safe project directory name.
 * @returns Project directory path.
 */
export function resolveAgentProjectDirectory(agentPermanentId: string, directoryName: string): string {
    const normalizedDirectoryName = normalizeProjectDirectoryName(directoryName);
    return `${resolveAgentProjectsAgentDirectory(agentPermanentId)}/${normalizedDirectoryName}`;
}

/**
 * Normalizes one user-facing project name.
 *
 * @param name - Raw project name.
 * @returns Trimmed project name.
 */
export function normalizeAgentProjectName(name: unknown): string {
    if (typeof name !== 'string') {
        throw new ParseError(
            spaceTrim(`
                Project name is required.

                The \`name\` value must be a non-empty string.
            `),
        );
    }

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
        throw new ParseError(
            spaceTrim(`
                Project name is required.

                The \`name\` value must not be empty.
            `),
        );
    }

    if (normalizedName.length > AGENT_PROJECT_NAME_MAX_LENGTH) {
        throw new ParseError(
            spaceTrim(`
                Project name is too long.

                - Maximum length: \`${AGENT_PROJECT_NAME_MAX_LENGTH}\`
                - Received length: \`${normalizedName.length}\`
            `),
        );
    }

    return normalizedName;
}

/**
 * Creates one unique, filesystem-safe directory name for a new project.
 *
 * @param projectName - User-facing project name.
 * @returns Safe directory name.
 */
export function createAgentProjectDirectoryName(projectName: string): string {
    const normalizedProjectName = normalizeAgentProjectName(projectName);
    const sanitizedStem = sanitizeAgentProjectDirectorySegment(normalizedProjectName)
        .toLowerCase()
        .slice(0, AGENT_PROJECT_DIRECTORY_STEM_MAX_LENGTH);
    const stableStem = sanitizedStem || 'project';
    return `${stableStem}-${randomUUID().slice(0, 8)}`;
}

/**
 * Resolves a safe path inside a project directory from model-supplied relative input.
 *
 * @param projectDirectory - Absolute or base-relative project directory.
 * @param rawRelativePath - Project-relative path.
 * @param options - Whether an empty path may resolve to the project root.
 * @returns Safe absolute path and normalized relative path.
 */
export function resolveAgentProjectFilePath(
    projectDirectory: string,
    rawRelativePath: unknown,
    options: { readonly isEmptyPathAllowed: boolean } = { isEmptyPathAllowed: false },
): { readonly absolutePath: string; readonly relativePath: string } {
    const relativePath = normalizeProjectRelativePath(rawRelativePath, options);
    const resolvedProjectDirectory = resolve(projectDirectory);
    const absolutePath = resolve(resolvedProjectDirectory, relativePath || '.');
    const pathFromProjectDirectory = relative(resolvedProjectDirectory, absolutePath);
    const isInsideProjectDirectory =
        pathFromProjectDirectory === '' ||
        (!pathFromProjectDirectory.startsWith('..') && !isAbsolute(pathFromProjectDirectory));

    if (!isInsideProjectDirectory) {
        throw new ParseError(
            spaceTrim(`
                Project path escapes the project directory.

                - Project directory: \`${resolvedProjectDirectory}\`
                - Requested path: \`${relativePath}\`

                All paths must stay inside the project directory.
            `),
        );
    }

    return { absolutePath, relativePath };
}

/**
 * Normalizes a project-relative path for storage, links, and tool output.
 *
 * @param rawRelativePath - Raw path value.
 * @param options - Whether an empty path is accepted.
 * @returns Normalized slash-delimited relative path.
 */
export function normalizeProjectRelativePath(
    rawRelativePath: unknown,
    options: { readonly isEmptyPathAllowed: boolean } = { isEmptyPathAllowed: false },
): string {
    if (typeof rawRelativePath !== 'string') {
        if (options.isEmptyPathAllowed && (rawRelativePath === undefined || rawRelativePath === null)) {
            return '';
        }

        throw new ParseError(
            spaceTrim(`
                Project path is required.

                The \`path\` value must be a project-relative string.
            `),
        );
    }

    const normalizedPath = rawRelativePath.trim().replace(/\\/g, '/').replace(/^\/+/u, '').replace(/\/+/g, '/');
    if (!normalizedPath && options.isEmptyPathAllowed) {
        return '';
    }

    if (!normalizedPath) {
        throw new ParseError(
            spaceTrim(`
                Project path is required.

                The \`path\` value must not be empty.
            `),
        );
    }

    if (isAbsolute(rawRelativePath) || UNSAFE_PROJECT_PATH_SEGMENT_PATTERN.test(normalizedPath)) {
        throw new ParseError(
            spaceTrim(`
                Project path must stay inside the project folder.

                Use a relative path without \`..\` segments.
            `),
        );
    }

    return normalizedPath;
}

/**
 * Converts one safe relative path to a URL path segment sequence.
 *
 * @param relativePath - Normalized project-relative path.
 * @returns URL-encoded path.
 */
export function encodeProjectRelativePathForUrl(relativePath: string): string {
    return relativePath
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

/**
 * Checks whether a thrown value represents a missing filesystem path.
 *
 * @param error - Unknown thrown value.
 * @returns `true` for missing path errors.
 */
export function isFileNotFoundError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT');
}

/**
 * Normalizes an agent permanent id before it is used in a filesystem path.
 *
 * @private function of `resolveAgentProjectDirectory`
 */
function normalizeAgentPermanentId(agentPermanentId: string): string {
    const normalizedAgentPermanentId = agentPermanentId.trim();
    if (!normalizedAgentPermanentId) {
        throw new UnexpectedError(
            spaceTrim(`
                Cannot resolve agent project directory.

                The \`agentPermanentId\` is required but an empty value was provided.
            `),
        );
    }

    return normalizedAgentPermanentId;
}

/**
 * Normalizes a persisted project directory name.
 *
 * @private function of `resolveAgentProjectDirectory`
 */
function normalizeProjectDirectoryName(directoryName: string): string {
    const normalizedDirectoryName = directoryName.trim();
    if (!normalizedDirectoryName) {
        throw new UnexpectedError(
            spaceTrim(`
                Cannot resolve project directory.

                The \`directoryName\` is required but an empty value was provided.
            `),
        );
    }

    if (normalizedDirectoryName.includes('/') || normalizedDirectoryName.includes('\\')) {
        throw new UnexpectedError(
            spaceTrim(`
                Cannot resolve project directory.

                The persisted \`directoryName\` must be one filesystem segment.
            `),
        );
    }

    return normalizedDirectoryName;
}

/**
 * Converts one raw identifier into a filesystem-safe directory segment.
 *
 * @private function of `resolveAgentProjectDirectory`
 */
function sanitizeAgentProjectDirectorySegment(value: string): string {
    return value
        .replace(AGENT_PROJECT_DIRECTORY_UNSAFE_CHARACTER_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Note: Keep using slash-separated paths for parity with existing Agents Server filesystem helpers.
