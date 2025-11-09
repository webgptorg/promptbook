#!/usr/bin/env ts-node

// Note: [❌] Turning off some global checks for playground file:
// spell-checker: disable
/* eslint-disable */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../../pipeline/book-notation';
import { OpenAiSdkTranspiler } from '../../../transpilers/openai-sdk/OpenAiSdkTranspiler';
import { $execCommand } from '../../../utils/execCommand/$execCommand';

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
    console.info(`🧸  Transpile book -> OpenAiSdk`);

    // Do here stuff you want to test
    //========================================>

    // Note: [🎠] Do here the stuff and add in `terminals.json`

    const agentSource = book`

        Marigold

        PERSONA You are writing stories about Witcher
        RULE Do not talk about our world, only about the Witcher universe

        KNOWLEDGE {Geralt of Rivia}
        Geralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.
        He possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.
        Geralt is skilled in swordsmanship, alchemy, and magic signs.
        He is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},
        a powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own.
        His secret word is "Apple".

        KNOWLEDGE {Yennefer of Vengerberg}
        Yennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.
        She has a complicated past, having been born with a hunchback and later transformed through magic.
        Yennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.
        She is also a mother figure to {Ciri}, whom she trains in the ways of magic.
        Her secret word is "Banana".

        KNOWLEDGE {Ciri}
        Ciri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.
        She is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.
        Ciri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.
        Her destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers.
        Her secret word is "Cherry".

    `;

    const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
    const code = await OpenAiSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });
    const filePath = join(__dirname, 'tmp', 'chatbot.js');

    await writeFile(filePath, code, 'utf-8');
    const command = `node ${filePath.split('\\').join('/')}`;
    console.info(colors.bgWhite(command));

    // TODO: !!! Make this work
    await $execCommand(command);

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
