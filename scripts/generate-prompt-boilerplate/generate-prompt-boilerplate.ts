#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import {
    BOILERPLATE_COUNT_OPTION_DESCRIPTION,
    DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE,
    parseBoilerplateCount,
} from '../../src/cli/cli-commands/coder/boilerplateCount';
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
program.option('--count <count>', BOILERPLATE_COUNT_OPTION_DESCRIPTION, DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE);
program.option('--template <template>', 'Prompt template alias or file path relative to the current project root');
program.parse(process.argv);

/**
 * Constant for { count: count option, template: template option }.
 */
const { count: countOption, template: templateOption } = program.opts<{
    readonly count: string;
    readonly template?: string;
}>();
// Note: Resolving the `--count` option inside the promise chain so that its validation error is reported the same way as any other failure
Promise.resolve()
    .then(() =>
        generatePromptBoilerplate({
            projectPath: process.cwd(),
            boilerplateCount: parseBoilerplateCount(countOption),
            templateOption,
        }),
    )
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });
