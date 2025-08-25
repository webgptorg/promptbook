'use client';

import mermaid from 'mermaid';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Node {
    id: string;
    label: string;
    type?: 'person' | 'organization' | 'group';
}

interface Edge {
    from: string;
    to: string;
    label?: string;
    type?: 'friend' | 'colleague' | 'family' | 'follows' | 'member';
}

interface MermaidSocialGraphProps {
    nodes: Node[];
    edges: Edge[];
    className?: string;
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
    direction?: 'TB' | 'TD' | 'BT' | 'RL' | 'LR';
}

const defaultNodes: Node[] = [
    { id: 'alice', label: 'Alice', type: 'person' },
    { id: 'bob', label: 'Bob', type: 'person' },
    { id: 'charlie', label: 'Charlie', type: 'person' },
    { id: 'diana', label: 'Diana', type: 'person' },
    { id: 'eve', label: 'Eve', type: 'person' },
    { id: 'company', label: 'Tech Corp', type: 'organization' },
    { id: 'team', label: 'Dev Team', type: 'group' },
];

const defaultEdges: Edge[] = [
    { from: 'alice', to: 'bob', label: 'friends', type: 'friend' },
    { from: 'bob', to: 'charlie', label: 'colleagues', type: 'colleague' },
    { from: 'alice', to: 'diana', label: 'sisters', type: 'family' },
    { from: 'charlie', to: 'company', label: 'works at', type: 'member' },
    { from: 'bob', to: 'company', label: 'works at', type: 'member' },
    { from: 'alice', to: 'team', label: 'leads', type: 'member' },
    { from: 'eve', to: 'alice', label: 'follows', type: 'follows' },
    { from: 'diana', to: 'eve', label: 'friends', type: 'friend' },
];

export default function MermaidSocialGraph({
    nodes = defaultNodes,
    edges = defaultEdges,
    className = '',
    theme = 'default',
    direction = 'TB',
}: MermaidSocialGraphProps) {
    const mermaidRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const generateMermaidSyntax = useCallback((nodes: Node[], edges: Edge[], direction: string): string => {
        let syntax = `graph ${direction}\n`;

        // Add node definitions with styling based on type
        nodes.forEach((node) => {
            const nodeStyle = getNodeStyle(node.type);
            syntax += `    ${node.id}["${node.label}"]${nodeStyle}\n`;
        });

        // Add edges
        edges.forEach((edge) => {
            const edgeStyle = getEdgeStyle(edge.type);
            const label = edge.label ? `|${edge.label}|` : '';
            syntax += `    ${edge.from} ${edgeStyle}${label} ${edge.to}\n`;
        });

        // Add styling classes
        syntax += `
    classDef person fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef organization fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef group fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    `;

        // Apply classes to nodes
        nodes.forEach((node) => {
            if (node.type) {
                syntax += `class ${node.id} ${node.type}\n`;
            }
        });

        return syntax;
    }, []);

    useEffect(() => {
        const initializeMermaid = async () => {
            try {
                setIsLoading(true);
                setError(null);

                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme,
                    securityLevel: 'loose',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis',
                    },
                });

                if (mermaidRef.current) {
                    // Generate Mermaid syntax
                    const mermaidSyntax = generateMermaidSyntax(nodes, edges, direction);

                    // Clear previous content
                    mermaidRef.current.innerHTML = '';

                    // Create a unique ID for this diagram
                    const diagramId = `mermaid-${Date.now()}`;

                    // Render the diagram
                    const { svg } = await mermaid.render(diagramId, mermaidSyntax);
                    mermaidRef.current.innerHTML = svg;
                }
            } catch (err) {
                console.error('Mermaid rendering error:', err);
                setError('Failed to render social graph');
            } finally {
                setIsLoading(false);
            }
        };

        initializeMermaid();
    }, [generateMermaidSyntax, nodes, edges, theme, direction]);

    const getNodeStyle = (type?: string): string => {
        switch (type) {
            case 'person':
                return '';
            case 'organization':
                return '';
            case 'group':
                return '';
            default:
                return '';
        }
    };

    const getEdgeStyle = (type?: string): string => {
        switch (type) {
            case 'friend':
                return '---';
            case 'colleague':
                return '-..-';
            case 'family':
                return '===';
            case 'follows':
                return '-->';
            case 'member':
                return '-->';
            default:
                return '---';
        }
    };

    if (error) {
        return (
            <div className={`p-4 border border-red-300 rounded-lg bg-red-50 ${className}`}>
                <p className="text-red-600">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className={`w-full ${className}`}>
            {isLoading && (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading social graph...</span>
                </div>
            )}
            <div
                ref={mermaidRef}
                className={`mermaid-container ${isLoading ? 'hidden' : ''}`}
                style={{ minHeight: '300px' }}
            />
        </div>
    );
}
