#!/usr/bin/env ts-node

import chalk from 'chalk';
import commander from 'commander';
import { createBestTranslator } from './automatic-translators/createBestTranslator';
import { translateMessages } from './translateMessages';

// TODO: This should be some prototype of the generator
// TODO: Activate TypeScript 3.8 and use top level await instead of wrapped code by main function

main();

async function main() {
    console.info(chalk.bgGrey(`🏭🌐 Automatic translation`));

    const program = new commander.Command();
    program.option('--from <language>', `From what language to translate`);
    program.option('--to <language>', `To what language to translate`);
    program.option('--messages', `Translate messages`);

    program.parse(process.argv);
    const { from, to, messages } = program.opts();

    const automaticTranslator = createBestTranslator({ from, to });

    if (messages) {
        await translateMessages({ automaticTranslator, from, to });
    }
}
