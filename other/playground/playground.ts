#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { join } from 'path';
import { OpenAiExecutionTools } from '../../src/execution/plugins/llm-execution-tools/openai/OpenAiExecutionTools';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(chalk.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(chalk.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const openAiExecutionTools = new OpenAiExecutionTools({
        // TODO: [♐] Pick just the best model of required variant
        isVerbose: true,
        apiKey: process.env.OPENAI_API_KEY,
    });

    const models = await openAiExecutionTools.listModels();

    console.info({ models });

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}
