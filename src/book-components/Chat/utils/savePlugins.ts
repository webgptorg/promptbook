// Extensible save format plugins for Chat history

import type { ChatMessage } from '../types/ChatMessage';

export type ChatSaveFormat = 'json' | 'txt' | 'md' | 'html';

export type ChatSavePlugin = {
    format: ChatSaveFormat;
    label: string;
    getContent: (messages: ChatMessage[]) => string;
    mimeType: string;
    fileExtension: string;
};

// JSON plugin: full metadata
export const jsonSavePlugin: ChatSavePlugin = {
    format: 'json',
    label: 'JSON (full)',
    getContent: (messages) => JSON.stringify(messages, null, 2),
    mimeType: 'application/json',
    fileExtension: 'json',
};

// Plain text plugin: just messages
export const txtSavePlugin: ChatSavePlugin = {
    format: 'txt',
    label: 'Plain Text',
    getContent: (messages) => messages.map(m => m.content).join('\n\n---\n\n'),
    mimeType: 'text/plain',
    fileExtension: 'txt',
};

// Markdown plugin: formatted messages
export const mdSavePlugin: ChatSavePlugin = {
    format: 'md',
    label: 'Markdown',
    getContent: (messages) =>
        messages.map(m => `**${m.from}:**\n\n${m.content}\n`).join('\n---\n'),
    mimeType: 'text/markdown',
    fileExtension: 'md',
};

// HTML plugin: formatted messages
export const htmlSavePlugin: ChatSavePlugin = {
    format: 'html',
    label: 'HTML',
    getContent: (messages) =>
        `<html><body>${messages.map(m => `<strong>${m.from}:</strong><br>${m.content}<hr>`).join('')}</body></html>`,
    mimeType: 'text/html',
    fileExtension: 'html',
};

// All plugins registry
export const chatSavePlugins: ChatSavePlugin[] = [
    jsonSavePlugin,
    txtSavePlugin,
    mdSavePlugin,
    htmlSavePlugin,
];

// Utility to get plugins by format
export function getChatSavePlugins(formats?: ChatSaveFormat[]): ChatSavePlugin[] {
    if (!formats) return chatSavePlugins;
    return chatSavePlugins.filter(plugin => formats.includes(plugin.format));
}
