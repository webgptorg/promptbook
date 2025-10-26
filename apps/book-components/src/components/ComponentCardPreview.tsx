'use client';

import { Package } from 'lucide-react';
import dynamic from 'next/dynamic';

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
});
const LlmChatPreview = dynamic(() => import('@/components/llm-chat/LlmChatPreview'), {
    ssr: false,
});

type ComponentCardPreviewProps = {
    componentId: string;
};

export default function ComponentCardPreview({ componentId }: ComponentCardPreviewProps) {
    const renderComponentPreview = () => {
        switch (componentId) {
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

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 * TODO: [🙉] DRY - make some index / register for component previews, DO not duplicate switch cases in multiple places
 */
