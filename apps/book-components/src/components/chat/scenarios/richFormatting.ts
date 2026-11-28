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
            content: spaceTrim(`
                **Absolutely!** Here’s a quick overview:

                - **Bold**
                - _Italic_
                - __Underline__
                - ~~Strikethrough~~
                - \`Inline code\`
                - Code block:

                \`\`\`js
                console.log('Hello, world!');
                \`\`\`
                > Blockquote
                > With
                > Multiple lines


                - Some text with [Link](https://example.com)
                - ![image](https://img.youtube.com/vi/nD1v9dMvnLY/maxresdefault.jpg)
                - Lists:
                  - Item 1
                    - Nested item
                - Numbered list:
                  1. First
                     1. Nested
                - Table:

                | Syntax | Description |
                |--------|-------------|
                | Header | Title       |
                | Cell   | Data        |

                - Emoji: 😄 🎉
                - Mention: @user
                - Hashtag: #demo
                - Math: $E=mc^2$
                - Horizontal rule:

                ---
            `),
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 3,
            createdAt: new Date(),
            sender: 'USER',
            content: spaceTrim(`
                Wow, that's a lot! Can you combine some of them?

                **Bold _italic_ and \`inline code\`**

                Or maybe:
                > _Blockquote with a [link](https://example.com)_

                And a table:

                | Name | Value |
                |------|-------|
                | Pi   | $\\pi$ |

                ---
            `),
            isComplete: true,
        },
        {
            // channel: 'PROMPTBOOK_CHAT',
            id: 4,
            createdAt: new Date(),
            sender: 'ASSISTANT_1',
            content: spaceTrim(`
                Of course! Here’s a creative mix:

                - ~~Strikethrough~~ and __underline__
                - 1. Numbered with *italic* and emoji 🚀
                - - Nested \`inline code\`

                > Blockquote with math: $a^2 + b^2 = c^2$

                ---

                Let me know if you want to see more! #rich #features
            `),
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
