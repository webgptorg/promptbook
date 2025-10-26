# Book Editor

A simple React textarea component optimized for book and long-form content editing with clean Tailwind styling.

## Features

-   Clean, focused writing interface
-   Controlled and uncontrolled modes
-   Responsive design
-   Accessible keyboard navigation
-   Optimized for long-form content

## Installation

Copy the `BookEditor.tsx` file to your project and ensure you have the required dependencies:

```bash
npm install react tailwindcss
```

## Usage

### Basic Usage

```tsx
import BookEditor from './BookEditor';

function WritingApp() {
    return <BookEditor placeholder="Start writing your story..." />;
}
```

### With Custom Rows

```tsx
<BookEditor rows={10} placeholder="Chapter 1..." />
```

### Controlled Mode

```tsx
import { useState } from 'react';

function WritingApp() {
    const [content, setContent] = useState('');

    return <BookEditor value={content} onChange={setContent} placeholder="Write your book..." />;
}
```

## Props

| Prop          | Type                      | Default                        | Description                                       |
| ------------- | ------------------------- | ------------------------------ | ------------------------------------------------- |
| `placeholder` | `string`                  | `"Start writing your book..."` | Placeholder text for the textarea                 |
| `rows`        | `number`                  | `6`                            | Number of visible text lines                      |
| `className`   | `string`                  | `""`                           | Additional CSS classes                            |
| `value`       | `string`                  | `undefined`                    | Controlled value (optional)                       |
| `onChange`    | `(value: string) => void` | `undefined`                    | Callback when value changes (for controlled mode) |

## Dependencies

-   React ^18.0.0 || ^19.0.0
-   Tailwind CSS ^3.0.0 || ^4.0.0

## License

MIT
