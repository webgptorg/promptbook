Reusable React components for the Promptbook ecosystem, providing a comprehensive set of UI components for building promptbook-powered applications.

## 🎯 Purpose and Motivation

The components package provides ready-to-use React components that integrate seamlessly with the Promptbook ecosystem. It eliminates the need to build UI components from scratch when creating promptbook-powered applications, offering everything from book editors to chat interfaces and avatar components.

## 🔧 High-Level Functionality

This package provides a complete set of React components for promptbook applications:

-   **Book Editor**: Styled editor with syntax highlighting for promptbook commitment types
-   **Chat Components**: Full-featured chat interfaces for LLM interactions
-   **Avatar Components**: Profile and chip components for user representation
-   **Icon Library**: Consistent iconography for promptbook applications
-   **Markdown Rendering**: Utilities for rendering markdown content in chat contexts

## ✨ Key Features

-   🎨 **Styled Components** - Pre-styled components that work out of the box
-   💬 **Chat Interface** - Complete chat UI with LLM integration support
-   ✏️ **Book Editor** - Syntax-highlighted editor for promptbook files
-   👤 **Avatar System** - Flexible avatar components with profile support
-   🎯 **TypeScript Support** - Full TypeScript definitions for all components
-   📱 **Responsive Design** - Components work across different screen sizes
-   🔧 **Customizable** - Easy to customize with CSS classes and props
-   ⚡ **Performance Optimized** - Efficient rendering and minimal bundle size

## Example Usage

### Next.js (App Router)

```tsx
'use client';

import { BookEditor } from '@promptbook/components';

export default function Page() {
    return (
        <div className="p-6">
            <BookEditor className="max-w-3xl mx-auto" />
        </div>
    );
}
```

Note: The component contains a top-level "use client" directive so it can be imported directly in client components.

### Create React App / Vite / Other React apps

```tsx
import { BookEditor } from '@promptbook/components';

function App() {
    return (
        <div style={{ padding: 24 }}>
            <BookEditor />
        </div>
    );
}

export default App;
```

## Component API

```ts
import type { BookEditorProps } from '@promptbook/components';

interface BookEditorProps {
    // Additional CSS classes for wrapper
    className?: string;

    // Optional font className (e.g. from next/font)
    fontClassName?: string;

    // Controlled value of the book text
    value?: string;

    // Controlled change handler
    onChange?: (value: string) => void;

    // Explicit list of commitment keywords to highlight (case-insensitive).
    // If omitted, a default set (PERSONA, KNOWLEDGE, MEMORY, STYLE, RULE, RULES, SAMPLE, EXAMPLE, FORMAT, MODEL, ACTION, META IMAGE, META LINK, NOTE, GOAL, MESSAGE, SCENARIO, DELETE, CANCEL, DISCARD, REMOVE, EXPECT, SCENARIOS, BEHAVIOUR, BEHAVIOURS, AVOID, AVOIDANCE, GOALS, CONTEXT) is used.
    commitmentTypes?: string[];
}
```

## Styling

The component comes with built-in styles. You can pass your own `className` and `fontClassName` to customize its look or integrate with your design system.

## Compatibility

-   Frameworks: Next.js, CRA, Vite, Remix, and other React apps
-   Rendering: Client-side
-   Bundles: ESM and UMD

<!--
TODO: [🧠] `@promptbook/components` vs `@promptbook/ui`, which name is better?
-->

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Avatar Components

-   `AvatarChip` - Compact avatar display component
-   `AvatarChipProps` - Props interface for AvatarChip (type)
-   `AvatarChipFromSource` - Avatar chip with source-based loading
-   `AvatarChipFromSourceProps` - Props interface for AvatarChipFromSource (type)
-   `AvatarProfile` - Full avatar profile component
-   `AvatarProfileProps` - Props interface for AvatarProfile (type)
-   `AvatarProfileFromSource` - Avatar profile with source-based loading
-   `AvatarProfileFromSourceProps` - Props interface for AvatarProfileFromSource (type)

### Book Editor Components

-   `BookEditor` - Main book editor component with syntax highlighting
-   `BookEditorProps` - Props interface for BookEditor (type)

### Chat Components

-   `Chat` - Basic chat interface component
-   `ChatProps` - Props interface for Chat component (type)
-   `LlmChat` - Enhanced chat component with LLM integration
-   `LlmChatProps` - Props interface for LlmChat component (type)

### Chat Types and Utilities

-   `ChatMessage` - Type definition for chat messages (type)
-   `ChatParticipant` - Type definition for chat participants (type)
-   `renderMarkdown` - Utility function for rendering markdown content
-   `isMarkdownContent` - Utility to check if content is markdown

### Icon Components

-   `ArrowIcon` - Arrow icon component
-   `ResetIcon` - Reset/refresh icon component
-   `SendIcon` - Send message icon component
-   `TemplateIcon` - Template/document icon component

> 💡 This package provides React components for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
