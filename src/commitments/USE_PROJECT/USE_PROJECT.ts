import { spaceTrim } from 'spacetrim';
import { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import {
    parseGitHubRepositoryReference,
    parseUseProjectCommitmentContent,
    type GitHubRepositoryReference,
} from './projectReference';

/**
 * Base GitHub API URL.
 *
 * @private internal USE PROJECT constant
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * Max characters returned from `project_read_file`.
 *
 * @private internal USE PROJECT constant
 */
const MAX_PROJECT_FILE_CONTENT_CHARACTERS = 40000;

/**
 * Tool name for listing project files.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_LIST_FILES_TOOL_NAME = 'project_list_files' as string_javascript_name;

/**
 * Tool name for reading one project file.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_READ_FILE_TOOL_NAME = 'project_read_file' as string_javascript_name;

/**
 * Tool name for creating or updating one project file.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_UPSERT_FILE_TOOL_NAME = 'project_upsert_file' as string_javascript_name;

/**
 * Tool name for deleting one project file.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_DELETE_FILE_TOOL_NAME = 'project_delete_file' as string_javascript_name;

/**
 * Tool name for creating a branch.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_CREATE_BRANCH_TOOL_NAME = 'project_create_branch' as string_javascript_name;

/**
 * Tool name for creating pull requests.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_CREATE_PULL_REQUEST_TOOL_NAME = 'project_create_pull_request' as string_javascript_name;

/**
 * Minimal runtime context shape needed by this commitment.
 *
 * @private internal USE PROJECT type
 */
type UseProjectRuntimeContext = {
    projects?: {
        githubToken?: string;
        repositories?: string[];
    };
};

/**
 * Shared hidden arguments potentially injected into any tool call.
 *
 * @private internal USE PROJECT type
 */
type UseProjectToolArgsBase = {
    repository?: string;
    __promptbookToolRuntimeContext?: unknown;
};

/**
 * Arguments accepted by `project_list_files`.
 *
 * @private internal USE PROJECT type
 */
type ProjectListFilesToolArgs = UseProjectToolArgsBase & {
    path?: string;
    ref?: string;
};

/**
 * Arguments accepted by `project_read_file`.
 *
 * @private internal USE PROJECT type
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
 * @private internal USE PROJECT type
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
 * @private internal USE PROJECT type
 */
type ProjectDeleteFileToolArgs = UseProjectToolArgsBase & {
    path: string;
    message: string;
    branch?: string;
};

/**
 * Arguments accepted by `project_create_branch`.
 *
 * @private internal USE PROJECT type
 */
type ProjectCreateBranchToolArgs = UseProjectToolArgsBase & {
    branch: string;
    fromBranch?: string;
};

/**
 * Arguments accepted by `project_create_pull_request`.
 *
 * @private internal USE PROJECT type
 */
type ProjectCreatePullRequestToolArgs = UseProjectToolArgsBase & {
    title: string;
    head: string;
    base?: string;
    body?: string;
    draft?: boolean;
};

/**
 * Minimal shape returned by GitHub content APIs.
 *
 * @private internal USE PROJECT type
 */
type GitHubContentsItem = {
    type: string;
    name: string;
    path: string;
    sha?: string;
    size?: number;
    content?: string;
    html_url?: string;
    download_url?: string;
};

/**
 * Minimal shape of GitHub branch reference API response.
 *
 * @private internal USE PROJECT type
 */
type GitHubGitRefResponse = {
    object?: {
        sha?: string;
    };
};

/**
 * Minimal shape of GitHub repository API response.
 *
 * @private internal USE PROJECT type
 */
type GitHubRepositoryResponse = {
    default_branch?: string;
};

/**
 * Minimal shape of GitHub pull request response.
 *
 * @private internal USE PROJECT type
 */
type GitHubPullRequestResponse = {
    number?: number;
    html_url?: string;
    title?: string;
    state?: string;
    head?: {
        ref?: string;
    };
    base?: {
        ref?: string;
    };
};

/**
 * Configured project reference stored in model requirements metadata.
 *
 * @private internal USE PROJECT type
 */
type ConfiguredProjectReference = {
    url: string;
    slug: string;
    defaultBranch?: string;
};

/**
 * Wallet service identifier used for GitHub credentials.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_WALLET_SERVICE = 'github';

/**
 * Wallet key used for GitHub credentials required by USE PROJECT.
 *
 * @private internal USE PROJECT constant
 */
const PROJECT_WALLET_KEY = 'use-project-github-token';

/**
 * Tool result returned when USE PROJECT requires wallet credentials.
 *
 * @private internal USE PROJECT type
 */
type ProjectWalletCredentialRequiredToolResult = {
    action: 'project-auth';
    status: 'wallet-credential-required';
    recordType: 'ACCESS_TOKEN';
    service: string;
    key: string;
    repository?: string;
    message: string;
};

/**
 * Internal error used to signal missing wallet credentials.
 *
 * @private internal USE PROJECT type
 */
class ProjectWalletCredentialRequiredError extends Error {
    public readonly service: string;
    public readonly key: string;
    public readonly repository?: string;

    public constructor(options?: { repository?: string }) {
        super(
            'GitHub token is missing in wallet. Request it from user and store as ACCESS_TOKEN (service github, key use-project-github-token).',
        );
        this.name = 'ProjectWalletCredentialRequiredError';
        this.service = PROJECT_WALLET_SERVICE;
        this.key = PROJECT_WALLET_KEY;
        this.repository = options?.repository;
    }
}

/**
 * USE PROJECT commitment definition.
 *
 * `USE PROJECT` enables GitHub repository tooling so the agent can browse source files,
 * edit code, and open pull requests against declared repositories.
 *
 * Authentication is expected through runtime context provided by the host app UI.
 * Hosts can provide manual wallet tokens or auto-issued integration tokens (for example via GitHub App).
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseProjectCommitmentDefinition extends BaseCommitmentDefinition<'USE PROJECT'> {
    public constructor() {
        super('USE PROJECT', ['PROJECT']);
    }

    /**
     * Short one-line description of USE PROJECT.
     */
    get description(): string {
        return 'Enable GitHub project tools for reading/editing repository files and creating pull requests.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧑‍💻';
    }

    /**
     * Markdown documentation for USE PROJECT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE PROJECT

            Enables the agent to work with files in a GitHub repository and create pull requests.

            ## Key aspects

            - The first repository reference in the commitment should point to GitHub repository (for example \`https://github.com/owner/repo\`).
            - Optional extra instructions can follow the repository reference.
            - The runtime provides a GitHub token (manual wallet token or host-managed integration token).
            - Tools support listing files, reading files, editing files, deleting files, creating branches, and opening pull requests.

            ## Examples

            \`\`\`book
            AI Developer

            PERSONA You are a TypeScript developer
            USE PROJECT https://github.com/example/project
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const parsedCommitment = parseUseProjectCommitmentContent(content);
        if (!parsedCommitment.repository) {
            return requirements;
        }

        const existingTools = requirements.tools || [];
        const updatedTools = addUseProjectTools(existingTools);
        const existingConfiguredProjects = normalizeConfiguredProjects(requirements._metadata?.useProjects);

        if (!existingConfiguredProjects.some((project) => project.url === parsedCommitment.repository!.url)) {
            existingConfiguredProjects.push({
                url: parsedCommitment.repository.url,
                slug: parsedCommitment.repository.slug,
                defaultBranch: parsedCommitment.repository.defaultBranch,
            });
        }

        const repositoriesList = existingConfiguredProjects.map((project) => `- ${project.url}`).join('\n');
        const extraInstructions = formatOptionalInstructionBlock('Project instructions', parsedCommitment.instructions);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useProject: true,
                    useProjects: existingConfiguredProjects,
                },
            },
            spaceTrim(
                (block) => `
                    Project tools:
                    - You can inspect and edit configured GitHub repositories using project tools.
                    - Configured repositories:
                      ${block(repositoriesList)}
                    - When a repository is not obvious from context, pass "repository" in tool arguments explicitly.
                    - USE PROJECT credentials are read from wallet records (ACCESS_TOKEN, service "${PROJECT_WALLET_SERVICE}", key "${PROJECT_WALLET_KEY}").
                    - If credentials are missing, ask the user to connect credentials in host UI and/or add them to wallet (or call "request_wallet_record" when WALLET commitment is available).
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [PROJECT_LIST_FILES_TOOL_NAME]: 'List project files',
            [PROJECT_READ_FILE_TOOL_NAME]: 'Read project file',
            [PROJECT_UPSERT_FILE_TOOL_NAME]: 'Write project file',
            [PROJECT_DELETE_FILE_TOOL_NAME]: 'Delete project file',
            [PROJECT_CREATE_BRANCH_TOOL_NAME]: 'Create project branch',
            [PROJECT_CREATE_PULL_REQUEST_TOOL_NAME]: 'Create pull request',
        };
    }

    /**
     * Gets GitHub project tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [PROJECT_LIST_FILES_TOOL_NAME](args: ProjectListFilesToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
                const normalizedPath = normalizeGitHubPath(args.path);
                const pathSuffix = normalizedPath ? `/${encodeGitHubPath(normalizedPath)}` : '';

                const query: Record<string, string> = {};
                if (typeof args.ref === 'string' && args.ref.trim()) {
                    query.ref = args.ref.trim();
                }

                const payload = await callGitHubApi<GitHubContentsItem[] | GitHubContentsItem>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}/contents${pathSuffix}`,
                    query,
                });

                const entries = (Array.isArray(payload) ? payload : [payload]).filter(
                    (entry): entry is GitHubContentsItem => Boolean(entry && typeof entry === 'object'),
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
            },

            async [PROJECT_READ_FILE_TOOL_NAME](args: ProjectReadFileToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
                const normalizedPath = normalizeGitHubPath(args.path);
                if (!normalizedPath) {
                    throw new Error('Tool "project_read_file" requires non-empty "path".');
                }

                const query: Record<string, string> = {};
                if (typeof args.ref === 'string' && args.ref.trim()) {
                    query.ref = args.ref.trim();
                }

                const payload = await callGitHubApi<GitHubContentsItem>(token, {
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
            },

            async [PROJECT_UPSERT_FILE_TOOL_NAME](args: ProjectUpsertFileToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
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

                const existingFile = await callGitHubApi<GitHubContentsItem>(token, {
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
                    content?: GitHubContentsItem;
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
            },

            async [PROJECT_DELETE_FILE_TOOL_NAME](args: ProjectDeleteFileToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
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

                const existingFile = await callGitHubApi<GitHubContentsItem>(token, {
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
            },

            async [PROJECT_CREATE_BRANCH_TOOL_NAME](args: ProjectCreateBranchToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
                const branch = normalizeRequiredToolText(args.branch, 'branch');

                const repositoryDetails = await callGitHubApi<GitHubRepositoryResponse>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}`,
                });

                const fromBranch =
                    normalizeOptionalToolText(args.fromBranch) ||
                    repositoryReference.defaultBranch ||
                    repositoryDetails?.default_branch ||
                    'main';

                const fromBranchReference = await callGitHubApi<GitHubGitRefResponse>(token, {
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
            },

            async [PROJECT_CREATE_PULL_REQUEST_TOOL_NAME](args: ProjectCreatePullRequestToolArgs): Promise<string> {
                const runtime = resolveProjectRuntimeOrWalletCredentialResult(args);
                if ('walletResult' in runtime) {
                    return runtime.walletResult;
                }
                const { repositoryReference, token } = runtime;
                const title = normalizeRequiredToolText(args.title, 'title');
                const head = normalizeRequiredToolText(args.head, 'head');

                const repositoryDetails = await callGitHubApi<GitHubRepositoryResponse>(token, {
                    method: 'GET',
                    path: `/repos/${repositoryReference.owner}/${repositoryReference.repository}`,
                });

                const base =
                    normalizeOptionalToolText(args.base) ||
                    repositoryReference.defaultBranch ||
                    repositoryDetails?.default_branch ||
                    'main';

                const payload = await callGitHubApi<GitHubPullRequestResponse>(token, {
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
            },
        };
    }
}

/**
 * Adds USE PROJECT tool definitions while keeping already registered tools untouched.
 *
 * @private utility of USE PROJECT commitment
 */
function addUseProjectTools(existingTools: ReadonlyArray<LlmToolDefinition>): Array<LlmToolDefinition> {
    const updatedTools = [...existingTools];

    const addToolIfMissing = (tool: LlmToolDefinition): void => {
        if (!updatedTools.some((existingTool) => existingTool.name === tool.name)) {
            updatedTools.push(tool);
        }
    };

    addToolIfMissing({
        name: PROJECT_LIST_FILES_TOOL_NAME,
        description:
            'List files and directories from a configured GitHub repository. Use this first to understand project structure.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                path: {
                    type: 'string',
                    description: 'Directory path in repository (empty means repository root).',
                },
                ref: {
                    type: 'string',
                    description: 'Optional branch, tag, or commit SHA.',
                },
            },
            required: [],
        },
    });

    addToolIfMissing({
        name: PROJECT_READ_FILE_TOOL_NAME,
        description:
            'Read one text file from a configured GitHub repository. Useful for source analysis and understanding implementation details.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                path: {
                    type: 'string',
                    description: 'File path in repository.',
                },
                ref: {
                    type: 'string',
                    description: 'Optional branch, tag, or commit SHA.',
                },
                startLine: {
                    type: 'integer',
                    description: 'Optional first line number (1-based) for partial reads.',
                },
                endLine: {
                    type: 'integer',
                    description: 'Optional last line number (1-based) for partial reads.',
                },
            },
            required: ['path'],
        },
    });

    addToolIfMissing({
        name: PROJECT_UPSERT_FILE_TOOL_NAME,
        description:
            'Create or update one file in a configured GitHub repository, committing the change directly to target branch.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                path: {
                    type: 'string',
                    description: 'File path to create or update.',
                },
                content: {
                    type: 'string',
                    description: 'Full UTF-8 text content to write.',
                },
                message: {
                    type: 'string',
                    description: 'Commit message for this file change.',
                },
                branch: {
                    type: 'string',
                    description: 'Optional branch name (defaults to repository default branch).',
                },
            },
            required: ['path', 'content', 'message'],
        },
    });

    addToolIfMissing({
        name: PROJECT_DELETE_FILE_TOOL_NAME,
        description: 'Delete one file from a configured GitHub repository and commit the deletion.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                path: {
                    type: 'string',
                    description: 'File path to delete.',
                },
                message: {
                    type: 'string',
                    description: 'Commit message for deleting the file.',
                },
                branch: {
                    type: 'string',
                    description: 'Optional branch name (defaults to repository default branch).',
                },
            },
            required: ['path', 'message'],
        },
    });

    addToolIfMissing({
        name: PROJECT_CREATE_BRANCH_TOOL_NAME,
        description: 'Create a new branch in a configured GitHub repository.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                branch: {
                    type: 'string',
                    description: 'Name of the branch to create.',
                },
                fromBranch: {
                    type: 'string',
                    description: 'Source branch (defaults to repository default branch).',
                },
            },
            required: ['branch'],
        },
    });

    addToolIfMissing({
        name: PROJECT_CREATE_PULL_REQUEST_TOOL_NAME,
        description: 'Create a pull request in a configured GitHub repository.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description:
                        'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").',
                },
                title: {
                    type: 'string',
                    description: 'Pull request title.',
                },
                head: {
                    type: 'string',
                    description: 'Source branch name.',
                },
                base: {
                    type: 'string',
                    description: 'Target branch name (defaults to repository default branch).',
                },
                body: {
                    type: 'string',
                    description: 'Optional pull request body in Markdown.',
                },
                draft: {
                    type: 'boolean',
                    description: 'Whether pull request should be created as draft.',
                },
            },
            required: ['title', 'head'],
        },
    });

    return updatedTools;
}

