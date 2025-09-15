import { useState } from 'react';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
 * Demo component showing Chat with markdown rendering capabilities
 *
 * This example demonstrates various markdown features supported by the Chat component:
 * - Headers
 * - Bold and italic text
 * - Code blocks and inline code
 * - Lists (ordered and unordered)
 * - Links
 * - Blockquotes
 * - Tables
 * - Strikethrough text
 *
 * @private temporary for testing purposes
 */
export function ChatMarkdownDemo() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            date: new Date(),
            from: 'ASSISTANT',
            content: `# Welcome to Markdown Chat! 🎉

I can render **markdown** content including:

## Text Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough text~~
- \`inline code\`

## Code Blocks
\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
}

greet("World");
\`\`\`

## Lists
### Unordered List:
- First item
- Second item
- Third item

### Ordered List:
1. Step one
2. Step two
3. Step three

## Links and Quotes
Check out [OpenAI](https://openai.com) for more information.

> This is a blockquote. It can contain multiple lines
> and will be rendered with proper styling.

## Tables
| Feature | Supported | Notes |
|---------|-----------|-------|
| Headers | ✅ | H1-H6 |
| Lists | ✅ | Ordered & Unordered |
| Code | ✅ | Inline & Blocks |
| Links | ✅ | Opens in new tab |
| Tables | ✅ | Full support |

Try sending a message with markdown syntax!`,
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'USER',
            content: `Thanks! Let me try some markdown:

## My Test Message

Here's some **bold** and *italic* text.

\`\`\`python
def hello_world():
    print("Hello, World!")
    return "success"
\`\`\`

And a simple list:
- Item A
- Item B
- Item C`,
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'ASSISTANT',
            content: `Perfect! Your markdown rendered beautifully. Here are some more advanced features:

### Task Lists
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

### Mathematical Expressions
You can use inline math like \`E = mc²\` or block equations.

### Horizontal Rule
---

### Nested Lists
1. First level
   - Nested item 1
   - Nested item 2
2. Back to first level
   1. Nested numbered item
   2. Another nested numbered item

The chat component now fully supports GitHub-flavored markdown! 🚀`,
            isComplete: true,
        },
    ]);

    const participants: ChatParticipant[] = [
        {
            name: 'USER',
            fullname: 'User',
            color: '#007bff',
            isMe: true,
        },
        {
            name: 'ASSISTANT',
            fullname: 'AI Assistant',
            color: '#28a745',
            isMe: false,
        },
    ];

    const handleMessage = async (content: string) => {
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            date: new Date(),
            from: 'USER',
            content,
            isComplete: true,
        };

        setMessages((prev) => [...prev, newMessage]);

        // Simulate assistant response
        setTimeout(() => {
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                date: new Date(),
                from: 'ASSISTANT',
                content: `I received your message with markdown content:

---

${content}

---

The markdown has been rendered properly! Try more markdown features like:
- \`**bold**\` for **bold text**
- \`*italic*\` for *italic text*
- \`\\\`\\\`\\\`code blocks\\\`\\\`\\\` for code
- \`> quotes\` for blockquotes
- \`[links](url)\` for links`,
                isComplete: true,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        }, 1000);
    };

    const handleReset = () => {
        setMessages([]);
    };

    return (
        <div style={{ height: '600px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Chat Component with Markdown Support</h2>
            <p>This demo shows the Chat component rendering markdown content in messages.</p>

            <Chat
                messages={messages}
                onMessage={handleMessage}
                onReset={handleReset}
                participants={participants}
                placeholderMessageContent="Type your message with markdown syntax..."
                isAiTextHumanized={true}
            />
        </div>
    );
}
