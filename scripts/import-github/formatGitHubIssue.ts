import spaceTrim from 'spacetrim';
import { GENERATOR_WARNING } from '../../src/config';

type GitHubIssueForFormatting = {
    number: number;
    title: string;
    body: string;
    author: { login: string } | null;
    createdAt: string;
    updatedAt: string;
    labels: {
        nodes: {
            name: string;
        }[];
    };
    comments: {
        nodes: {
            author: { login: string } | null;
            body: string;
            createdAt: string;
        }[];
    };
};

/**
 * Formats a GitHub issue as Markdown with metadata and optional comments.
 * @private function of ImportGitHub
 */
export function formatGitHubIssue(issue: GitHubIssueForFormatting): string {
    const labels = issue.labels.nodes.map((label) => label.name).join(', ');
    const comments = issue.comments.nodes
        .map(
            (comment) =>
                spaceTrim(
                    (block) => `
                            ### Comment by ${comment.author?.login || 'ghost'} on ${new Date(
                        comment.createdAt,
                    ).toLocaleString()}

                            ${block(comment.body)}
                        `,
                ),
        )
        .join('\n\n---\n\n');

    return spaceTrim(
        (block) => `
            <!--${GENERATOR_WARNING}-->

            # ${issue.title}

            - Author: [${issue.author?.login || 'ghost'}](https://github.com/${issue.author?.login || ''})
            - Created at: ${new Date(issue.createdAt).toLocaleString()}
            - Updated at: ${new Date(issue.updatedAt).toLocaleString()}
            - Labels: ${labels}
            - Issue: #${issue.number}

            ${block(issue.body)}

            ${issue.comments.nodes.length > 0 ? `## Comments\n\n${block(comments)}` : ''}
        `,
    );
}
