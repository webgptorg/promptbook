#!/usr/bin/env -S deno run --allow-net --allow-env --allow-sys --allow-read

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { usageToHuman } from '@promptbook/core';
import type { Prompt } from '@promptbook/types';
import { createExecutionToolsFromVercelProvider } from '@promptbook/vercel';
import colors from 'colors';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const googleGeminiVercelProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const googleGeminiPromptbookExecutionTools = createExecutionToolsFromVercelProvider({
    title: 'Google',
    vercelProvider: googleGeminiVercelProvider,
    availableModels: [],
    additionalChatSettings: {
        // ...
    },
});

/**/
const chatPrompt = {
    title: 'Joke',
    parameters: {},
    content: `Write a joke`,
    modelRequirements: {
        modelVariant: 'CHAT',
        modelName: 'gemini-1.5-flash',
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
