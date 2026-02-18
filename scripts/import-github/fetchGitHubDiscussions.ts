import { makeGitHubGraphQLRequest } from './makeGitHubGraphQLRequest';

type GitHubDiscussion = {
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

type GitHubDiscussionsResponse = {
    repository: {
        discussions: {
            pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
            };
            nodes: GitHubDiscussion[];
        };
    };
};

/**
 * Fetches all GitHub discussions for the Promptbook repository via pagination.
 * @private function of ImportGitHub
 */
export async function fetchGitHubDiscussions(): Promise<GitHubDiscussion[]> {
    let allDiscussions: GitHubDiscussion[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    const query = `
        query($cursor: String) {
            repository(owner: "webgptorg", name: "promptbook") {
                discussions(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        number
                        title
                        body
                        author {
                            login
                        }
                        createdAt
                        updatedAt
                        category {
                            name
                        }
                        comments(first: 100) {
                            nodes {
                                author {
                                    login
                                }
                                body
                                createdAt
                            }
                        }
                    }
                }
            }
        }
    `;

    while (hasNextPage) {
        const data = await makeGitHubGraphQLRequest<GitHubDiscussionsResponse>(query, { cursor: endCursor });
        const discussionsData = data.repository.discussions;

        allDiscussions = allDiscussions.concat(discussionsData.nodes);
        hasNextPage = discussionsData.pageInfo.hasNextPage;
        endCursor = discussionsData.pageInfo.endCursor;
    }

    return allDiscussions;
}
