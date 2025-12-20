import { $getTableName } from '@/src/database/$getTableName';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { parseAgentSource } from '@promptbook-local/core';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';

export const AGENT_ACTIONS = ['Emails', 'Web chat', 'Read documents', 'Browser', 'WhatsApp', '<Coding/>'];

export async function getAgentName(params: Promise<{ agentName: string }>) {
    const { agentName } = await params;
    return decodeURIComponent(agentName);
}

export async function getAgentProfile(agentName: string) {
    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentIdByName(agentName);
    const agentSource = await collection.getAgentSource(agentId);
    const agentProfile = parseAgentSource(agentSource);
    return agentProfile;
}

export async function isAgentDeleted(agentName: string): Promise<boolean> {
    const supabase = $provideSupabaseForServer();

    const result = await supabase
        .from(await $getTableName(`Agent`))
        .select('deletedAt')
        .eq('agentName', agentName)
        .single();

    if (result.error || !result.data) {
        return false; // If agent doesn't exist or error, consider not deleted
    }

    return result.data.deletedAt !== null;
}

/**
 * TODO: Split to multiple files, refactor
 */
