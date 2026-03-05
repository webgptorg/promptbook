'use client';

import { PromptbookAgentIntegration } from '@promptbook-local/components';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/**
 * Hosts the embeddable Promptbook widget inside an iframe and synchronizes
 * open/close state with the parent document.
 */
export default function EmbedPage() {
    const searchParams = useSearchParams();
    const agentUrl = searchParams.get('agentUrl');
    const metaParam = searchParams.get('meta');
    const isInitiallyOpen = searchParams.get('open') === '1';
    const [isOpen, setIsOpen] = useState(isInitiallyOpen);

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

    useEffect(() => {
        setIsOpen(isInitiallyOpen);
    }, [isInitiallyOpen]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!event.data || event.data.type !== 'PROMPTBOOK_AGENT_SET_OPEN') {
                return;
            }

            setIsOpen(Boolean(event.data.isOpen));
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    useEffect(() => {
        window.parent.postMessage({ type: 'PROMPTBOOK_AGENT_RESIZE', isOpen }, '*');
    }, [isOpen]);

    if (!agentUrl) {
        return <div style={{ color: 'red' }}>Missing agentUrl parameter</div>;
    }

    return (
        <>
            <style jsx global>{`
                html,
                body {
                    margin: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent !important;
                    overflow: hidden;
                }

                #__next {
                    width: 100%;
                    height: 100%;
                }
            `}</style>
            <PromptbookAgentIntegration
                agentUrl={agentUrl}
                meta={meta}
                isOpen={isOpen}
                style={{ right: 0, bottom: 0 }}
                onOpenChange={(nextIsOpen) => {
                    setIsOpen(nextIsOpen);
                }}
            />
        </>
    );
}
