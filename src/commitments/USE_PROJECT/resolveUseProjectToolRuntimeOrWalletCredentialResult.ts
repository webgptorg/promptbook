import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import { normalizeOptionalToolText } from './normalizeOptionalToolText';
import {
    parseGitHubRepositoryReference,
    type GitHubRepositoryReference,
} from './projectReference';
import { UseProjectWallet } from './UseProjectWallet';

/**
 * Shared hidden arguments potentially injected into any USE PROJECT tool call.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectToolArgsBase = {
    repository?: string;
    __promptbookToolRuntimeContext?: unknown;
};

/**
 * Minimal runtime context shape needed by USE PROJECT tool functions.
 *
 * @private type of resolveUseProjectToolRuntimeOrWalletCredentialResult
 */
type UseProjectRuntimeContext = {
    projects?: {
        githubToken?: string;
        repositories?: string[];
    };
};

/**
 * Tool result returned when USE PROJECT requires wallet credentials.
 *
 * @private type of resolveUseProjectToolRuntimeOrWalletCredentialResult
 */
type ProjectWalletCredentialRequiredToolResult = {
    action: 'project-auth';
    status: 'wallet-credential-required';
    recordType: 'ACCESS_TOKEN';
    service: string;
    key: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    repository?: string;
    message: string;
};

/**
 * Resolved runtime payload used by USE PROJECT tools.
 *
 * @private type of resolveUseProjectToolRuntimeOrWalletCredentialResult
 */
type UseProjectResolvedRuntime = {
    repositoryReference: GitHubRepositoryReference;
    token: string;
};

/**
 * Runtime resolution result for USE PROJECT tools.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectToolRuntimeResolution = UseProjectResolvedRuntime | { walletResult: string };

/**
 * Internal error used to signal missing wallet credentials.
 *
 * @private class of resolveUseProjectToolRuntimeOrWalletCredentialResult
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
        this.service = UseProjectWallet.service;
        this.key = UseProjectWallet.key;
        this.repository = options?.repository;
    }
}

/**
 * Resolves project runtime or returns a wallet-credential-required payload when missing.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function resolveUseProjectToolRuntimeOrWalletCredentialResult(
    args: UseProjectToolArgsBase,
): UseProjectToolRuntimeResolution {
    try {
        return resolveUseProjectToolRuntime(args);
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
 * Resolves runtime repository + GitHub token for a USE PROJECT tool call.
 *
 * @private function of resolveUseProjectToolRuntimeOrWalletCredentialResult
 */
function resolveUseProjectToolRuntime(args: UseProjectToolArgsBase): UseProjectResolvedRuntime {
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
 * @private function of resolveUseProjectToolRuntimeOrWalletCredentialResult
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
 * Converts missing-wallet errors into structured tool result payloads.
 *
 * @private function of resolveUseProjectToolRuntimeOrWalletCredentialResult
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
        isUserScoped: false,
        isGlobal: false,
        repository: error.repository,
        message: error.message,
    };
}
