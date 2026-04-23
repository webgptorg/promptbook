'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { OptimisticAgentChatRouteLoading } from './OptimisticAgentChatRouteLoading';

/**
 * Route-level loading surface for the standalone agent chat page.
 */
export default function Loading() {
    const params = useParams<{ agentName?: string | Array<string> }>() || {};
    const searchParams = useSearchParams();
    const agentNameParam = params.agentName;
    const agentName = Array.isArray(agentNameParam) ? agentNameParam[0] || '' : agentNameParam || '';
    const isHeadlessMode = searchParams?.has('headless') || false;

    return <OptimisticAgentChatRouteLoading agentName={decodeURIComponent(agentName)} isHeadlessMode={isHeadlessMode} />;
}
