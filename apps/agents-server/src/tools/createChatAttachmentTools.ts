import type { LlmToolDefinition } from '../../../../src/types/LlmToolDefinition';
import type { ChatAttachment } from '../../../../src/utils/chat/chatAttachments';
import { ChatAttachmentToolNames } from './ChatAttachmentToolNames';

/**
 * Adds runtime attachment-inspection tools when the current chat request includes uploaded files.
 */
export function createChatAttachmentTools(
    existingTools: ReadonlyArray<LlmToolDefinition> = [],
    attachments: ReadonlyArray<ChatAttachment> = [],
): Array<LlmToolDefinition> {
    if (attachments.length === 0) {
        return [...existingTools];
    }

    const tools = [...existingTools];

    if (!tools.some((tool) => tool.name === ChatAttachmentToolNames.read)) {
        tools.push({
            name: ChatAttachmentToolNames.read,
            description:
                'Read a byte-range chunk from one file attached in the current chat turn. Use this when the inline attachment preview is truncated or when you need content later in the file.',
            parameters: {
                type: 'object',
                properties: {
                    attachment: {
                        type: 'string',
                        description: 'Exact attachment name or exact attachment URL shown in the chat context.',
                    },
                    startByte: {
                        type: 'integer',
                        description: 'Optional first byte offset (0-based). Defaults to the beginning of the file.',
                    },
                    endByte: {
                        type: 'integer',
                        description: 'Optional last byte offset (0-based, inclusive). Defaults to a small readable chunk.',
                    },
                    forceText: {
                        type: 'boolean',
                        description: 'Force best-effort text decoding even when the chunk looks binary.',
                    },
                },
                required: ['attachment'],
            },
        });
    }

    if (!tools.some((tool) => tool.name === ChatAttachmentToolNames.search)) {
        tools.push({
            name: ChatAttachmentToolNames.search,
            description:
                'Run a regular-expression search inside one attached file or byte window, returning compact match snippets so you can decide which chunk to read next.',
            parameters: {
                type: 'object',
                properties: {
                    attachment: {
                        type: 'string',
                        description: 'Exact attachment name or exact attachment URL shown in the chat context.',
                    },
                    pattern: {
                        type: 'string',
                        description: 'JavaScript regular-expression pattern to search for.',
                    },
                    flags: {
                        type: 'string',
                        description: 'Optional JavaScript regex flags such as `i` or `m`. Global matching is always enabled.',
                    },
                    startByte: {
                        type: 'integer',
                        description: 'Optional first byte offset (0-based) of the searched window.',
                    },
                    endByte: {
                        type: 'integer',
                        description: 'Optional last byte offset (0-based, inclusive) of the searched window.',
                    },
                    maxMatches: {
                        type: 'integer',
                        description: 'Optional maximum number of matches to return.',
                    },
                    contextCharacters: {
                        type: 'integer',
                        description: 'Optional number of surrounding characters returned around each match.',
                    },
                    forceText: {
                        type: 'boolean',
                        description: 'Force best-effort text decoding even when the searched chunk looks binary.',
                    },
                },
                required: ['attachment', 'pattern'],
            },
        });
    }

    return tools;
}
