import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';

export const richFormattingScenario = {
    name: 'Rich Formatting Showcase',
    messages: [
        {
            id: '1',
            date: new Date(),
            from: 'USER',
            content: "Hi @assistant! Can you show me all the *rich formatting* features you support? 😄 #formatting",
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT_1',
            content: "**Absolutely!** Here’s a quick overview:\n\n" +
                "- **Bold**\n" +
                "- _Italic_\n" +
                "- __Underline__\n" +
                "- ~~Strikethrough~~\n" +
                "- `Inline code`\n" +
                "- Code block:\n\n" +
                "```js\nconsole.log('Hello, world!');\n```\n" +
                "- > Blockquote\n" +
                "- [Link](https://example.com)\n" +
                "- ![image](https://example.com/image.png)\n" +
                "- Lists:\n" +
                "  - Item 1\n" +
                "    - Nested item\n" +
                "- Numbered list:\n" +
                "  1. First\n" +
                "     1. Nested\n" +
                "- Table:\n\n" +
                "| Syntax | Description |\n" +
                "|--------|-------------|\n" +
                "| Header | Title       |\n" +
                "| Cell   | Data        |\n\n" +
                "- Emoji: 😄 🎉\n" +
                "- Mention: @user\n" +
                "- Hashtag: #demo\n" +
                "- Math: $E=mc^2$\n" +
                "- Horizontal rule:\n\n---",
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'USER',
            content: "Wow, that's a lot! Can you combine some of them?\n\n**Bold _italic_ and `inline code`**\n\nOr maybe:\n> _Blockquote with a [link](https://example.com)_\n\nAnd a table:\n\n| Name | Value |\n|------|-------|\n| Pi   | $\\pi$ |\n\n---",
            isComplete: true,
        },
        {
            id: '4',
            date: new Date(),
            from: 'ASSISTANT_1',
            content: "Of course! Here’s a creative mix:\n\n- ~~Strikethrough~~ and __underline__\n- 1. Numbered with *italic* and emoji 🚀\n- - Nested `inline code`\n\n> Blockquote with math: $a^2 + b^2 = c^2$\n\n---\n\nLet me know if you want to see more! #rich #features",
            isComplete: true,
        },
    ] as ChatMessage[],
};
