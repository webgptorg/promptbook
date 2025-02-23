#!/usr/bin/env ts-node
// generate-documentation.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { COMMANDS } from '../../src/commands/index';
import { FORMFACTOR_DEFINITIONS } from '../../src/formfactors/index';
import { NonTaskSectionTypes, SectionTypes } from '../../src/types/SectionType';
import { TaskTypes } from '../../src/types/TaskType';
import { TODO_USE } from '../../src/utils/organization/TODO_USE';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

generateDocumentation({ isCommited })
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generateDocumentation({ isCommited }: { isCommited: boolean }) {
    console.info(`📚  Generating documentation`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    // ==============================

    TODO_USE(COMMANDS);
    TODO_USE(FORMFACTOR_DEFINITIONS);
    TODO_USE(SectionTypes);
    TODO_USE(NonTaskSectionTypes);
    TODO_USE(TaskTypes);

    const indexContent = spaceTrim(
        (block) => `
            #  Documentation

            ## Commands

            ${block(COMMANDS.map(({ name, documentationUrl }) => `- [${name}](${documentationUrl})`).join('\n'))}

        `,
    );

    await writeFile('documents/README.md', indexContent, 'utf-8');

    const githubDiscussions = await fetchGitHubDiscussions();

    console.log('GitHub Discussions:', { githubDiscussions });

    for (const command of COMMANDS) {
        const { name, documentationUrl } = command;

        console.log('Command:', { name, documentationUrl });

        const githubDiscussion = githubDiscussions.find((discussion) => discussion.url === documentationUrl);

        if (githubDiscussion === undefined) {
            console.error(`❌ Discussion not found for ${name}`);
            continue;
        }

        await writeFile(`documents/commands/${name}.md`, githubDiscussion.body, 'utf-8');
        // <- TODO: !!!!!! Add generator warnings
    }

    // ==============================
    // 9️⃣ Commit the changes

    if (isCommited) {
        await commit(['documents'], `📚 Generating documentation`);
    }
}

interface GitHubDiscussion {
    id: string;
    title: string;
    body: string;
    answer?: {
        body: string;
    } | null;
    url: string;
    updatedAt: string;
}

async function fetchGitHubDiscussions(): Promise<GitHubDiscussion[]> {
    // TODO: !!!!!! Paginate through all discussions
    const query = `
        query {
            repository(owner: "webgptorg", name: "promptbook") {
                discussions(first: 100) {
                    nodes {
                        id
                        title
                        body
                        answer {
                            body
                        }
                        url
                        updatedAt
                    }
                }
            }
        }
    `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });

    const data = await response.json();

    console.log('GitHub Discussions:', { data });

    if (typeof data.data === 'undefined') {
        throw new Error(
            spaceTrim(
                (block) => `
                  Failed to fetch GitHub Discussions

                  ${block(data.message || 'No message provided')}

          `,
            ),
        );
    }
    return data.data.repository.discussions.nodes;
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
