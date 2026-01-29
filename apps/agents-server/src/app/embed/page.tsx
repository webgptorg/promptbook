'use client';

import { PromptbookAgentIntegration } from '@promptbook-local/components';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function EmbedPage() {
    const searchParams = useSearchParams();
    const agentUrl = searchParams.get('agentUrl');
    const metaParam = searchParams.get('meta');

    const meta = useMemo(() => {
        if (!metaParam) {
            return undefined;
        }
        try {
            return JSON.parse(metaParam);
        } catch (e) {
            console.error('[🔌] Failed to parse meta parameter:', e);
            return undefined;
        }
    }, [metaParam]);

    if (!agentUrl) {
        return <div style={{ color: 'red' }}>Missing agentUrl parameter</div>;
    }

    return (
        <PromptbookAgentIntegration
            agentUrl={agentUrl}
            meta={meta}
            onOpenChange={(isOpen) => {
                window.parent.postMessage({ type: 'PROMPTBOOK_AGENT_RESIZE', isOpen }, '*');
            }}
        />
    );
}
