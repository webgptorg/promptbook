'use client';

import { PromptbookAgent } from '@promptbook-local/components';
import { useSearchParams } from 'next/navigation';

export default function EmbedPage() {
    const searchParams = useSearchParams();
    const agentUrl = searchParams.get('agentUrl');

    if (!agentUrl) {
        return <div className="text-red-500">Missing agentUrl parameter</div>;
    }

    return (
        <div className="w-full h-full bg-transparent">
            <PromptbookAgent
                agentUrl={agentUrl}
                onOpenChange={(isOpen) => {
                    window.parent.postMessage({ type: 'PROMPTBOOK_AGENT_RESIZE', isOpen }, '*');
                }}
            />
        </div>
    );
}
