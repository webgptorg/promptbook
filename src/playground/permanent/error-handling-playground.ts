#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { compilePipeline } from '../../conversion/compilePipeline';
import { CallbackInterfaceTools } from '../../dialogs/callback/CallbackInterfaceTools';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { PipelineString } from '../../pipeline/PipelineString';

if (process.cwd() !== join(__dirname, '../../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Error handling Playground`);

    // Do here stuff you want to test
    //========================================>

    const pipelineExecutor = await getPipelineExecutor();
    const result = await pipelineExecutor({}).asPromise({ isCrashedOnError: false });

    console.info('result', result);

    async function getPipelineExecutor() {
        const pipeline = await compilePipeline(
            spaceTrim(`
                # Example prompt

                Show how to use a simple chat prompt

                -   PROMPTBOOK VERSION 1.0.0
                -   PIPELINE URL https://promptbook.studio/examples/pipeline.book
                -   MODEL VARIANT Chat
                -   MODEL NAME gpt-3.5-turbo
                -   INPUT  PARAMETER {thing} Any thing to buy
                -   OUTPUT PARAMETER {response}

                ## Prompt

                \`\`\`
                One day I went to the shop and bought {thing}.
                Now I have {thing}.
                \`\`\`

                -> {response}
          `) as PipelineString,
            // <- TODO: [📼] Use`book\`` string literal notation
        );
        const pipelineExecutor = createPipelineExecutor({
            pipeline,
            tools: {
                llm: new MockedEchoLlmExecutionTools({ isVerbose: true }),
                script: [],
                userInterface: new CallbackInterfaceTools({
                    isVerbose: true,
                    async callback() {
                        return 'Hello';
                    },
                }),
            },
        });
        return pipelineExecutor;
    }

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