/**
 * Parses previously stored metadata value into normalized project list.
 *
 * @private utility of USE PROJECT commitment
 */
function normalizeConfiguredProjects(rawValue: unknown): Array<ConfiguredProjectReference> {
    if (!Array.isArray(rawValue)) {
        return [];
    }

    const configuredProjects: Array<ConfiguredProjectReference> = [];

    for (const rawEntry of rawValue) {
        if (!rawEntry || typeof rawEntry !== 'object') {
            continue;
        }

        const entry = rawEntry as Record<string, unknown>;
        const url = typeof entry.url === 'string' ? entry.url : null;
        const slug = typeof entry.slug === 'string' ? entry.slug : null;

        if (!url || !slug) {
            continue;
        }

        configuredProjects.push({
            url,
            slug,
            defaultBranch: typeof entry.defaultBranch === 'string' ? entry.defaultBranch : undefined,
        });
    }

    return configuredProjects;
}

/**
 * Converts missing-wallet errors into structured tool result payloads.
 *
 * @private utility of USE PROJECT commitment
 */
function createProjectWalletCredentialRequiredResult(
    error: ProjectWalletCredentialRequiredError,
): ProjectWalletCredentialRequiredToolResult {
    return {
        action: 'project-auth',
        status: 'wallet-credential-required',
        recordType: 'ACCESS_TOKEN',
        service: error.service,
        key: error.key,
        repository: error.repository,
        message: error.message,
    };
}

