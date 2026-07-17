import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { createLocalAgentDirectoryName, resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';

/**
 * Directory-name prefix shared by all local agent runner folders.
 */
const AGENT_DIRECTORY_NAME_PREFIX = 'agent-';

/**
 * Resolves the absolute path of the local agent folder for one agent permanent id.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Absolute agent folder path inside the local agent root.
 */
export function resolveAgentFolderPath(agentPermanentId: string): string {
    return join(resolveLocalAgentRootPath(), createLocalAgentDirectoryName(agentPermanentId));
}

/**
 * Resolves the absolute path of the `projects/` root of one agent.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Absolute projects root path of the agent.
 */
export function resolveAgentProjectsRootPath(agentPermanentId: string): string {
    return join(resolveAgentFolderPath(agentPermanentId), AGENT_PROJECTS_DIRECTORY_PATH);
}

/**
 * Extracts the agent permanent id from one local agent runner directory name.
 *
 * @param agentDirectoryName - Directory name, for example `agent-1dkmraaikkd8yp`.
 * @returns Permanent id part of the directory name, or `null` when the name does not follow the convention.
 */
export function parseAgentPermanentIdFromDirectoryName(agentDirectoryName: string): string | null {
    if (!agentDirectoryName.toLowerCase().startsWith(AGENT_DIRECTORY_NAME_PREFIX)) {
        return null;
    }

    const agentPermanentId = agentDirectoryName.slice(AGENT_DIRECTORY_NAME_PREFIX.length);
    return agentPermanentId.length > 0 ? agentPermanentId : null;
}

/**
 * Asserts that one path segment coming from a URL cannot escape its parent directory.
 *
 * @param pathSegment - Single decoded path segment (project name or one file path part).
 * @param segmentPurpose - Human-readable description used in the error message.
 * @throws {NotAllowed} When the segment is empty or attempts path traversal.
 */
export function assertSafeAgentProjectPathSegment(pathSegment: string, segmentPurpose: string): void {
    const isTraversalSegment = pathSegment === '.' || pathSegment === '..';
    const hasPathSeparator = pathSegment.includes('/') || pathSegment.includes('\\');
    const hasNullByte = pathSegment.includes('\0');

    if (pathSegment.length === 0 || isTraversalSegment || hasPathSeparator || hasNullByte) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid ${segmentPurpose} \`${pathSegment}\`.

                **Path segments must:**
                - be non-empty
                - not be \`.\` or \`..\`
                - not contain path separators or control characters
            `),
        );
    }
}

/**
 * Resolves one file path inside one agent project while preventing path traversal.
 *
 * @param options - Agent permanent id, project name, and file path segments from the URL.
 * @returns Absolute file path inside the project directory.
 * @throws {NotAllowed} When the project name or any file path segment is unsafe.
 */
export function resolveSafeAgentProjectFilePath(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly filePathSegments: ReadonlyArray<string>;
}): string {
    const { agentPermanentId, projectName, filePathSegments } = options;

    assertSafeAgentProjectPathSegment(projectName, 'project name');
    for (const filePathSegment of filePathSegments) {
        assertSafeAgentProjectPathSegment(filePathSegment, 'project file path segment');
    }

    return join(resolveAgentProjectsRootPath(agentPermanentId), projectName, ...filePathSegments);
}
