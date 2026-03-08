import type { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import {
    callGitHubApi,
    type UseProjectGitHubContentsItem,
    type UseProjectGitHubGitRefResponse,
    type UseProjectGitHubPullRequestResponse,
    type UseProjectGitHubRepositoryResponse,
} from './callGitHubApi';
import { normalizeOptionalToolText, normalizeRequiredToolText } from './normalizeOptionalToolText';
import {
    resolveUseProjectToolRuntimeOrWalletCredentialResult,
    type UseProjectToolArgsBase,
    type UseProjectToolRuntimeResolution,
} from './resolveUseProjectToolRuntimeOrWalletCredentialResult';
import { UseProjectToolNames } from './UseProjectToolNames';

/**
 * Max characters returned from `project_read_file`.
 *
 * @private constant of createUseProjectToolFunctions
 */
const MAX_PROJECT_FILE_CONTENT_CHARACTERS = 40000;

/**
 * Arguments accepted by `project_list_files`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectListFilesToolArgs = UseProjectToolArgsBase & {
    path?: string;
    ref?: string;
};

/**
 * Arguments accepted by `project_read_file`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectReadFileToolArgs = UseProjectToolArgsBase & {
    path: string;
    ref?: string;
    startLine?: number;
    endLine?: number;
};

/**
 * Arguments accepted by `project_upsert_file`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectUpsertFileToolArgs = UseProjectToolArgsBase & {
    path: string;
    content: string;
    message: string;
    branch?: string;
};

/**
 * Arguments accepted by `project_delete_file`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectDeleteFileToolArgs = UseProjectToolArgsBase & {
    path: string;
    message: string;
    branch?: string;
};

/**
 * Arguments accepted by `project_create_branch`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectCreateBranchToolArgs = UseProjectToolArgsBase & {
    branch: string;
    fromBranch?: string;
};

/**
 * Arguments accepted by `project_create_pull_request`.
 *
 * @private type of createUseProjectToolFunctions
 */
type ProjectCreatePullRequestToolArgs = UseProjectToolArgsBase & {
    title: string;
    head: string;
    base?: string;
    body?: string;
    draft?: boolean;
};

/**
 * Gets GitHub project tool function implementations.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function createUseProjectToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [UseProjectToolNames.listFiles](args: ProjectListFilesToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const normalizedPath = normalizeGitHubPath(args.path);
                const pathSuffix = normalizedPath ? `/${encodeGitHubPath(normalizedPath)}` : '';
                const query = createOptionalRefQuery(args.ref);

                const payload = await callGitHubApi<UseProjectGitHubContentsItem[] | UseProjectGitHubContentsItem>(
                    token,
                    {
                        method: 'GET',
                        path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}/contents${pathSuffix}`,
                        query,
                    },
                );

                const entries = (Array.isArray(payload) ? payload : [payload]).filter(
                    (entry): entry is UseProjectGitHubContentsItem => Boolean(entry && typeof entry === 'object'),
                );
                return JSON.stringify({
                    repository: repositoryReference.url,
                    path: normalizedPath || '',
                    ref: query.ref,
                    entries: entries.map((entry) => ({
                        name: entry.name,
                        path: entry.path,
                        type: entry.type,
                        size: entry.size,
                        sha: entry.sha,
                        htmlUrl: entry.html_url,
                        downloadUrl: entry.download_url,
                    })),
                });
            });
        },

        async [UseProjectToolNames.readFile](args: ProjectReadFileToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const normalizedPath = normalizeGitHubPath(args.path);
                if (!normalizedPath) {
                    throw new Error('Tool "project_read_file" requires non-empty "path".');
                }

                const query = createOptionalRefQuery(args.ref);
                const payload = await callGitHubApi<UseProjectGitHubContentsItem>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/contents/${encodeGitHubPath(normalizedPath)}`,
                    query,
                });

                if (!payload || payload.type !== 'file' || typeof payload.content !== 'string') {
                    throw new Error(`Path "${normalizedPath}" is not a readable text file.`);
                }

                const decodedContent = decodeBase64Text(payload.content);
                const lineRangedContent = applyOptionalLineRange(decodedContent, args.startLine, args.endLine);
                const wasTruncated = lineRangedContent.length > MAX_PROJECT_FILE_CONTENT_CHARACTERS;
                const contentToReturn = wasTruncated
                    ? `${lineRangedContent.slice(0, MAX_PROJECT_FILE_CONTENT_CHARACTERS)}\n\n[...truncated...]`
                    : lineRangedContent;

                return JSON.stringify({
                    repository: repositoryReference.url,
                    path: normalizedPath,
                    ref: query.ref,
                    sha: payload.sha,
                    size: payload.size,
                    wasTruncated,
                    content: contentToReturn,
                });
            });
        },

        async [UseProjectToolNames.upsertFile](args: ProjectUpsertFileToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const normalizedPath = normalizeGitHubPath(args.path);
                if (!normalizedPath) {
                    throw new Error('Tool "project_upsert_file" requires non-empty "path".');
                }

                const commitMessage = normalizeRequiredToolText(args.message, 'message');
                const fileContent = typeof args.content === 'string' ? args.content : String(args.content ?? '');
                const branch = normalizeOptionalToolText(args.branch);
                const query: Record<string, string> = {};
                if (branch) {
                    query.ref = branch;
                }

                const existingFile = await callGitHubApi<UseProjectGitHubContentsItem>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/contents/${encodeGitHubPath(normalizedPath)}`,
                    query,
                    allowNotFound: true,
                });

                const requestBody: Record<string, unknown> = {
                    message: commitMessage,
                    content: encodeUtf8ToBase64(fileContent),
                };

                if (branch) {
                    requestBody.branch = branch;
                }

                if (existingFile && existingFile.sha) {
                    requestBody.sha = existingFile.sha;
                }

                const payload = await callGitHubApi<{
                    content?: UseProjectGitHubContentsItem;
                    commit?: { sha?: string; html_url?: string };
                }>(token, {
                    method: 'PUT',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/contents/${encodeGitHubPath(normalizedPath)}`,
                    body: requestBody,
                });

                return JSON.stringify({
                    repository: repositoryReference.url,
                    path: normalizedPath,
                    branch: branch || null,
                    operation: existingFile ? 'updated' : 'created',
                    contentSha: payload?.content?.sha,
                    commitSha: payload?.commit?.sha,
                    commitUrl: payload?.commit?.html_url,
                });
            });
        },

        async [UseProjectToolNames.deleteFile](args: ProjectDeleteFileToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const normalizedPath = normalizeGitHubPath(args.path);
                if (!normalizedPath) {
                    throw new Error('Tool "project_delete_file" requires non-empty "path".');
                }

                const commitMessage = normalizeRequiredToolText(args.message, 'message');
                const branch = normalizeOptionalToolText(args.branch);
                const query: Record<string, string> = {};
                if (branch) {
                    query.ref = branch;
                }

                const existingFile = await callGitHubApi<UseProjectGitHubContentsItem>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/contents/${encodeGitHubPath(normalizedPath)}`,
                    query,
                    allowNotFound: true,
                });

                if (!existingFile || !existingFile.sha) {
                    throw new Error(`Cannot delete "${normalizedPath}" because it does not exist.`);
                }

                const requestBody: Record<string, unknown> = {
                    message: commitMessage,
                    sha: existingFile.sha,
                };
                if (branch) {
                    requestBody.branch = branch;
                }

                const payload = await callGitHubApi<{ commit?: { sha?: string; html_url?: string } }>(token, {
                    method: 'DELETE',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/contents/${encodeGitHubPath(normalizedPath)}`,
                    body: requestBody,
                });

                return JSON.stringify({
                    repository: repositoryReference.url,
                    path: normalizedPath,
                    branch: branch || null,
                    operation: 'deleted',
                    commitSha: payload?.commit?.sha,
                    commitUrl: payload?.commit?.html_url,
                });
            });
        },

        async [UseProjectToolNames.createBranch](args: ProjectCreateBranchToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const branch = normalizeRequiredToolText(args.branch, 'branch');

                const repositoryDetails = await callGitHubApi<UseProjectGitHubRepositoryResponse>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}`,
                });

                const fromBranch =
                    normalizeOptionalToolText(args.fromBranch) ||
                    repositoryReference.defaultBranch ||
                    repositoryDetails?.default_branch ||
                    'main';

                const fromBranchReference = await callGitHubApi<UseProjectGitHubGitRefResponse>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${
                        repositoryReference.repository
                    }/git/ref/heads/${encodeURIComponent(fromBranch)}`,
                });

                const sourceSha = fromBranchReference?.object?.sha;
                if (!sourceSha) {
                    throw new Error(`Unable to resolve source branch "${fromBranch}".`);
                }

                await callGitHubApi(token, {
                    method: 'POST',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}/git/refs`,
                    body: {
                        ref: `refs/heads/${branch}`,
                        sha: sourceSha,
                    },
                });

                return JSON.stringify({
                    repository: repositoryReference.url,
                    branch,
                    fromBranch,
                    sourceSha,
                    branchUrl: `${repositoryReference.url}/tree/${encodeURIComponent(branch)}`,
                });
            });
        },

        async [UseProjectToolNames.createPullRequest](args: ProjectCreatePullRequestToolArgs): Promise<string> {
            return withUseProjectRuntime(args, async ({ repositoryReference, token }) => {
                const title = normalizeRequiredToolText(args.title, 'title');
                const head = normalizeRequiredToolText(args.head, 'head');

                const repositoryDetails = await callGitHubApi<UseProjectGitHubRepositoryResponse>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}`,
                });

                const base =
                    normalizeOptionalToolText(args.base) ||
                    repositoryReference.defaultBranch ||
                    repositoryDetails?.default_branch ||
                    'main';

                const payload = await callGitHubApi<UseProjectGitHubPullRequestResponse>(token, {
                    method: 'POST',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}/pulls`,
                    body: {
                        title,
                        head,
                        base,
                        body: normalizeOptionalToolText(args.body) || undefined,
                        draft: args.draft === true,
                    },
                });

                return JSON.stringify({
                    repository: repositoryReference.url,
                    number: payload?.number,
                    title: payload?.title,
                    state: payload?.state,
                    url: payload?.html_url,
                    head: payload?.head?.ref,
                    base: payload?.base?.ref,
                });
            });
        },
    };
}

/**
 * Executes one tool operation with resolved USE PROJECT runtime.
 *
 * @private function of createUseProjectToolFunctions
 */
async function withUseProjectRuntime(
    args: UseProjectToolArgsBase,
    operation: (runtime: Exclude<UseProjectToolRuntimeResolution, { walletResult: string }>) => Promise<string>,
): Promise<string> {
    const runtime = resolveUseProjectToolRuntimeOrWalletCredentialResult(args);
    if ('walletResult' in runtime) {
        return runtime.walletResult;
    }

    return operation(runtime);
}

/**
 * Builds optional `ref` query payload from tool input.
 *
 * @private function of createUseProjectToolFunctions
 */
function createOptionalRefQuery(refValue: unknown): Record<string, string> {
    const ref = normalizeOptionalToolText(refValue);
    if (!ref) {
        return {};
    }

    return { ref };
}

/**
 * Normalizes repository file path.
 *
 * @private function of createUseProjectToolFunctions
 */
function normalizeGitHubPath(path: unknown): string {
    if (typeof path !== 'string') {
        return '';
    }

    return path.trim().replace(/^\/+/, '').replace(/\/+/g, '/');
}

/**
 * URL-encodes each path segment for GitHub API endpoints.
 *
 * @private function of createUseProjectToolFunctions
 */
function encodeGitHubPath(path: string): string {
    return path
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

/**
 * Decodes Base64 payload into UTF-8 text.
 *
 * @private function of createUseProjectToolFunctions
 */
function decodeBase64Text(base64Content: string): string {
    const normalized = base64Content.replace(/\s+/g, '');
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(normalized, 'base64').toString('utf8');
    }

    if (typeof atob === 'function') {
        const binary = atob(normalized);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    throw new Error('Base64 decoding is not available in this runtime.');
}

/**
 * Encodes UTF-8 text into Base64 payload.
 *
 * @private function of createUseProjectToolFunctions
 */
function encodeUtf8ToBase64(text: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(text, 'utf8').toString('base64');
    }

    if (typeof btoa === 'function') {
        const bytes = new TextEncoder().encode(text);
        const binary = Array.from(bytes)
            .map((byte) => String.fromCharCode(byte))
            .join('');
        return btoa(binary);
    }

    throw new Error('Base64 encoding is not available in this runtime.');
}

/**
 * Applies optional 1-based line range filtering.
 *
 * @private function of createUseProjectToolFunctions
 */
function applyOptionalLineRange(content: string, startLineRaw?: number, endLineRaw?: number): string {
    if (!Number.isFinite(startLineRaw) && !Number.isFinite(endLineRaw)) {
        return content;
    }

    const lines = content.split('\n');
    const normalizedStartLine = Number.isFinite(startLineRaw) ? Math.max(1, Math.floor(startLineRaw!)) : 1;
    const normalizedEndLine = Number.isFinite(endLineRaw)
        ? Math.max(normalizedStartLine, Math.floor(endLineRaw!))
        : lines.length;

    return lines.slice(normalizedStartLine - 1, normalizedEndLine).join('\n');
}
