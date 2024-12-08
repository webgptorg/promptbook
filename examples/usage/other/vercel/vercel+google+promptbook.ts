#!/usr/bin/env -S deno run --allow-net --allow-env --allow-sys --allow-read

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { usageToHuman } from '@promptbook/core';
import type { Prompt } from '@promptbook/types';
import { createExecutionToolsFromVercelProvider } from '@promptbook/vercel';
import colors from 'colors';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const googleGeminiVercelProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

const googleGeminiPromptbookExecutionTools = createExecutionToolsFromVercelProvider(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    googleGeminiVercelProvider as any /* <- TODO: !!!!!! Remove any */,
);

/**/
const chatPrompt = {
    title: 'Promptbook speech',
    parameters: {},
    content: `Write a joke`,
    modelRequirements: {
        modelVariant: 'CHAT',
        systemMessage: 'You are an assistant who only speaks in rhymes.',
        temperature: 1.5,
    },
} as const satisfies Prompt;
const chatPromptResult = await googleGeminiPromptbookExecutionTools.callChatModel!(chatPrompt);
console.info({ chatPromptResult });
console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
console.info(colors.bgGreen(' Chat: ') + colors.green(chatPromptResult.content));
/**/
