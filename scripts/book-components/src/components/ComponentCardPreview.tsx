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

type ComponentCardPreviewProps = {
    componentId: string;
};

export default function ComponentCardPreview({ componentId }: ComponentCardPreviewProps) {
    const renderComponentPreview = () => {
        switch (componentId) {
            case 'textarea-with-counter':
                return (
                    <div className="p-3 scale-75 origin-top-left transform">
                        <TextareaWithCounter placeholder="Try typing something here..." maxLength={100} rows={2} />
                    </div>
                );
            case 'mermaid-social-graph':
                return (
                    <div className="p-3 scale-50 origin-top-left transform">
                        <MermaidSocialGraph
                            nodes={[
                                { id: 'alice', label: 'Alice', type: 'person' },
                                { id: 'bob', label: 'Bob', type: 'person' },
                                { id: 'company', label: 'Tech Corp', type: 'organization' },
                            ]}
                            edges={[
                                { from: 'alice', to: 'bob', label: 'friends', type: 'friend' },
                                { from: 'bob', to: 'company', label: 'works at', type: 'member' },
                            ]}
                        />
                    </div>
                );
            case 'book-editor':
                return (
                    <div className="p-3 scale-75 origin-top-left transform">
                        <div className="pointer-events-none">
                            <BookEditorPreview />
                        </div>
                    </div>
                );
            case 'avatar-chip':
                return (
                    <div className="p-3 scale-90 origin-top-left transform">
                        <div className="pointer-events-none">
                            <AvatarChipPreview />
                        </div>
                    </div>
                );
            case 'avatar-profile':
                return (
                    <div className="p-3 scale-75 origin-top-left transform">
                        <div className="pointer-events-none">
                            <AvatarProfilePreview />
                        </div>
                    </div>
                );
            case 'chat':
                return (
                    <div className="p-3 scale-75 origin-top-left transform">
                        <div className="pointer-events-none">
                            <ChatPreview />
                        </div>
                    </div>
                );
            case 'llm-chat':
                return (
                    <div className="p-3 scale-75 origin-top-left transform">
                        <div className="pointer-events-none">
                            <LlmChatPreview />
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="p-3 text-center text-gray-400">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs">Preview not available</p>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-50 rounded-t-lg overflow-hidden h-32 relative">
            <div className="absolute inset-0 overflow-hidden">{renderComponentPreview()}</div>
            {/* Overlay to prevent interaction */}
            <div className="absolute inset-0 bg-transparent cursor-pointer" />
        </div>
    );
}
