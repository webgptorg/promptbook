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
const AvatarChipPreview = dynamic(() => import('@/components/avatar-chip/AvatarChipPreview'), {
    ssr: false,
});
const AvatarProfilePreview = dynamic(() => import('@/components/avatar-profile/AvatarProfilePreview'), {
    ssr: false,
});
const ChatPreview = dynamic(() => import('@/components/chat/ChatPreview'), {
    ssr: false,
    loading: () => (
        <div
            className="w-full bg-gray-50 border border-gray-200 rounded-lg flex flex-col"
            style={{ height: '800px' }}
        >
            {/* Header placeholder */}
            <div className="h-16 bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
            </div>

            {/* Messages area placeholder */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* Sample message bubbles */}
                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-16"></div>
                    </div>
                </div>

                <div className="flex items-end space-x-3 justify-end">
                    <div className="bg-blue-200 rounded-2xl rounded-br-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-blue-300 rounded w-20"></div>
                    </div>
                    <div className="w-10 h-10 bg-blue-300 rounded-full animate-pulse"></div>
                </div>

                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-24"></div>
                    </div>
                </div>
            </div>

            {/* Input area placeholder */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-end space-x-3">
                    <div className="flex-1 bg-gray-300 rounded-full h-12 animate-pulse"></div>
                    <div className="w-12 h-12 bg-blue-300 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    ),
});
const LlmChatPreview = dynamic(() => import('@/components/llm-chat/LlmChatPreview'), {
    ssr: false,
    loading: () => (
        <div
            className="w-full bg-gray-50 border border-gray-200 rounded-lg flex flex-col"
            style={{ height: '800px' }}
        >
            {/* Header placeholder */}
            <div className="h-16 bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
            </div>

            {/* Messages area placeholder */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* Sample message bubbles */}
                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-16"></div>
                    </div>
                </div>

                <div className="flex items-end space-x-3 justify-end">
                    <div className="bg-blue-200 rounded-2xl rounded-br-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-blue-300 rounded w-20"></div>
                    </div>
                    <div className="w-10 h-10 bg-blue-300 rounded-full animate-pulse"></div>
                </div>

                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-24"></div>
                    </div>
                </div>
            </div>

            {/* Input area placeholder */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-end space-x-3">
                    <div className="flex-1 bg-gray-300 rounded-full h-12 animate-pulse"></div>
                    <div className="w-12 h-12 bg-blue-300 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    ),
});
const MockedChatPreview = dynamic(() => import('@/components/mocked-chat/MockedChatPreview'), {
    ssr: false,
    loading: () => (
        <div
            className="w-full bg-gray-50 border border-gray-200 rounded-lg flex flex-col"
            style={{ height: '800px' }}
        >
            {/* Header placeholder */}
            <div className="h-16 bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
            </div>

            {/* Messages area placeholder */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* Sample message bubbles */}
                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-16"></div>
                    </div>
                </div>

                <div className="flex items-end space-x-3 justify-end">
                    <div className="bg-blue-200 rounded-2xl rounded-br-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-blue-300 rounded w-20"></div>
                    </div>
                    <div className="w-10 h-10 bg-blue-300 rounded-full animate-pulse"></div>
                </div>

                <div className="flex items-end space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="bg-gray-300 rounded-2xl rounded-bl-sm p-4 max-w-xs animate-pulse">
                        <div className="h-4 bg-gray-400 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-400 rounded w-24"></div>
                    </div>
                </div>
            </div>

            {/* Input area placeholder */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-end space-x-3">
                    <div className="flex-1 bg-gray-300 rounded-full h-12 animate-pulse"></div>
                    <div className="w-12 h-12 bg-blue-300 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    ),
});

type ComponentPreviewProps = {
    componentId: string;
};

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
            case 'avatar-chip':
                return (
                    <div className="p-6">
                        <AvatarChipPreview />
                    </div>
                );
            case 'avatar-profile':
                return (
                    <div className="p-6">
                        <AvatarProfilePreview />
                    </div>
                );
            case 'chat':
                return (
                    <div className="p-6">
                        <ChatPreview />
                    </div>
                );
            case 'llm-chat':
                return (
                    <div className="p-6">
                        <LlmChatPreview />
                    </div>
                );
            case 'mocked-chat':
                return (
                    <div className="p-6">
                        <MockedChatPreview />
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