/**
 * Resolves project runtime or returns a wallet-credential result when missing.
 *
 * @private utility of USE PROJECT commitment
 */
function resolveProjectRuntimeOrWalletCredentialResult(
    args: UseProjectToolArgsBase,
): { repositoryReference: GitHubRepositoryReference; token: string } | { walletResult: string } {
    try {
        return resolveProjectRuntime(args);
    } catch (error) {
        if (error instanceof ProjectWalletCredentialRequiredError) {
            return {
                walletResult: JSON.stringify(createProjectWalletCredentialRequiredResult(error)),
            };
        }

        throw error;
    }
}

/**
 * Resolves runtime repository + GitHub token for a project tool call.
 *
 * @private utility of USE PROJECT commitment
 */
function resolveProjectRuntime(args: UseProjectToolArgsBase): {
    repositoryReference: GitHubRepositoryReference;
    token: string;
} {
    const runtimeContext = (readToolRuntimeContextFromToolArgs(args as Record<string, unknown>) ||
        {}) as UseProjectRuntimeContext;

    const allowedRepositories = normalizeAllowedRepositories(runtimeContext.projects?.repositories);
    const repositoryArgument = normalizeOptionalToolText(args.repository);

    let repositoryReference: GitHubRepositoryReference | null = null;
    if (repositoryArgument) {
        repositoryReference = parseGitHubRepositoryReference(repositoryArgument);
        if (!repositoryReference) {
            throw new Error(`Repository reference "${repositoryArgument}" is invalid.`);
        }
    } else if (allowedRepositories.length === 1) {
        repositoryReference = parseGitHubRepositoryReference(allowedRepositories[0]!);
    } else if (allowedRepositories.length > 1) {
        throw new Error(
            'Repository is ambiguous. Provide "repository" argument with one repository from USE PROJECT commitments.',
        );
    } else {
        throw new Error('Repository is required. Provide "repository" argument in the tool call.');
    }

    if (!repositoryReference) {
        throw new Error('Repository is required but was not resolved.');
    }

    const token = runtimeContext.projects?.githubToken?.trim() || '';

    if (!token) {
        throw new ProjectWalletCredentialRequiredError({
            repository: repositoryReference.url,
        });
    }

    if (allowedRepositories.length > 0) {
        const allowedSlugs = new Set(
            allowedRepositories
                .map((repository) => parseGitHubRepositoryReference(repository))
                .filter((repository): repository is GitHubRepositoryReference => repository !== null)
                .map((repository) => repository.slug),
        );

        if (!allowedSlugs.has(repositoryReference.slug)) {
            throw new Error(`Repository "${repositoryReference.url}" is not configured by USE PROJECT for this agent.`);
        }
    }

    return {
        repositoryReference,
        token,
    };
}

