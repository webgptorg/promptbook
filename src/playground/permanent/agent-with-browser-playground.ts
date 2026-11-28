#!/usr/bin/env ts-node

// Note: [❌] Turning off some global checks for playground file:
// spell-checker: disable
/* eslint-disable */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// TODO: import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import colors from 'colors';
import { join } from 'path';
import { chromium } from 'playwright';
import { spaceTrim } from 'spacetrim';
import { locateChrome } from '../../executables/browsers/locateChrome';
import type { TODO_any } from '../../utils/organization/TODO_any';

if (process.cwd() !== join(__dirname, '../../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: agent-with-browser-playground.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../../..')}
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
    console.info(`🧸  Agents Playground`);

    // Do here stuff you want to test
    //========================================>

    const browser = await chromium.launch({ headless: false, executablePath: (await locateChrome()) || undefined });
    const context = await browser.newContext();
    const page = await context.newPage();

    /*
    // 1. Go to LinkedIn login page
    await page.goto('https://www.linkedin.com/login');

    // 2. Log in
    await page.fill('input[name="session_key"]', process.env.LINKEDIN_EMAIL);
    await page.fill('input[name="session_password"]', process.env.LINKEDIN_PASSWORD);
    await page.click('button[type="submit"]');
    */

    // 3. Wait for feed to load
    await page.waitForURL('**/feed');
    await page.waitForSelector('div.feed-shared-update-v2', { timeout: 10000 });

    // 4. Scroll to load more posts
    for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(2000);
    }

    // 5. Extract posts text
    const posts = await page.$$eval('div.feed-shared-update-v2', (elements) =>
        elements.slice(0, 5).map((el) => {
            const textEl = el.querySelector('.feed-shared-update-v2__description, span.break-words');
            return textEl ? (textEl as TODO_any).innerText.trim() : '(no text)';
        }),
    );

    console.log('📰 Latest posts:');
    posts.forEach((p, i) => console.log(`\nPost #${i + 1}:\n${p}\n`));

    await browser.close();
    //========================================/
}

// Note: [⚫] Code for permanent playground [agent-with-browser-playground](src/playground/permanent/agent-with-browser-playground.ts) should never be published in any package
