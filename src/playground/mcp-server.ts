#!/usr/bin/env ts-node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';
import { CallToolRequestSchema, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer } from 'ws';

// Vytvoření MCP serveru
const server = new Server(
    {
        name: 'dice-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {
                rollDice: {
                    description: 'Hod kostkou (náhodné číslo od 1 do 6).',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
            },
        },
    },
);

// Obsluha požadavku rollDice
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'rollDice') {
        const result = Math.floor(Math.random() * 6) + 1;

        const response: CallToolResult = {
            content: [
                {
                    type: 'text',
                    text: `🎲 Padlo číslo: ${result}`,
                },
            ],
        };

        return response;
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
});

/*
// Note: Run via stdio
const transport = new StdioServerTransport();
server.connect(transport);
*/

// Note: Run via WebSocket
const PORT = 4023;
const wss = new WebSocketServer({ port: PORT });
const transport = new WebSocketServerTransport(wss);

server.connect(transport);

console.log(`MCP Dice server listening on ws://localhost:${PORT}`);
