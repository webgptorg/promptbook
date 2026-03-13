import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../../../../src/commitments/_common/toolRuntimeContext';
import { ChatAttachmentToolNames } from './ChatAttachmentToolNames';
import { createChatAttachmentToolFunctions } from './createChatAttachmentToolFunctions';
import { createChatAttachmentTools } from './createChatAttachmentTools';

describe('chat attachment tools', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('registers runtime attachment tools only when attachments exist', () => {
        expect(createChatAttachmentTools([], [])).toEqual([]);

        const tools = createChatAttachmentTools(
            [],
            [
                {
                    name: 'captions.sbv',
                    type: 'text/plain',
                    url: 'https://cdn.example.com/files/captions.sbv',
                },
            ],
        );

        expect(tools.map((tool) => tool.name)).toEqual([
            ChatAttachmentToolNames.read,
            ChatAttachmentToolNames.search,
        ]);
    });

    it('reads an attached file chunk by byte range', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('CDEF', {
                status: 206,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'content-range': 'bytes 2-5/10',
                },
            }),
        );
        const tools = createChatAttachmentToolFunctions();

        const resultRaw = await tools[ChatAttachmentToolNames.read]!({
            attachment: 'captions.sbv',
            startByte: 2,
            endByte: 5,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                chat: {
                    attachments: [
                        {
                            name: 'captions.sbv',
                            type: 'text/plain',
                            url: 'https://cdn.example.com/files/captions.sbv',
                        },
                    ],
                },
            }),
        });
        const result = JSON.parse(resultRaw) as {
            content: string;
            startByte: number;
            endByte: number;
            totalBytes: number;
            encodingUsed: string;
        };

        expect(fetchSpy).toHaveBeenCalledWith(
            'https://cdn.example.com/files/captions.sbv',
            expect.objectContaining({
                headers: {
                    Range: 'bytes=2-5',
                },
            }),
        );
        expect(result.content).toBe('CDEF');
        expect(result.startByte).toBe(2);
        expect(result.endByte).toBe(5);
        expect(result.totalBytes).toBe(10);
        expect(result.encodingUsed).toBe('utf-8');
    });

    it('searches inside one attached file window and returns snippets', async () => {
        jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('hello world and another world', {
                status: 206,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'content-range': 'bytes 0-28/29',
                },
            }),
        );
        const tools = createChatAttachmentToolFunctions();

        const resultRaw = await tools[ChatAttachmentToolNames.search]!({
            attachment: 'https://cdn.example.com/files/captions.sbv',
            pattern: 'world',
            flags: 'i',
            maxMatches: 2,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                chat: {
                    attachments: [
                        {
                            name: 'captions.sbv',
                            type: 'text/plain',
                            url: 'https://cdn.example.com/files/captions.sbv',
                        },
                    ],
                },
            }),
        });
        const result = JSON.parse(resultRaw) as {
            returnedMatchCount: number;
            matches: Array<{ match: string; snippet: string }>;
        };

        expect(result.returnedMatchCount).toBe(2);
        expect(result.matches[0]?.match).toBe('world');
        expect(result.matches[0]?.snippet).toContain('hello world');
        expect(result.matches[1]?.snippet).toContain('another world');
    });
});
