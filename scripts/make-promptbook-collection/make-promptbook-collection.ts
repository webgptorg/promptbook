#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { collectionToJson } from '../../src/collection/collectionToJson';
import { createCollectionFromDirectory } from '../../src/collection/constructors/createCollectionFromDirectory';
import { MockedFackedLlmExecutionTools } from '../../src/llm-providers/mocked/MockedFackedLlmExecutionTools';
import { joinLlmExecutionTools } from '../../src/llm-providers/multiple/joinLlmExecutionTools';
import { commit } from '../utils/autocommit/commit';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Auto commit`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

makePipelineCollection({ isCommited })
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function makePipelineCollection({ isCommited }: { isCommited: boolean }) {
    console.info(`📖 Make Promptbook library`);

    const isVerbose = true; // <- TODO: [👒] Pass as CLI argument

    const promptbookSourceDir = 'promptbook-collection';

    // TODO: !!!! getLlmExecutionToolsFromEnvironment
    const llmTools = joinLlmExecutionTools(
        // TODO: !!!! Remove mocked and use getLlmExecutionToolsFromEnvironment
        new MockedFackedLlmExecutionTools({ isVerbose }),
        /*
            new AnthropicClaudeExecutionTools({
                isVerbose,
                apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
            }),
            new OpenAiExecutionTools({
                isVerbose,
                apiKey: process.env.OPENAI_API_KEY!,
            }),
            */
    );

    const collection = await createCollectionFromDirectory(promptbookSourceDir, {
      llmTools: null,
        llmTools,
        isVerbose,
        isRecursive: true,
    });

    const collectionJson = await collectionToJson(collection);
    const collectionJsonString = JSON.stringify(collectionJson);

    const collectionJsonFilePath = join(promptbookSourceDir, 'index.json');
    const collectionJsonFileContent = collectionJsonString + '\n';

    const libraryTypescriptFilePath = join(promptbookSourceDir, 'index.ts');
    const libraryTypescriptFileContent = 'export default ' + collectionJsonString + ';\n';

    // TODO: [🏳‍🌈] Finally take one of .json vs .ts (using .ts file (not .json) to avoid support of json files in bundle )
    await writeFile(collectionJsonFilePath, collectionJsonFileContent, 'utf-8');
    console.info(colors.green(`Maked ${collectionJsonFilePath}`));
    await writeFile(libraryTypescriptFilePath, libraryTypescriptFileContent, 'utf-8');
    console.info(colors.green(`Maked ${libraryTypescriptFilePath}`));

    if (isCommited) {
        await commit(promptbookSourceDir, `📖 Make Promptbook library`);
    }

    console.info(`[ Done 📖 Make Promptbook library ]`);
}

/**
 * TODO: [🌼] Maybe use `ptbk make` cli command instead of this script (but figure out what to do with nessesity to have library commited here)
 * TODO: !!! Use `ptbk make` cli command this in WebGPT and Promptbook
 */
