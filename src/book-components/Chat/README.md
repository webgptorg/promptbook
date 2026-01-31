# 💬 Chat components

<!-- TODO: [🧠][🕳] Remove READMEs alongsite components or make some system for write it on single place - for both component.yml and README -->

The Chat component now supports full markdown rendering for messages, allowing rich text formatting in chat conversations.

## Features

The Chat component supports GitHub-flavored markdown including:

### Text Formatting

-   **Bold text** using `**bold**` or `__bold__`
-   _Italic text_ using `*italic*` or `_italic_`
-   ~~Strikethrough text~~ using `~~strikethrough~~`
-   `Inline code` using backticks
-   Underlined text using `<u>underlined</u>`

### Code Blocks

```javascript
// Syntax-highlighted code blocks
function example() {
    console.log('Hello, World!');
}
```

### Headers

```markdown
# Header 1

## Header 2

### Header 3

#### Header 4

##### Header 5

###### Header 6
```

### Lists

```markdown
Unordered lists:

-   Item 1
-   Item 2
-   Item 3

Ordered lists:

1. First item
2. Second item
3. Third item

Task lists:

-   [x] Completed task
-   [ ] Pending task
```

### Links and Images

```markdown
[Link text](https://example.com)
![Alt text](image.jpg)
```

### Blockquotes

```markdown
> This is a blockquote
> It can span multiple lines
```

### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Horizontal Rules

```markdown
---
```

## Usage

The Chat component automatically renders markdown content in messages:

```tsx
import { Chat } from '@promptbook/components';

const messages = [
    {
        id: '1',
        createdAt: new Date().toISOString(),
        sender: 'USER',
        content: '**Hello!** This is *markdown* content with `code`.',
        isComplete: true,
    },
];

<Chat messages={messages} onMessage={handleMessage} participants={participants} />;
```

## Security

The markdown renderer includes basic security features:

-   Removes dangerous HTML attributes (`onclick`, `onload`, etc.)
-   Removes `javascript:` and `data:` URLs
-   Sanitizes potentially harmful content

For production use with untrusted content, consider using a more robust HTML sanitizer like DOMPurify.

## Configuration

The markdown renderer is configured with:

-   GitHub-flavored markdown
-   Tables support
-   Strikethrough support
-   Task lists support
-   Code blocks with syntax highlighting classes
-   Links open in new windows
-   Header IDs prefixed with `chat-header-`

## Implementation Details

The markdown rendering is handled by:

-   `renderMarkdown()` function in `utils/renderMarkdown.ts`
-   Uses Showdown library for markdown-to-HTML conversion
-   Integrated into the Chat component's message rendering

## Examples

See `examples/ChatMarkdownDemo.tsx` for a complete working example demonstrating all markdown features.

## Testing

Run the tests with:

```bash
npm test -- --testPathPattern="renderMarkdown.test.ts"
```

The test suite covers:

-   All markdown syntax features
-   Security sanitization
-   Error handling
-   Edge cases