/**
 * Normalizes optional list of allowed repository references.
 *
 * @private utility of USE PROJECT commitment
 */
function normalizeAllowedRepositories(rawRepositories: unknown): string[] {
    if (!Array.isArray(rawRepositories)) {
        return [];
    }

    return rawRepositories
        .filter((repository): repository is string => typeof repository === 'string')
        .map((repository) => repository.trim())
        .filter(Boolean);
}

/**
 * Runs one GitHub API request and parses JSON response payload.
 *
 * @private utility of USE PROJECT commitment
 */
async function callGitHubApi<TResponse = unknown>(
    token: string,
    options: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        path: string;
        query?: Record<string, string>;
        body?: Record<string, unknown>;
        allowNotFound?: boolean;
    },
): Promise<TResponse | null> {
    const url = new URL(options.path, GITHUB_API_BASE_URL);
    if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
            if (value && value.trim()) {
                url.searchParams.set(key, value);
            }
        }
    }

    const response = await fetch(url.toString(), {
        method: options.method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Promptbook-UseProject-Tool',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const textPayload = await response.text();
    const parsedPayload = tryParseJson(textPayload);

    if (options.allowNotFound && response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            spaceTrim(`
                GitHub API request failed (${response.status} ${response.statusText}):
                ${extractGitHubApiErrorMessage(parsedPayload, textPayload)}
            `),
        );
    }

    return parsedPayload as TResponse;
}

