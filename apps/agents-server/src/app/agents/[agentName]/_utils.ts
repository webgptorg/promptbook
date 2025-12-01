import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { parseAgentSource } from '@promptbook-local/core';

export const AGENT_ACTIONS = ['Emails', 'Web chat', 'Read documents', 'Browser', 'WhatsApp', '<Coding/>'];

export async function getAgentName(params: Promise<{ agentName: string }>) {
    const { agentName } = await params;
    return decodeURIComponent(agentName);
}

export async function getAgentProfile(agentName: string) {
    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    return parseAgentSource(agentSource);
}
