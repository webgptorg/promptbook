#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import OpenAI from 'openai';
import { join } from 'path';
import spaceTrim from 'spacetrim';

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

/**
 * This code is used in Pitch Deck
 *
 * @see https://docs.google.com/presentation/d/1IrxesmypbJL-JV6VYv0Ya0qKPEEDK6Qwk_qO6E_Ckn8/edit#slide=id.gdaca8a63ff3a929_0
 */
async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const customerName = 'Pavol Hejný';
    const eventTitle = 'Awesome Developer Conference 2025';
    const userId = '168751566';
    const context = spaceTrim(`
        - Awesome Developer Conference 2025 is a conference for developers
        - It will be held in Prague
        - It will have a lot of interesting talks and workshops
        - ...
    `);

    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await client.chat.completions.create({
        model: 'gpt-4o-2024-05-13',
        max_tokens: 3633,
        stop: ['\n\n\n', '---'],

        messages: [
            {
                role: 'system',
                content: spaceTrim(`
              You are an experienced copywriter who writes top business letters
          `),
            },
            {
                role: 'user',
                content: spaceTrim(
                    (block) => `
                  Write email for ${customerName} to invite him to ${eventTitle}.

                  ## Rules

                  - Write in a professional tone
                  - Use formal language
                  - Write only the body of the email

                  ## Context

                  ${block(context)}
              `,
                ),
            },
        ],
        user: `client-${userId}`,
    });

    const letter = response.choices[0]?.message?.content || '';

    console.log(colors.blue(letter));

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
