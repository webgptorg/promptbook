#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import chalk from 'colors';
import { openai } from 'openai-sdk';
import { join } from 'path';

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

    async function generateLetter(customerName: string, eventName: string, context: string): Promise<string> {
        const prompt = `Expect 20 words
    Expect MAX 3000 characters
    Expect 10 lines
    Person Jane, an experienced copywriter who writes top business letters

    Write letter for ${customerName} to invite him to ${eventName}.

    Info about event: ${context}

    ->`;

        const response = await openai.complete(prompt, {
            max_tokens: 3000,
            temperature: 0.7,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            stop: '\n',
            n: 1,
            log_level: 'info',
        });

        const letterContent = response.choices[0].text.trim();
        return letterContent;
    }

    // Example usage
    const customerName = 'John Doe';
    const eventName = 'Business Conference';
    const context =
        'The Business Conference is a premier event for industry professionals to network and learn about the latest trends in the business world.';

    const letter = await generateLetter(customerName, eventName, context);
    console.log(letter);

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}
