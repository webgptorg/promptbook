#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import { Anthropic } from '@anthropic-ai/sdk';

main();

console.log(process.env.ANTHROPIC_CLAUDE_API_KEY);

async function main() {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY,
    });

    const response = await anthropic.beta.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [
            {
                role: 'user',
                content: 'What tools do you have available?',
            },
        ],
        mcp_servers: [
            {
                type: 'url',
                url: 'https://example-server.modelcontextprotocol.io/sse',
                name: 'example-mcp',
                authorization_token: 'YOUR_TOKEN',
            },
        ],
        betas: ['mcp-client-2025-04-04'],
    });

    console.log(response);
}
