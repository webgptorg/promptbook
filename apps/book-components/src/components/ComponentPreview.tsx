'use client';

import { Package } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues

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
const MockedChatPreview = dynamic(() => import('@/components/mocked-chat/MockedChatPreview'), {
    ssr: false,
});
const PromptbookQrCodePreview = dynamic(() => import('@/components/qr-code/PromptbookQrCodePreview'), {
    ssr: false,
});

type ComponentPreviewProps = {
    componentId: string;
};

export default function ComponentPreview({ componentId }: ComponentPreviewProps) {
    const renderComponentPreview = () => {
        switch (componentId) {
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

            case 'qr-code':
                return (
                    <div className="p-6">
                        <PromptbookQrCodePreview />
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

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 * TODO: [🙉] DRY - make some index / register for component previews, DO not duplicate switch cases in multiple places
 */
