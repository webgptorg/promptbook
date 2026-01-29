#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import OpenAI from 'openai';
import { join } from 'path';

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

    const client = new OpenAI({
        baseURL: 'http://localhost:4440/api/openai/v1', //'http://localhost:4440/agents/jack-green/api/openai',
        apiKey: 'ptbk_6135a159114a40b99bdbf2d52db59e59',
    });

    const response = await client.chat.completions.create({
        model: 'agent:jack-green',
        messages: [{ role: 'user', content: 'Tell me more about you.' }],
    });

    console.log(response.choices[0]!.message.content);

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
