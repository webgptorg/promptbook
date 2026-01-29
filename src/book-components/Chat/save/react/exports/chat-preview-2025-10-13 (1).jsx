import { Chat } from '@promptbook/components';

export function ChatPreviewChatComponent() {
    return (
        <Chat
            title="Chat Preview"
            participants={[
                {
                    name: 'USER',
                    fullname: 'You',
                    isMe: true,
                },
                {
                    name: 'ASSISTANT_1',
                    fullname: 'AI Assistant',
                    color: '#10b981',
                    avatarSrc: 'https://randomuser.me/api/portraits/men/0.jpg',
                },
                {
                    name: 'ASSISTANT_2',
                    fullname: 'Code Helper',
                    color: '#f59e0b',
                    avatarSrc: 'https://randomuser.me/api/portraits/men/1.jpg',
                },
                {
                    name: 'ASSISTANT_3',
                    fullname: 'Writing Assistant',
                    color: '#8b5cf6',
                    avatarSrc: 'https://randomuser.me/api/portraits/men/2.jpg',
                },
            ]}
            messages={[
                {
                    id: '1',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'USER',
                    content:
                        'Hi @assistant! Can you show me all the *rich formatting* features you support? 😄 #formatting',
                    isComplete: true,
                },
                {
                    id: '2',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'ASSISTANT_1',
                    content:
                        "**Absolutely!** Here’s a quick overview:\n\n- **Bold**\n- _Italic_\n- __Underline__\n- ~~Strikethrough~~\n- `Inline code`\n- Code block:\n\n```js\nconsole.log('Hello, world!');\n```\n> Blockquote\n> With\n> Multiple lines\n\n\n- Some text with [Link](https://example.com)\n- ![image](https://img.youtube.com/vi/nD1v9dMvnLY/maxresdefault.jpg)\n- Lists:\n  - Item 1\n    - Nested item\n- Numbered list:\n  1. First\n     1. Nested\n- Table:\n\n| Syntax | Description |\n|--------|-------------|\n| Header | Title       |\n| Cell   | Data        |\n\n- Emoji: 😄 🎉\n- Mention: @user\n- Hashtag: #demo\n- Math: $E=mc^2$\n- Horizontal rule:\n\n---",
                    isComplete: true,
                },
                {
                    id: '3',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'USER',
                    content:
                        "Wow, that's a lot! Can you combine some of them?\n\n**Bold _italic_ and `inline code`**\n\nOr maybe:\n> _Blockquote with a [link](https://example.com)_\n\nAnd a table:\n\n| Name | Value |\n|------|-------|\n| Pi   | $\\pi$ |\n\n---",
                    isComplete: true,
                },
                {
                    id: '4',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'ASSISTANT_1',
                    content:
                        'Of course! Here’s a creative mix:\n\n- ~~Strikethrough~~ and __underline__\n- 1. Numbered with *italic* and emoji 🚀\n- - Nested `inline code`\n\n> Blockquote with math: $a^2 + b^2 = c^2$\n\n---\n\nLet me know if you want to see more! #rich #features',
                    isComplete: true,
                },
                {
                    id: '5',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'ASSISTANT_1',
                    content:
                        'And here are some more emojis:\n\n😄🎉🚀💡📊📝🔥🌟✅❌\n❤🧡💙💚💛🧡❤️🤎🖤💜\n🐱‍👤🐱‍💻🐱🚀🐱‍🏍💫🎞🎫🎠🎏\n😀😀😁😂🤣😃😄😆😅🤩\n➿🛂🛃🛄🛅♿📶🚻🚹🚾',
                    isComplete: true,
                },
                {
                    id: '5',
                    createdAt: '2025-10-12T23:13:15.925Z',
                    sender: 'ASSISTANT_1',
                    content:
                        '## And lists:\n\n- Item 1\n- Item 2\n    - Nested Item 2a\n    - Nested Item 2b\n- Item 3\n\n1. First item\n2. Second item\n   1. Nested second item a\n   2. Nested second item b\n3. Third item',
                    isComplete: true,
                },
            ]}
        />
    );
}
