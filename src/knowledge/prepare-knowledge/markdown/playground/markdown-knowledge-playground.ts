#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { AnthropicClaudeExecutionTools } from '../../../../llm-providers/anthropic-claude/AnthropicClaudeExecutionTools';
import { joinLlmExecutionTools } from '../../../../llm-providers/multiple/joinLlmExecutionTools';
import { OpenAiExecutionTools } from '../../../../llm-providers/openai/OpenAiExecutionTools';
import { prepareKnowledgeFromMarkdown } from '../prepareKnowledgeFromMarkdown';

const isVerbose = true;

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
    console.info(`🧸  Prepare knowledge from Markdown (playground)`);

    // Do here stuff you want to test
    //========================================>

    const content = await readFile(
        join(__dirname, '../samples/10-simple.md' /* <- !!! Dynamic for all samples */),
        'utf-8',
    );

    // TODO: !!!!! getLlmExecutionToolsFromEnvironment and export via `@promptbook/all-llm-providers`
    const llmTools = joinLlmExecutionTools(
        new AnthropicClaudeExecutionTools({
            isVerbose,
            apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
        }),
        new OpenAiExecutionTools({
            isVerbose,
            apiKey: process.env.OPENAI_API_KEY!,
        }),
    );

    const knowledge = await prepareKnowledgeFromMarkdown({
        content,
        llmTools,
        isVerbose,
    });

    console.info(chalk.bgGreen(' Knowledge: '));
    console.info(knowledge);

    await writeFile(
        join(__dirname, '../samples/10-simple.knowledge.json' /* <- !!! Dynamic for all samples */),
        JSON.stringify(knowledge, null, 4) + '\n',
        'utf-8',
    );
    /**/

    //========================================/
}
