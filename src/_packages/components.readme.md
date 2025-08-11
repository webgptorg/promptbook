# `@promptbook/components`

Reusable React components for the Promptbook ecosystem.

This first release ships the `<BookEditor />` component — a styled, client-side book editor with inline highlighting of Promptbook commitment types (PERSONA, KNOWLEDGE, STYLE, …).

## Install

Install this package (and React if you don’t have it yet):

```bash
npm i @promptbook/components
# peer/runtime dependencies you almost certainly already have in your app:
npm i react react-dom
```

TypeScript projects (recommended dev types):
```bash
npm i -D @types/react @types/react-dom
```

## Usage

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
  // If omitted, a default set (PERSONA, KNOWLEDGE, STYLE, RULE, RULES, SAMPLE, EXAMPLE, FORMAT, MODEL, ACTION, META IMAGE, META LINK, NOTE, EXPECT, SCENARIO, SCENARIOS, BEHAVIOUR, BEHAVIOURS, AVOID, AVOIDANCE, GOAL, GOALS, CONTEXT) is used.
  commitmentTypes?: string[];
}
```

## Styling

The editor ships with sensible, utility-class-based styles (works well with Tailwind) and a lined-paper background effect. You can pass your own `className` and `fontClassName` to customize its look or integrate with your design system.

## Compatibility

- Frameworks: Next.js, CRA, Vite, Remix, and other React apps
- Rendering: Client-side
- Bundles: ESM and UMD
