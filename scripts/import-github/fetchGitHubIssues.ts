import { makeGitHubGraphQLRequest } from './makeGitHubGraphQLRequest';

type GitHubIssue = {
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

type GitHubIssuesResponse = {
    repository: {
        issues: {
            pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
            };
            nodes: GitHubIssue[];
        };
    };
};

/**
 * Fetches all GitHub issues for the Promptbook repository via pagination.
 * @private function of ImportGitHub
 */
export async function fetchGitHubIssues(): Promise<GitHubIssue[]> {
    let allIssues: GitHubIssue[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    const query = `
        query($cursor: String) {
            repository(owner: "webgptorg", name: "promptbook") {
                issues(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
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
                        labels(first: 10) {
                            nodes {
                                name
                            }
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
        const data = await makeGitHubGraphQLRequest<GitHubIssuesResponse>(query, { cursor: endCursor });
        const issuesData = data.repository.issues;

        allIssues = allIssues.concat(issuesData.nodes);
        hasNextPage = issuesData.pageInfo.hasNextPage;
        endCursor = issuesData.pageInfo.endCursor;
    }

    return allIssues;
}
