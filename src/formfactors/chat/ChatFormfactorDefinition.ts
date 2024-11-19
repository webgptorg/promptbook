import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const ChatFormfactorDefinition = {
    name: 'CHATBOT',
    aliasNames: ['CHAT'],
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    pipelineInterface: {
        inputParameterNames: ['previousTitle', 'previousConversationSummary', 'userMessage'],
        outputParameterNames: ['title', 'conversationSummary', 'chatbotResponse'],
    },
} as const satisfies AbstractFormfactorDefinition;
