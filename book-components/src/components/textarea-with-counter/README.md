# Textarea with Counter

A React textarea component with real-time word and character counting, perfect for forms with length limits.

## Features

- Real-time word counting
- Character limit enforcement
- Visual feedback when approaching limit
- Controlled and uncontrolled modes
- Responsive design
- Accessible keyboard navigation

## Installation

Copy the `TextareaWithCounter.tsx` file to your project and ensure you have the required dependencies:

```bash
npm install react tailwindcss
```

## Usage

### Basic Usage

```tsx
import TextareaWithCounter from './TextareaWithCounter';

function MyForm() {
  return (
    <TextareaWithCounter 
      placeholder="Enter your message..." 
    />
  );
}
```

### With Custom Limit

```tsx
<TextareaWithCounter 
  maxLength={1000} 
  rows={6} 
  placeholder="Write your story..."
/>
```

### Controlled Mode

```tsx
import { useState } from 'react';

function MyForm() {
  const [text, setText] = useState('');

  return (
    <TextareaWithCounter 
      value={text}
      onChange={setText}
      maxLength={500}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `"Start typing..."` | Placeholder text for the textarea |
| `maxLength` | `number` | `500` | Maximum number of characters allowed |
| `rows` | `number` | `4` | Number of visible text lines |
| `className` | `string` | `""` | Additional CSS classes |
| `value` | `string` | `undefined` | Controlled value (optional) |
| `onChange` | `(value: string) => void` | `undefined` | Callback when value changes (for controlled mode) |

## Dependencies

- React ^18.0.0 || ^19.0.0
- Tailwind CSS ^3.0.0 || ^4.0.0

## License

MIT
