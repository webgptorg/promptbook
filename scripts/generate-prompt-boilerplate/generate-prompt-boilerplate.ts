#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { generatePromptBoilerplate } from '../../src/cli/cli-commands/coder/generate-boilerplates';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: generate-prompt-boilerplate.ts
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
program.option('--count <count>', `Number of prompt boilerplate files to generate`, '5');
program.option('--template <template>', 'Prompt template alias or file path relative to the current project root');
program.parse(process.argv);

/**
 * Constant for { count: count option, template: template option }.
 */
const { count: countOption, template: templateOption } = program.opts<{
    readonly count: string;
    readonly template?: string;
}>();
/**
 * Constant for files count.
 */
const filesCount = parseFilesCount(countOption);
generatePromptBoilerplate({
    projectPath: process.cwd(),
    filesCount,
    templateOption,
})
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Parses and validates the count of boilerplate files to create.
 */
function parseFilesCount(countOption: string): number {
    const filesCount = Number(countOption);

    if (!Number.isFinite(filesCount) || filesCount <= 0) {
        console.info(colors.yellow(`Invalid --count '${countOption}'. Falling back to default 5.`));
        return 5;
    }

    return Math.floor(filesCount);
}
