import spaceTrim from 'spacetrim';
import { GENERATOR_WARNING } from '../../src/config';

type GitHubDiscussionForFormatting = {
    number: number;
    title: string;
    body: string;
    author: { login: string } | null;
    createdAt: string;
    updatedAt: string;
    category: {
        name: string;
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
 * Formats a GitHub discussion as Markdown with metadata and optional comments.
 * @private function of ImportGitHub
 */
export function formatGitHubDiscussion(discussion: GitHubDiscussionForFormatting): string {
    const comments = discussion.comments.nodes
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

            # ${discussion.title}

            - Author: [${discussion.author?.login || 'ghost'}](https://github.com/${discussion.author?.login || ''})
            - Created at: ${new Date(discussion.createdAt).toLocaleString()}
            - Updated at: ${new Date(discussion.updatedAt).toLocaleString()}
            - Category: ${discussion.category.name}
            - Discussion: #${discussion.number}

            ${block(discussion.body)}

            ${discussion.comments.nodes.length > 0 ? `## Comments\n\n${block(comments)}` : ''}
        `,
    );
}
