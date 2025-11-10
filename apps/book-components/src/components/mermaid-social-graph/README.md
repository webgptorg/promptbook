# Mermaid Social Graph

A dynamic social network graph visualization using Mermaid.js, perfect for displaying relationships between people, organizations, and groups.

## Features

-   Interactive social network visualization
-   Multiple node types (person, organization, group)
-   Various relationship types with different visual styles
-   Customizable themes and layouts
-   Responsive design
-   Loading states and error handling
-   Built on Mermaid.js for reliability

## Installation

Copy the `MermaidSocialGraph.tsx` file to your project and ensure you have the required dependencies:

```bash
npm install react mermaid tailwindcss
```

## Usage

### Basic Usage

```tsx
import MermaidSocialGraph from './MermaidSocialGraph';

const nodes = [
    { id: 'alice', label: 'Alice', type: 'person' },
    { id: 'bob', label: 'Bob', type: 'person' },
    { id: 'company', label: 'Tech Corp', type: 'organization' },
];

const edges = [
    { from: 'alice', to: 'bob', label: 'friends', type: 'friend' },
    { from: 'bob', to: 'company', label: 'works at', type: 'member' },
];

function SocialNetwork() {
    return <MermaidSocialGraph nodes={nodes} edges={edges} />;
}
```

### With Custom Theme

```tsx
<MermaidSocialGraph nodes={nodes} edges={edges} theme="dark" />
```

### Horizontal Layout

```tsx
<MermaidSocialGraph nodes={nodes} edges={edges} direction="LR" />
```

## Props

| Prop        | Type                                           | Default     | Description                                             |
| ----------- | ---------------------------------------------- | ----------- | ------------------------------------------------------- |
| `nodes`     | `Node[]`                                       | _required_  | Array of nodes representing entities in the graph       |
| `edges`     | `Edge[]`                                       | _required_  | Array of edges representing relationships between nodes |
| `className` | `string`                                       | `""`        | Additional CSS classes                                  |
| `theme`     | `'default' \| 'dark' \| 'forest' \| 'neutral'` | `'default'` | Mermaid theme for the graph                             |
| `direction` | `'TB' \| 'TD' \| 'BT' \| 'RL' \| 'LR'`         | `'TB'`      | Direction of the graph layout                           |

## Types

### Node

```tsx
interface Node {
    id: string;
    label: string;
    type?: 'person' | 'organization' | 'group';
}
```

### Edge

```tsx
interface Edge {
    from: string;
    to: string;
    label?: string;
    type?: 'friend' | 'colleague' | 'family' | 'follows' | 'member';
}
```

## Node Types

-   **person**: Individual people (blue styling)
-   **organization**: Companies, institutions (purple styling)
-   **group**: Teams, communities (green styling)

## Edge Types

-   **friend**: Solid line (`---`)
-   **colleague**: Dotted line (`-..-`)
-   **family**: Thick line (`===`)
-   **follows**: Arrow (`-->`)
-   **member**: Arrow (`-->`)

## Dependencies

-   React ^18.0.0 || ^19.0.0
-   Mermaid ^10.0.0
-   Tailwind CSS ^3.0.0 || ^4.0.0

## License

MIT
