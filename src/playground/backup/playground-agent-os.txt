#!/usr/bin/env ts-node

import { AgentOs } from '@rivet-dev/agent-os-core';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: playground.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
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
 * Handles playground.
 */
async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const vm = await AgentOs.create();

    // Create an agent session
    const { sessionId } = await vm.createSession('pi');

    // Stream events (tool calls, text output, etc.)
    vm.onSessionEvent(sessionId, (event) => console.log(event));

    // Send a prompt and wait for the response
    await vm.prompt(sessionId, 'Write a Python script that calculates pi');

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

// Note: [⚫] Code for playground [main playground](src/playground/playground.ts) should never be published in any package
