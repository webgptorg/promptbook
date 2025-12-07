#!/usr/bin/env ts-node

// Note: [❌] Turning off some global checks for playground file:
// spell-checker: disable
/* eslint-disable */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import OpenAI from 'openai';
import { chromium } from 'playwright';
import readlineSync from 'readline-sync';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- 🧠 Funkce, které AI může volat ---
async function searchWeb(query: string) {
    return [];
}

async function browsePage(url: string) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const text = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    await browser.close();
    return { url, text };
}

// --- 🗣️ Chat loop ---
async function main() {
    console.log('🤖 Ahoj! Jsem AI agent s oficiálním function calling API.\n');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: `Jsi český AI agent, který může používat následující nástroje:
      - search_web(query): pro vyhledávání aktuálních informací
      - browse_page(url): pro otevření webu a čtení obsahu.
      Odpovídej přirozeně a používej funkce jen, pokud je to nutné.`,
        },
    ];

    while (true) {
        const input = readlineSync.question('\nTy: ');
        if (input.toLowerCase() === 'exit') break;
        messages.push({ role: 'user', content: input });

        const response = await client.chat.completions.create({
            model: 'gpt-4.1', // potřebujeme model s podporou function calling
            messages,
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'search_web',
                        description: 'Vyhledá informace na webu podle dotazu',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'dotaz pro vyhledávač' },
                            },
                            required: ['query'],
                        },
                    },
                },
                {
                    type: 'function',
                    function: {
                        name: 'browse_page',
                        description: 'Otevře webovou stránku a přečte její text',
                        parameters: {
                            type: 'object',
                            properties: {
                                url: { type: 'string', description: 'adresa stránky' },
                            },
                            required: ['url'],
                        },
                    },
                },
            ],
        });

        const choice = response.choices[0];
        const message = choice!.message;

        // 🔧 Pokud AI volá funkci
        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const tool of message.tool_calls) {
                const fnName = tool.function.name;
                const args = JSON.parse(tool.function.arguments || '{}');

                console.log(`🛠️ AI volá funkci: ${fnName}`, args);

                let result;
                try {
                    if (fnName === 'search_web') result = await searchWeb(args.query);
                    else if (fnName === 'browse_page') result = await browsePage(args.url);
                } catch (err) {
                    result = { error: (err as Error).message };
                }

                // Pošleme výsledek funkce zpět do konverzace
                messages.push(message);
                messages.push({
                    role: 'tool',
                    tool_call_id: tool.id,
                    content: JSON.stringify(result),
                });

                const followUp = await client.chat.completions.create({
                    model: 'gpt-4.1',
                    messages,
                });

                const finalAnswer = followUp.choices[0]!.message?.content;
                if (finalAnswer) console.log(`🤖 AI: ${finalAnswer}`);
                messages.push({ role: 'assistant', content: finalAnswer || '' });
            }
        } else {
            const text = message.content;
            if (text) console.log(`🤖 AI: ${text}`);
            messages.push({ role: 'assistant', content: text || '' });
        }
    }

    console.log('\n👋 Konec konverzace.');
}

main();
