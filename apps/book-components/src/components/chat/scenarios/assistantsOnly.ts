import spaceTrim from 'spacetrim';
import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const assistantsOnlyScenario = {
    name: 'AI Avatars discussing together (without user)',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '1',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: 'I think the best approach for this optimization would be to implement caching.',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '2',
            createdAt: new Date(),
            sender: 'ASSISTANT_2',
            content: spaceTrim(`

                Good point! We could use Redis for caching.

                **Here is a code example:**

                \`\`\`javascript
                const cache = require("redis").createClient();
                \`\`\`

            `),
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '3',
            createdAt: new Date(),
            sender: 'ASSISTANT_3',
            content:
                "Don't forget to document this properly. The documentation should explain:<br/>• Why caching was implemented<br/>• How to configure it<br/>• Performance benefits",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: '4',
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content:
                'Excellent suggestions from both of you. This collaborative approach will give the user the best solution.',
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
