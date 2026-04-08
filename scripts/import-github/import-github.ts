#!/usr/bin/env ts-node
// import-github.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../src/errors/assertsError';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { prettify } from '../utils/prettify';
import { fetchGitHubDiscussions } from './fetchGitHubDiscussions';
import { fetchGitHubIssues } from './fetchGitHubIssues';
import { formatGitHubDiscussion } from './formatGitHubDiscussion';
import { formatGitHubIssue } from './formatGitHubIssue';
import { slugify } from './slugify';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: import-github.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

/**
 * Constant for program.
 */
const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

/**
 * Constant for { commit: is commited }.
 */
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

/**
 * Imports git hub.
 */
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
        const content = formatGitHubIssue(issue);
        const fileName = `${issue.number}-${slugify(issue.title)}.md`;
        const dir = join('documents/github/issues');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, fileName), await prettify(content, 'markdown'), 'utf-8');
    }

    console.info(colors.cyan(`Saving ${discussions.length} discussions...`));
    for (const discussion of discussions) {
        const content = formatGitHubDiscussion(discussion);
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
