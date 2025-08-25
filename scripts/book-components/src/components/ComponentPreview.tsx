'use client';

import { Package } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues
const TextareaWithCounter = dynamic(() => import('@/components/textarea-with-counter/TextareaWithCounter'), {
    ssr: false,
});
const MermaidSocialGraph = dynamic(() => import('@/components/mermaid-social-graph/MermaidSocialGraph'), {
    ssr: false,
});
const BookEditorPreview = dynamic(() => import('@/components/book-editor/BookEditorPreview'), {
    ssr: false,
});

interface ComponentPreviewProps {
    componentId: string;
}

export default function ComponentPreview({ componentId }: ComponentPreviewProps) {
    const renderComponentPreview = () => {
        switch (componentId) {
            case 'textarea-with-counter':
                return (
                    <div className="p-6">
                        <TextareaWithCounter
                            placeholder="Try typing something here to see the word and character counter in action..."
                            maxLength={200}
                            rows={4}
                        />
                    </div>
                );
            case 'mermaid-social-graph':
                return (
                    <div className="p-6">
                        <MermaidSocialGraph
                            nodes={[
                                { id: 'alice', label: 'Alice', type: 'person' },
                                { id: 'bob', label: 'Bob', type: 'person' },
                                { id: 'charlie', label: 'Charlie', type: 'person' },
                                { id: 'company', label: 'Tech Corp', type: 'organization' },
                            ]}
                            edges={[
                                { from: 'alice', to: 'bob', label: 'friends', type: 'friend' },
                                { from: 'bob', to: 'charlie', label: 'colleagues', type: 'colleague' },
                                { from: 'charlie', to: 'company', label: 'works at', type: 'member' },
                            ]}
                        />
                    </div>
                );
            case 'book-editor':
                return (
                    <div className="p-6">
                        <BookEditorPreview />
                    </div>
                );

            default:
                return (
                    <div className="p-6 text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Component preview not available</p>
                    </div>
                );
        }
    };

    return <div className="bg-gray-50">{renderComponentPreview()}</div>;
}
