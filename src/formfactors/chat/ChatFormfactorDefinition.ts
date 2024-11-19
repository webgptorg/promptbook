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
        /*
        <- TODO: !!!!!! Change to 

        -   INPUT PARAMETER `{previousTitle}` Previous title of the conversation
        -   INPUT PARAMETER `{previousConversationSummary}` Previous conversation summary
        -   INPUT PARAMETER `{userMessage}` User message
        -   OUTPUT PARAMETER `{title}` Title of the conversation
        -   OUTPUT PARAMETER `{conversationSummary}` Summary of the conversation
        -   OUTPUT PARAMETER `{chatbotResponse}` Chatbot response

        */
    },
} as const satisfies AbstractFormfactorDefinition;
