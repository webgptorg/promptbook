import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import type { SyncHighLevelAbstraction } from '../_common/HighLevelAbstraction';

/**
 * Allow to define chatbot with no need to write full interface
 *
 * @private
 */
export const QuickChatbotHla = {
    type: 'SYNC',
    $applyToPipelineJson($pipelineJson: $PipelineJson): void {
        if ($pipelineJson.tasks.length !== 0) {
            // Note: When there are already tasks, do nothing
            return;
        }

        if ($pipelineJson.parameters.length !== 0) {
            // Note: When there are already parameters, do nothing
            return;
        }

        if ($pipelineJson.personas.length === 0) {
            // Note: When no personas defined, do nothing
            return;
        }

        const personaName = $pipelineJson.personas[0]!.name;

        $pipelineJson.formfactorName = 'CHATBOT';

        $pipelineJson.parameters.push(
            {
                name: 'previousTitle',
                description: 'Previous title of the conversation',
                isInput: true,
                isOutput: false,
            },
            {
                name: 'previousConversationSummary',
                description: 'Previous conversation summary',
                isInput: true,
                isOutput: false,
            },
            {
                name: 'userMessage',
                description: 'User message',
                isInput: true,
                isOutput: false,
            },
            {
                name: 'title',
                description: 'Title of the conversation',
                isInput: false,
                isOutput: true,
            },
            {
                name: 'conversationSummary',
                description: 'Summary of the conversation',
                isInput: false,
                isOutput: true,
            },
            {
                name: 'chatbotResponse',
                description: 'Chatbot response',
                isInput: false,
                isOutput: true,
                exampleValues: ['Hello, I am a Pavol`s virtual avatar. How can I help you?'],
            },
        );

        // TODO: !!!!!! spaceTrim
        $pipelineJson.tasks.push(
            {
                taskType: 'PROMPT_TASK',
                name: 'create-an-answer',
                title: 'Create an answer',
                content:
                    'Write a response to the user message:\n\n**Question from user**\n\n> {userMessage}\n\n**Previous conversation**\n\n> {previousConversationSummary}',
                resultingParameterName: 'chatbotResponse',
                personaName,
                dependentParameterNames: ['userMessage', 'previousConversationSummary' /* !!!!!!, 'knowledge'*/],
                // !!!!!! preparedContent: '{content}\n\n## Knowledge\n\n{knowledge}',
            },
            {
                taskType: 'PROMPT_TASK',
                name: 'summarize-the-conversation',
                title: 'Summarize the conversation',
                content:
                    'Summarize the conversation in a few words:\n\n## Rules\n\n-   Summarise the text of the conversation in a few words\n-   Convert the text to its basic idea\n-   Imagine you are writing the headline or subject line of an email\n-   Respond with a few words of summary only\n\n## Conversation\n\n**User:**\n\n> {userMessage}\n\n**You:**\n\n> {chatbotResponse}',
                resultingParameterName: 'conversationSummary',
                personaName,
                expectations: {
                    words: {
                        min: 1,
                        max: 10,
                    },
                },
                dependentParameterNames: ['userMessage', 'chatbotResponse' /* !!!!!!, 'knowledge'*/],
                // !!!!!! preparedContent: '{content}\n\n## Knowledge\n\n{knowledge}',
            },
            {
                taskType: 'SIMPLE_TASK',
                name: 'title',
                title: 'Title',
                content: '{conversationSummary}',
                resultingParameterName: 'title',
                dependentParameterNames: ['conversationSummary' /* !!!!!!, 'knowledge'*/],
                // !!!!!! preparedContent: '{content}\n\n## Knowledge\n\n{knowledge}',
            },
        );
    },
} satisfies SyncHighLevelAbstraction;
