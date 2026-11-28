import { GITHUB_URL } from '@/data/links';

/**
 * Props accepted by the GitHub star call to action.
 */
type GitHubStarCallToActionProps = {
    /**
     * Current total of GitHub stars, or `null` when GitHub did not provide a total.
     */
    readonly githubStarsCount: number | null;
};

/**
 * Formats the GitHub star total consistently for the English-only landing page.
 */
function formatGitHubStarsCount(githubStarsCount: number): string {
    return new Intl.NumberFormat('en-US').format(githubStarsCount);
}

/**
 * Renders a reusable link that asks visitors to star Promptbook on GitHub and shows its current star total.
 */
export function GitHubStarCallToAction({ githubStarsCount }: GitHubStarCallToActionProps) {
    const formattedGitHubStarsCount = githubStarsCount === null ? null : formatGitHubStarsCount(githubStarsCount);
    const accessibleLabel =
        formattedGitHubStarsCount === null
            ? 'Star Promptbook on GitHub'
            : `Star Promptbook on GitHub. ${formattedGitHubStarsCount} stars.`;

    return (
        <a
            href={GITHUB_URL}
            aria-label={accessibleLabel}
            className="group inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3.5 py-1.5 text-sm font-medium text-gray-200 transition-colors hover:border-promptbook-blue hover:text-promptbook-blue"
        >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-promptbook-blue">
                <path d="m10 1.5 2.63 5.33 5.88.85-4.26 4.15 1.01 5.86L10 14.92l-5.26 2.77 1.01-5.86L1.5 7.68l5.88-.85L10 1.5Z" />
            </svg>
            <span className="whitespace-nowrap">Star on GitHub</span>
            {formattedGitHubStarsCount !== null && (
                <span
                    aria-hidden="true"
                    className="border-l border-gray-700 pl-2 text-xs font-semibold tabular-nums text-gray-300 transition-colors group-hover:border-promptbook-blue/60 group-hover:text-gray-100"
                >
                    {formattedGitHubStarsCount}
                </span>
            )}
        </a>
    );
}
