import type { ChatMessage } from '../../../../../../src/book-components/Chat/interfaces/ChatMessage';

export const assistantsOnlyScenario = {
    name: 'AI Avatars discussing together (without user)',
    messages: [
        {
            id: '1',
            date: new Date(),
            from: 'ASSISTANT_1',
            content: 'I think the best approach for this optimization would be to implement caching.',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT_2',
            content:
                'Good point! We could use Redis for caching. Here\'s a code example:<br/><pre><code>const cache = require("redis").createClient();</code></pre>',
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'ASSISTANT_3',
            content:
                "Don't forget to document this properly. The documentation should explain:<br/>• Why caching was implemented<br/>• How to configure it<br/>• Performance benefits",
            isComplete: true,
        },
        {
            id: '4',
            date: new Date(),
            from: 'ASSISTANT_1',
            content:
                'Excellent suggestions from both of you. This collaborative approach will give the user the best solution.',
            isComplete: true,
        },
    ] as ChatMessage[],
};