/**
 * Parses raw text into JSON when possible.
 *
 * @private utility of USE PROJECT commitment
 */
function tryParseJson(rawText: string): unknown {
    if (!rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

/**
 * Extracts user-friendly GitHub API error message.
 *
 * @private utility of USE PROJECT commitment
 */
function extractGitHubApiErrorMessage(parsedPayload: unknown, fallbackText: string): string {
    if (parsedPayload && typeof parsedPayload === 'object') {
        const payload = parsedPayload as { message?: unknown; errors?: unknown };
        const message = typeof payload.message === 'string' ? payload.message : '';
        const errors = Array.isArray(payload.errors) ? payload.errors : [];
        const flattenedErrors = errors
            .map((errorEntry) => {
                if (typeof errorEntry === 'string') {
                    return errorEntry;
                }

                if (errorEntry && typeof errorEntry === 'object' && 'message' in errorEntry) {
                    const errorMessage = (errorEntry as { message?: unknown }).message;
                    return typeof errorMessage === 'string' ? errorMessage : '';
                }

                return '';
            })
            .filter(Boolean);

        if (message || flattenedErrors.length > 0) {
            return [message, ...flattenedErrors].filter(Boolean).join(' | ');
        }
    }

    return fallbackText || 'Unknown GitHub API error';
}

/**
 * Normalizes optional text argument to `string | null`.
 *
 * @private utility of USE PROJECT commitment
 */
function normalizeOptionalToolText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/**
 * Normalizes required text argument and throws when missing.
 *
 * @private utility of USE PROJECT commitment
 */
function normalizeRequiredToolText(value: unknown, fieldName: string): string {
    const normalized = normalizeOptionalToolText(value);
    if (!normalized) {
        throw new Error(`Tool argument "${fieldName}" is required.`);
    }

    return normalized;
}

/**
 * Normalizes repository file path.
 *
 * @private utility of USE PROJECT commitment
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
 * @private utility of USE PROJECT commitment
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
 * @private utility of USE PROJECT commitment
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
 * @private utility of USE PROJECT commitment
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
 * @private utility of USE PROJECT commitment
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

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
