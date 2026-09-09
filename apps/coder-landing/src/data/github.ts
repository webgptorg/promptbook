import 'server-only';
import { GITHUB_REPOSITORY } from './links';

/**
 * Public GitHub REST endpoint for the Promptbook repository.
 */
const GITHUB_REPOSITORY_API_URL = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;

/**
 * How long the GitHub star total is cached before the landing page requests a fresh value.
 */
const GITHUB_STARS_REVALIDATION_SECONDS = 60 * 60;

/**
 * Extracts a valid star count from an untrusted GitHub API response.
 */
function extractGitHubStarsCount(githubRepository: unknown): number | null {
    if (typeof githubRepository !== 'object' || githubRepository === null) {
        return null;
    }

    const githubStarsCount = (githubRepository as Record<string, unknown>).stargazers_count;

    if (typeof githubStarsCount !== 'number' || !Number.isSafeInteger(githubStarsCount) || githubStarsCount < 0) {
        return null;
    }

    return githubStarsCount;
}

/**
 * Fetches the current Promptbook GitHub star total.
 *
 * Returns `null` when GitHub is temporarily unavailable so the star call to action remains usable.
 */
export async function getGitHubStarsCount(): Promise<number | null> {
    try {
        const githubRepositoryResponse = await fetch(GITHUB_REPOSITORY_API_URL, {
            headers: {
                Accept: 'application/vnd.github+json',
            },
            next: {
                revalidate: GITHUB_STARS_REVALIDATION_SECONDS,
            },
        });

        if (!githubRepositoryResponse.ok) {
            return null;
        }

        return extractGitHubStarsCount(await githubRepositoryResponse.json());
    } catch {
        return null;
    }
}
