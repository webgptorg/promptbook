import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const ChatbotFormfactorDefinition = {
    name: 'CHATBOT',
    aliasNames: ['CHAT'],
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/174`,
    pipelineInterface: {
        inputParameters: [
            {
                name: 'previousTitle',
                description: `Previous title of the conversation`,
                isInput: true,
                isOutput: false,
            },
            {
                name: 'previousConversationSummary',
                description: `Previous conversation summary`,
                isInput: true,
                isOutput: false,
            },
            { name: 'userMessage', description: `User message`, isInput: true, isOutput: false },
        ],
        outputParameters: [
            { name: 'title', description: `Title of the conversation`, isInput: false, isOutput: true },
            { name: 'conversationSummary', description: `Summary of the conversation`, isInput: false, isOutput: true },
            { name: 'chatbotResponse', description: `Chatbot response`, isInput: false, isOutput: true },
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
