import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { string_book } from '@promptbook-local/types';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { resolvePromptbookTemporaryPath } from '../../../../../src/utils/filesystem/promptbookTemporaryPath';
import { PTBK_AGENTS_SERVER_AGENT_ROOT_ENV } from './localChatRunnerConstants';

/**
 * Persisted agent source snapshot used to synchronize one local runner folder.
 */
export type LocalAgentSourceSnapshot = {
    agentName: string;
    agentPermanentId: string;
    agentSource: string_book;
};

/**
 * Local folder metadata resolved for one agent.
 */
export type LocalAgentFolder = {
    directoryName: string;
    directoryPath: string;
};

/**
 * Loads one persisted agent source snapshot by permanent id.
 */
export async function loadLocalAgentSourceSnapshot(agentPermanentId: string): Promise<LocalAgentSourceSnapshot> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select('agentName,permanentId,agentSource')
        .eq('permanentId', agentPermanentId)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load agent "${agentPermanentId}" for local runner sync: ${error.message}`);
    }

    if (!data?.permanentId || !data.agentName || typeof data.agentSource !== 'string') {
        throw new Error(`Agent "${agentPermanentId}" was not found for local runner sync.`);
    }

    return {
        agentName: data.agentName,
        agentPermanentId: data.permanentId,
        agentSource: data.agentSource as string_book,
    };
}

/**
 * Ensures the current agent source and local message queue folders exist for one runner folder.
 */
export async function ensureLocalAgentFolder(snapshot: LocalAgentSourceSnapshot): Promise<LocalAgentFolder> {
    const directoryName = createLocalAgentDirectoryName(snapshot.agentPermanentId);
    const directoryPath = join(resolveLocalAgentRootPath(), directoryName);

    await Promise.all([
        mkdir(join(directoryPath, 'messages', 'queued'), { recursive: true }),
        mkdir(join(directoryPath, 'messages', 'finished'), { recursive: true }),
        mkdir(join(directoryPath, 'messages', 'failed'), { recursive: true }),
        mkdir(join(directoryPath, 'knowledge'), { recursive: true }),
    ]);

    await writeFile(join(directoryPath, 'agent.book'), normalizeAgentSource(snapshot.agentSource), 'utf-8');

    return { directoryName, directoryPath };
}

/**
 * Resolves the local agent root watched by the foreground Agents Server command.
 */
export function resolveLocalAgentRootPath(): string {
    const configuredRoot = process.env[PTBK_AGENTS_SERVER_AGENT_ROOT_ENV]?.trim();

    return configuredRoot || resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'agents');
}

/**
 * Creates a stable local agent directory name for one permanent id.
 */
export function createLocalAgentDirectoryName(agentPermanentId: string): string {
    const normalizedPermanentId = agentPermanentId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/gu, '-')
        .replace(/^[._-]+|[._-]+$/gu, '');

    return `agent-${normalizedPermanentId || 'id'}`;
}

/**
 * Keeps persisted agent source readable by the coding-agent runner.
 */
function normalizeAgentSource(agentSource: string): string {
    return agentSource.endsWith('\n') ? agentSource : `${agentSource}\n`;
}
