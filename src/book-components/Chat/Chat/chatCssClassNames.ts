/**
 * Stable global CSS class names exposed by chat components for host-level styling.
 *
 * These names are intentionally centralized so both rendering code and
 * host-application tooling (for example Agents Server custom CSS editor) can stay DRY.
 *
 * @private Internal chat styling contract for Promptbook-host applications.
 */
export const chatCssClassNames = {
    chat: 'agent-chat',
    chatMainFlow: 'agent-chat-main-flow',
    chatMessages: 'chat-messages',
    chatMessage: 'chat-message',
    userMessage: 'user-message',
    agentResponse: 'agent-response',
    messageStack: 'chat-message-stack',
    messageContent: 'chat-message-content',
    messageAvatar: 'chat-message-avatar',
    userAvatar: 'user-avatar',
    agentAvatar: 'agent-avatar',
    chatInput: 'chat-input',
} as const;

/**
 * Human-readable descriptions for globally available chat CSS hooks.
 *
 * @private Internal chat styling contract for Promptbook-host applications.
 */
export const chatCssClassDescriptions: Record<keyof typeof chatCssClassNames, string> = {
    chat: 'Top-level chat wrapper.',
    chatMainFlow: 'Main layout grid that contains actions, messages, and input.',
    chatMessages: 'Scrollable message list container.',
    chatMessage: 'Single message row (applies to both user and agent).',
    userMessage: 'Message row sent by the user.',
    agentResponse: 'Message row sent by the agent.',
    messageStack: 'Message stack containing label, bubble, and metadata.',
    messageContent: 'Message bubble/content container.',
    messageAvatar: 'Avatar wrapper for each message author.',
    userAvatar: 'Avatar wrapper when author is user.',
    agentAvatar: 'Avatar wrapper when author is agent.',
    chatInput: 'Input/composer container at the bottom of the chat.',
};

/**
 * Resolves legacy global chat classes that already existed in rendered markup.
 *
 * @param suffix - Legacy chat class suffix.
 * @returns Legacy global class name prefixed with `chat-`.
 * @private Internal helper for backward-compatible chat selectors.
 */
export function getChatCssClassName(suffix: string): string {
    return `chat-${suffix}`;
}
