import { spaceTrim } from 'spacetrim';

/**
 * Hostnames accepted for GitHub repository references.
 *
 * @private internal USE PROJECT constant
 */
const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com']);

/**
 * Pattern for validating owner/repository slugs.
 *
 * @private internal USE PROJECT constant
 */
const GITHUB_REPOSITORY_SLUG_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * Canonical GitHub repository reference resolved from commitment content.
 *
 * @private internal utility of USE PROJECT commitment
 */
export type GitHubRepositoryReference = {
    owner: string;
    repository: string;
    slug: string;
    url: string;
    defaultBranch?: string;
};

/**
 * Parsed `USE PROJECT` payload.
 *
 * @private internal utility of USE PROJECT commitment
 */
export type ParsedUseProjectCommitmentContent = {
    repository: GitHubRepositoryReference | null;
    repositoryReferenceRaw: string | null;
    instructions: string;
};

/**
 * Parses a repository reference into canonical owner/repository details.
 *
 * Supported input forms:
 * - `https://github.com/owner/repository`
 * - `github.com/owner/repository`
 * - `owner/repository`
 * - optional `.git` suffix and trailing slash are supported
 *
 * @private internal utility of USE PROJECT commitment
 */
export function parseGitHubRepositoryReference(rawReference: string): GitHubRepositoryReference | null {
    const trimmedReference = rawReference.trim();
    if (!trimmedReference) {
        return null;
    }

    const normalizedReference = trimmedReference.replace(/\/+$/g, '');

    if (normalizedReference.startsWith('http://') || normalizedReference.startsWith('https://')) {
        return parseGitHubRepositoryReferenceFromUrl(normalizedReference);
    }

    if (normalizedReference.startsWith('github.com/')) {
        return parseGitHubRepositoryReferenceFromUrl(`https://${normalizedReference}`);
    }

    if (!GITHUB_REPOSITORY_SLUG_PATTERN.test(normalizedReference)) {
        return null;
    }

    const [owner, repositoryRaw] = normalizedReference.split('/');
    if (!owner || !repositoryRaw) {
        return null;
    }

    const repository = repositoryRaw.replace(/\.git$/i, '');
    if (!isValidGitHubRepositoryPart(owner) || !isValidGitHubRepositoryPart(repository)) {
        return null;
    }

    return createGitHubRepositoryReference(owner, repository);
}

/**
 * Parses `USE PROJECT` commitment content into repository reference + optional instructions.
 *
 * @private internal utility of USE PROJECT commitment
 */
export function parseUseProjectCommitmentContent(content: string): ParsedUseProjectCommitmentContent {
    const trimmedContent = spaceTrim(content);
    if (!trimmedContent) {
        return {
            repository: null,
            repositoryReferenceRaw: null,
            instructions: '',
        };
    }

    const lines = trimmedContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) {
        return {
            repository: null,
            repositoryReferenceRaw: null,
            instructions: '',
        };
    }

    const firstLine = lines[0] || '';
    const firstLineTokens = firstLine.split(/\s+/).filter(Boolean);

    let repositoryReferenceRaw: string | null = null;
    let repositoryReference: GitHubRepositoryReference | null = null;
    let repositoryTokenIndex = -1;

    for (let index = 0; index < firstLineTokens.length; index++) {
        const token = firstLineTokens[index] || '';
        const cleanedToken = token.replace(/[),.;:!?]+$/g, '');
        const parsedReference = parseGitHubRepositoryReference(cleanedToken);
        if (!parsedReference) {
            continue;
        }

        repositoryReferenceRaw = cleanedToken;
        repositoryReference = parsedReference;
        repositoryTokenIndex = index;
        break;
    }

    const instructionParts: string[] = [];

    if (repositoryTokenIndex >= 0) {
        const firstLineInstruction = firstLineTokens
            .filter((_token, index) => index !== repositoryTokenIndex)
            .join(' ')
            .trim();
        if (firstLineInstruction) {
            instructionParts.push(firstLineInstruction);
        }
    } else if (firstLine) {
        instructionParts.push(firstLine);
    }

    if (lines.length > 1) {
        const extraLines = lines.slice(1).join('\n').trim();
        if (extraLines) {
            instructionParts.push(extraLines);
        }
    }

    return {
        repository: repositoryReference,
        repositoryReferenceRaw,
        instructions: instructionParts.join('\n').trim(),
    };
}

/**
 * Extracts canonical repository URLs from parsed commitments.
 *
 * @private internal utility of USE PROJECT commitment
 */
export function extractUseProjectRepositoryUrlsFromCommitments(
    commitments: ReadonlyArray<{ type: string; content: string }>,
): string[] {
    const repositoryUrls = new Set<string>();

    for (const commitment of commitments) {
        if (commitment.type !== 'USE PROJECT') {
            continue;
        }

        const parsedCommitment = parseUseProjectCommitmentContent(commitment.content);
        if (!parsedCommitment.repository) {
            continue;
        }

        repositoryUrls.add(parsedCommitment.repository.url);
    }

    return [...repositoryUrls];
}

/**
 * Parses URL-like repository references.
 *
 * @private utility of USE PROJECT commitment
 */
function parseGitHubRepositoryReferenceFromUrl(rawUrl: string): GitHubRepositoryReference | null {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        return null;
    }

    if (!GITHUB_HOSTNAMES.has(parsedUrl.hostname.toLowerCase())) {
        return null;
    }

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
        return null;
    }

    const owner = segments[0];
    const repositoryRaw = segments[1];
    if (!owner || !repositoryRaw) {
        return null;
    }

    const repository = repositoryRaw.replace(/\.git$/i, '');
    if (!isValidGitHubRepositoryPart(owner) || !isValidGitHubRepositoryPart(repository)) {
        return null;
    }

    let defaultBranch: string | undefined;
    if (segments[2] === 'tree' && segments[3]) {
        defaultBranch = decodeURIComponent(segments[3]);
    }

    return createGitHubRepositoryReference(owner, repository, defaultBranch);
}

/**
 * Validates one owner/repository slug part.
 *
 * @private utility of USE PROJECT commitment
 */
function isValidGitHubRepositoryPart(value: string): boolean {
    return /^[A-Za-z0-9_.-]+$/.test(value);
}

/**
 * Builds canonical repository reference object.
 *
 * @private utility of USE PROJECT commitment
 */
function createGitHubRepositoryReference(
    owner: string,
    repository: string,
    defaultBranch?: string,
): GitHubRepositoryReference {
    const slug = `${owner}/${repository}`;
    return {
        owner,
        repository,
        slug,
        url: `https://github.com/${slug}`,
        defaultBranch,
    };
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
