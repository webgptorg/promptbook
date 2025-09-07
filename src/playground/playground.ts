#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import glob from 'glob-promise';
import { join } from 'path';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../scrapers/_common/utils/makeKnowledgeSourceHandler';
import { DocumentScraper } from '../scrapers/document/DocumentScraper';

if (process.cwd() !== join(__dirname, '../..')) {
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
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const dictionary = `C:/Users/me/Documents/p13`;
    const documentFiles = await glob(`${dictionary}/**/*.docx`);

    const fs = $provideFilesystemForNode();
    const executables = await $provideExecutablesForNode();

    const documentScraper = new DocumentScraper(
        {
            fs,
            executables,
        },
        {
            isVerbose: true,
        },
    );

    for (const documentFile of documentFiles) {
        const sourceHandler = await makeKnowledgeSourceHandler(
            { knowledgeSourceContent: documentFile },
            { fs },
            { rootDirname: process.cwd(), isVerbose: true },
        );

        console.info('documentFile', documentFile);
        console.info('sourceHandler', sourceHandler);

        const converted = await documentScraper.$convert(sourceHandler);
        console.info(colors.green(`📄  ${converted.filename}`));
    }

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
