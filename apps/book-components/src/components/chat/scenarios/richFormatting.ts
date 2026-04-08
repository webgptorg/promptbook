import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

/**
 * Map of rich formatting scenario.
 */
export const richFormattingScenario = {
    name: 'Rich Formatting Showcase',
    messages: [
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 1,
            createdAt: new Date(),
            sender: 'USER',
            content: 'Hi @assistant! Can you show me all the *rich formatting* features you support? 😄 #formatting',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 2,
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content:
                '**Absolutely!** Here’s a quick overview:\n\n' +
                '- **Bold**\n' +
                '- _Italic_\n' +
                '- __Underline__\n' +
                '- ~~Strikethrough~~\n' +
                '- `Inline code`\n' +
                '- Code block:\n\n' +
                "```js\nconsole.log('Hello, world!');\n```\n" +
                '> Blockquote\n' +
                '> With\n' +
                '> Multiple lines\n' +
                '\n' +
                '\n' +
                '- Some text with [Link](https://example.com)\n' +
                '- ![image](https://img.youtube.com/vi/nD1v9dMvnLY/maxresdefault.jpg)\n' +
                '- Lists:\n' +
                '  - Item 1\n' +
                '    - Nested item\n' +
                '- Numbered list:\n' +
                '  1. First\n' +
                '     1. Nested\n' +
                '- Table:\n\n' +
                '| Syntax | Description |\n' +
                '|--------|-------------|\n' +
                '| Header | Title       |\n' +
                '| Cell   | Data        |\n\n' +
                '- Emoji: 😄 🎉\n' +
                '- Mention: @user\n' +
                '- Hashtag: #demo\n' +
                '- Math: $E=mc^2$\n' +
                '- Horizontal rule:\n\n---',
            // <- TODO: Use spaceTrim
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 3,
            createdAt: new Date(),
            sender: 'USER',
            content:
                "Wow, that's a lot! Can you combine some of them?\n\n**Bold _italic_ and `inline code`**\n\nOr maybe:\n> _Blockquote with a [link](https://example.com)_\n\nAnd a table:\n\n| Name | Value |\n|------|-------|\n| Pi   | $\\pi$ |\n\n---",
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 4,
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content:
                'Of course! Here’s a creative mix:\n\n- ~~Strikethrough~~ and __underline__\n- 1. Numbered with *italic* and emoji 🚀\n- - Nested `inline code`\n\n> Blockquote with math: $a^2 + b^2 = c^2$\n\n---\n\nLet me know if you want to see more! #rich #features',
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 5,
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: spaceTrim(`
                And here are some more emojis:

                😄🎉🚀💡📊📝🔥🌟✅❌
                ❤🧡💙💚💛🧡❤️🤎🖤💜
                🐱‍👤🐱‍💻🐱🚀🐱‍🏍💫🎞🎫🎠🎏
                😀😀😁😂🤣😃😄😆😅🤩
                ➿🛂🛃🛄🛅♿📶🚻🚹🚾

          `),
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 6,
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: spaceTrim(`
                ## And lists:

                - Item 1
                - Item 2
                    - Nested Item 2a
                    - Nested Item 2b
                - Item 3

                1. First item
                2. Second item
                   1. Nested second item a
                   2. Nested second item b
                3. Third item

            `),
            isComplete: true,
        },
    ] satisfies Array<ChatMessage>,
};
