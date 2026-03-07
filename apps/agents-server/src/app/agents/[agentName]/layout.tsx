'use server';

import type { Metadata } from 'next';
import { generateAgentMetadata } from './generateAgentMetadata';

/**
 * Generates shared branded metadata for all pages under `/agents/[agentName]`.
 *
 * @param params - Dynamic route parameters with `agentName`.
 * @returns Metadata used by Next.js head rendering.
 */
export async function generateMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    return generateAgentMetadata({ params });
}

/**
 * Shared route layout for all pages under `/agents/[agentName]`.
 */
export default async function AgentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
