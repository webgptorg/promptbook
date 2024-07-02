#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AnthropicClaudeExecutionTools } from '../../../../llm-providers/anthropic-claude/AnthropicClaudeExecutionTools';
import { prepareKnowledgeFromMarkdown } from '../prepareKnowledgeFromMarkdown';

prepareKnowledgeFromMarkdown;
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

    const content = await readFile(join(__dirname, '../samples/10-simple.md'), 'utf-8');

    const llmTools = new AnthropicClaudeExecutionTools({
        isVerbose: true,
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
    });

    const knowledge = await prepareKnowledgeFromMarkdown({
        content,
        llmTools,
    });

    console.info(chalk.bgGreen(' Knowledge: '));
    console.info(knowledge);
    /**/

    //========================================/
}
