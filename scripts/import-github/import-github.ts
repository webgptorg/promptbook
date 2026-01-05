#!/usr/bin/env ts-node
// import-github.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { GENERATOR_WARNING } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';
import { TODO_any } from '../../src/utils/organization/TODO_any';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { prettify } from '../utils/prettify';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

importGitHub({ isCommited })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(error.name));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function importGitHub({ isCommited }: { isCommited: boolean }) {
    console.info(`🐙  Importing GitHub discussions and issues`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    if (!process.env.GITHUB_TOKEN) {
        throw new Error(`GITHUB_TOKEN is not defined in the environment`);
    }

    const issues = await fetchGitHubIssues();
    const discussions = await fetchGitHubDiscussions();

    console.info(colors.cyan(`Saving ${issues.length} issues...`));
    for (const issue of issues) {
        const content = formatIssue(issue);
        const fileName = `${issue.number}-${slugify(issue.title)}.md`;
        const dir = join('documents/github/issues');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, fileName), await prettify(content, 'markdown'), 'utf-8');
    }

    console.info(colors.cyan(`Saving ${discussions.length} discussions...`));
    for (const discussion of discussions) {
        const content = formatDiscussion(discussion);
        const fileName = `${discussion.number}-${slugify(discussion.title)}.md`;
        const dir = join('documents/github/discussions', slugify(discussion.category.name));
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, fileName), await prettify(content, 'markdown'), 'utf-8');
    }

    if (isCommited) {
        await commit(['documents/github'], `🐙 Import GitHub discussions and issues`);
    }

    console.info(colors.green(`✅ GitHub import completed`));
}

type GitHubUser = {
    login: string;
};

type GitHubComment = {
    author: GitHubUser | null;
    body: string;
    createdAt: string;
};

type GitHubLabel = {
    name: string;
};

type GitHubIssue = {
    number: number;
    title: string;
    body: string;
    author: GitHubUser | null;
    createdAt: string;
    updatedAt: string;
    labels: {
        nodes: GitHubLabel[];
    };
    comments: {
        nodes: GitHubComment[];
    };
};

type GitHubCategory = {
    name: string;
};

type GitHubDiscussion = {
    number: number;
    title: string;
    body: string;
    author: GitHubUser | null;
    createdAt: string;
    updatedAt: string;
    category: GitHubCategory;
    comments: {
        nodes: GitHubComment[];
    };
};

async function fetchGitHubIssues(): Promise<GitHubIssue[]> {
    let allIssues: GitHubIssue[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
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

        const response: TODO_any = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables: { cursor: endCursor } }),
        });

        const data: TODO_any = await response.json();
        if (data.errors) {
            throw new Error(`GitHub API error: ${JSON.stringify(data.errors)}`);
        }

        const issuesData: TODO_any = data.data.repository.issues;
        allIssues = allIssues.concat(issuesData.nodes);
        hasNextPage = issuesData.pageInfo.hasNextPage;
        endCursor = issuesData.pageInfo.endCursor;
    }

    return allIssues;
}

async function fetchGitHubDiscussions(): Promise<GitHubDiscussion[]> {
    let allDiscussions: GitHubDiscussion[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
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

        const response: TODO_any = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables: { cursor: endCursor } }),
        });

        const data: TODO_any = await response.json();
        if (data.errors) {
            throw new Error(`GitHub API error: ${JSON.stringify(data.errors)}`);
        }

        const discussionsData: TODO_any = data.data.repository.discussions;
        allDiscussions = allDiscussions.concat(discussionsData.nodes);
        hasNextPage = discussionsData.pageInfo.hasNextPage;
        endCursor = discussionsData.pageInfo.endCursor;
    }

    return allDiscussions;
}

function formatIssue(issue: GitHubIssue): string {
    const labels = issue.labels.nodes.map((l) => l.name).join(', ');
    const comments = issue.comments.nodes
        .map(
            (c) => spaceTrim((block) => `
                ### Comment by ${c.author?.login || 'ghost'} on ${new Date(c.createdAt).toLocaleString()}

                ${block(c.body)}
            `),
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

function formatDiscussion(discussion: GitHubDiscussion): string {
    const comments = discussion.comments.nodes
        .map(
            (c) => spaceTrim((block) => `
                ### Comment by ${c.author?.login || 'ghost'} on ${new Date(c.createdAt).toLocaleString()}

                ${block(c.body)}
            `),
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

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
