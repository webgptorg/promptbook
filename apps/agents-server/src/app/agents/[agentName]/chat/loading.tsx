'use client';

import { useParams } from 'next/navigation';
import { OptimisticAgentChatRouteLoading } from './OptimisticAgentChatRouteLoading';

/**
 * Route-level loading surface for the standalone agent chat page.
 */
export default function Loading() {
    const params = useParams<{ agentName?: string | Array<string> }>() || {};
    const agentNameParam = params.agentName;
    const agentName = Array.isArray(agentNameParam) ? agentNameParam[0] || '' : agentNameParam || '';

    return <OptimisticAgentChatRouteLoading agentName={decodeURIComponent(agentName)} />;
}
