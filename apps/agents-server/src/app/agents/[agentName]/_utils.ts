import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
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

export async function isAgentDeleted(agentName: string): Promise<boolean> {
    const supabase = $provideSupabaseForServer();
    const { tablePrefix } = await import('../../../tools/$provideServer').then(m => m.$provideServer());

    const result = await supabase
        .from(`${tablePrefix}Agent`)
        .select('deletedAt')
        .eq('agentName', agentName)
        .single();

    if (result.error || !result.data) {
        return false; // If agent doesn't exist or error, consider not deleted
    }

    return result.data.deletedAt !== null;
}

/**
 * TODO: Split to multiple files
 */
