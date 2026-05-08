import { describe, expect, it } from '@jest/globals';
import { KNOWLEDGE_SEARCH_TOOL_NAME } from '../../../../../src/commitments/KNOWLEDGE/KNOWLEDGE';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import {
    applyKnowledgeSourcesToChatMessage,
    extractKnowledgeCitationsFromToolCalls,
    extractKnowledgeSourcesFromToolCalls,
} from './extractKnowledgeSourcesFromToolCalls';

describe('extractKnowledgeSourcesFromToolCalls', () => {
    it('extracts unique sources from completed knowledge search tool calls', () => {
        const toolCalls: ToolCall[] = [
            {
                name: KNOWLEDGE_SEARCH_TOOL_NAME,
                result: {
                    status: 'ready',
                    query: 'refund policy',
                    indexHash: 'hash-1',
                    results: [
                        {
                            id: '0:0',
                            source: 'Handbook',
                            url: 'https://example.com/handbook.pdf',
                            excerpt: 'Refunds are available within 30 days.',
                            citation: '[0:0]',
                            score: 0.91,
                        },
                        {
                            id: '0:0',
                            source: 'Handbook',
                            url: 'https://example.com/handbook.pdf',
                            excerpt: 'Refunds are available within 30 days.',
                            citation: '[0:0]',
                            score: 0.91,
                        },
                    ],
                },
            },
            {
                name: 'web_search',
                result: 'ignored',
            },
        ];

        expect(extractKnowledgeSourcesFromToolCalls(toolCalls)).toEqual([
            {
                id: '0:0',
                source: 'Handbook',
                url: 'https://example.com/handbook.pdf',
                excerpt: 'Refunds are available within 30 days.',
                score: 0.91,
            },
        ]);
        expect(extractKnowledgeCitationsFromToolCalls(toolCalls)).toEqual([
            {
                id: '0:0',
                source: 'Handbook',
                url: 'https://example.com/handbook.pdf',
                excerpt: 'Refunds are available within 30 days.',
            },
        ]);
    });

    it('applies structured sources and legacy citations to a chat message', () => {
        const message: ChatMessage = {
            sender: 'MODEL',
            content: 'Use the refund policy [0:0].',
        };
        const toolCalls: ToolCall[] = [
            {
                name: KNOWLEDGE_SEARCH_TOOL_NAME,
                result: JSON.stringify({
                    status: 'ready',
                    query: 'refund policy',
                    indexHash: 'hash-1',
                    results: [
                        {
                            id: '0:0',
                            source: 'Handbook',
                            url: 'https://example.com/handbook.pdf',
                            excerpt: 'Refunds are available within 30 days.',
                            citation: '[0:0]',
                        },
                    ],
                }),
            },
        ];

        expect(applyKnowledgeSourcesToChatMessage(message, toolCalls)).toMatchObject({
            sources: [
                {
                    id: '0:0',
                    source: 'Handbook',
                    url: 'https://example.com/handbook.pdf',
                    excerpt: 'Refunds are available within 30 days.',
                },
            ],
            citations: [
                {
                    id: '0:0',
                    source: 'Handbook',
                    url: 'https://example.com/handbook.pdf',
                    excerpt: 'Refunds are available within 30 days.',
                },
            ],
        });
    });
});
