import {
    chatCssClassDescriptions,
    chatCssClassNames,
} from '../../../../src/book-components/Chat/Chat/chatCssClassNames';

/**
 * Upper bound for persisted custom CSS length.
 */
export const MAX_CUSTOM_STYLESHEET_LENGTH = 100_000;

/**
 * One class-name reference exposed in the custom stylesheet admin UI.
 */
export type CustomStylesheetClassEntry = {
    /**
     * CSS selector without the leading dot.
     */
    readonly className: string;
    /**
     * Human-friendly description of where the selector is applied.
     */
    readonly description: string;
};

/**
 * Stable Agents Server chat-shell selectors that can be safely targeted from custom CSS.
 */
const agentChatShellClassEntries: ReadonlyArray<CustomStylesheetClassEntry> = [
    {
        className: 'agent-chat-default-shell',
        description: 'Default full-page chat shell on `/agents/[agentName]/chat`.',
    },
    {
        className: 'agent-chat-default-sidebar',
        description: 'Default chat history sidebar wrapper.',
    },
    {
        className: 'agent-chat-default-sidebar__chat-row',
        description: 'One expanded chat-history row inside the default sidebar.',
    },
    {
        className: 'agent-chat-panel--default',
        description: 'Default floating chat panel wrapper used by the main chat route.',
    },
    {
        className: 'agent-chat-panel__chat--default',
        description: 'Default chat surface element that wraps the rendered transcript and composer.',
    },
];

/**
 * Shared list of stable chat selectors administrators can target from custom CSS.
 */
export const customStylesheetClassEntries: ReadonlyArray<CustomStylesheetClassEntry> = [
    ...Object.entries(chatCssClassNames).map(([key, className]) => ({
        className,
        description: chatCssClassDescriptions[key as keyof typeof chatCssClassDescriptions],
    })),
    ...agentChatShellClassEntries,
];

/**
 * Builds the default CSS prefill used by `/admin/custom-css`.
 *
 * The template intentionally references shared class-name constants to keep
 * selector strings sourced from one place (DRY).
 */
export function createDefaultCustomStylesheetCss(): string {
    return [
        '/* Custom CSS for Promptbook Agents Server */',
        '/* This stylesheet is loaded on every page. */',
        '',
        '/* Chat message defaults */',
        `.${chatCssClassNames.agentResponse} .${chatCssClassNames.messageContent} {`,
        '    /* border-left: 3px solid rgba(56, 189, 248, 0.7); */',
        '}',
        '',
        `.${chatCssClassNames.userMessage} .${chatCssClassNames.messageContent} {`,
        '    /* border-right: 3px solid rgba(59, 130, 246, 0.7); */',
        '}',
        '',
        '/* Improve long text readability */',
        `.${chatCssClassNames.messageContent} {`,
        '    /* line-height: 1.6; */    ',
        '}',
        '',
        '/* Example avatar style override */',
        `.${chatCssClassNames.agentAvatar},`,
        `.${chatCssClassNames.userAvatar} {`,
        '    /* box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18); */',
        '}',
        '',
        '/* Add your custom rules below */',
        '',
    ].join('\n');
}
