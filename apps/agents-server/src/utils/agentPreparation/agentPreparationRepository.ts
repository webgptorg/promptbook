import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { string_agent_permanent_id, TODO_any } from '@promptbook-local/types';
import type { AgentPreparationAgentSnapshot, AgentPreparationRow } from './agentPreparationTypes';
import { normalizeAgentPreparationTablePrefix } from './agentPreparationShared';

/**
 * Minimal persistence surface used by agent-preparation scheduling and workers.
 *
 * @private function of agentPreparation
 */
export type AgentPreparationRepository = {
    claimNextDueAgentPreparationJob(): Promise<AgentPreparationRow | null | undefined>;
    loadAgentSnapshot(
        agentPermanentId: string_agent_permanent_id,
    ): Promise<AgentPreparationAgentSnapshot | null | undefined>;
    loadExistingPreparationRow(
        agentPermanentId: string_agent_permanent_id,
    ): Promise<AgentPreparationRow | null | undefined>;
    loadPreparationRowById(preparationId: number): Promise<AgentPreparationRow | null | undefined>;
    loadPreparationRowByAgentAndFingerprint(
        agentPermanentId: string_agent_permanent_id,
        fingerprint: string,
    ): Promise<AgentPreparationRow | null | undefined>;
    insertPreparationRow(values: Record<string, unknown>): Promise<boolean>;
    updatePreparationRow(preparationId: number, values: Record<string, unknown>): Promise<boolean>;
    updateRunningPreparationRow(preparationId: number, values: Record<string, unknown>): Promise<boolean>;
};

/**
 * Creates a repository bound to one logical Agent/AgentPreparation table prefix.
 *
 * @private function of agentPreparation
 */
export function createAgentPreparationRepository(tablePrefix: string): AgentPreparationRepository {
    const normalizedTablePrefix = normalizeAgentPreparationTablePrefix(tablePrefix);
    const supabase = $provideSupabaseForServer() as TODO_any;
    const agentPreparationTableName = `${normalizedTablePrefix}AgentPreparation`;
    const agentTableName = `${normalizedTablePrefix}Agent`;

    return {
        async claimNextDueAgentPreparationJob(): Promise<AgentPreparationRow | null | undefined> {
            const nowIso = new Date().toISOString();

            const dueResult = await supabase
                .from(agentPreparationTableName)
                .select('*')
                .in('status', ['SCHEDULED', 'FAILED'])
                .lte('runAfter', nowIso)
                .order('runAfter', { ascending: true })
                .order('id', { ascending: true })
                .limit(1);

            if (dueResult.error) {
                console.error('[pre-index] Failed to load due jobs:', {
                    tablePrefix: normalizedTablePrefix,
                    error: dueResult.error.message,
                });
                return undefined;
            }

            const candidate = resolveSingleRow<AgentPreparationRow>(dueResult.data);
            if (!candidate) {
                return null;
            }

            const claimResult = await supabase
                .from(agentPreparationTableName)
                .update({
                    status: 'RUNNING',
                    startedAt: nowIso,
                    updatedAt: nowIso,
                    failedAt: null,
                    lastError: null,
                })
                .eq('id', candidate.id)
                .in('status', ['SCHEDULED', 'FAILED'])
                .lte('runAfter', nowIso)
                .select('*')
                .limit(1);

            if (claimResult.error) {
                console.error('[pre-index] Failed to claim job:', {
                    tablePrefix: normalizedTablePrefix,
                    jobId: candidate.id,
                    error: claimResult.error.message,
                });
                return undefined;
            }

            return resolveSingleRow<AgentPreparationRow>(claimResult.data);
        },

        async loadAgentSnapshot(
            agentPermanentId: string_agent_permanent_id,
        ): Promise<AgentPreparationAgentSnapshot | null | undefined> {
            const result = await supabase
                .from(agentTableName)
                .select('agentName,agentHash,agentSource,deletedAt')
                .eq('permanentId', agentPermanentId)
                .limit(1);

            if (result.error) {
                console.error('[pre-index] Failed to load agent snapshot:', {
                    tablePrefix: normalizedTablePrefix,
                    agentPermanentId,
                    error: result.error.message,
                });
                return undefined;
            }

            return resolveSingleRow<AgentPreparationAgentSnapshot>(result.data);
        },

        async loadExistingPreparationRow(
            agentPermanentId: string_agent_permanent_id,
        ): Promise<AgentPreparationRow | null | undefined> {
            const result = await supabase
                .from(agentPreparationTableName)
                .select('*')
                .eq('agentPermanentId', agentPermanentId)
                .limit(1);

            if (result.error) {
                console.error('[pre-index] Failed to load existing schedule state:', {
                    tablePrefix: normalizedTablePrefix,
                    agentPermanentId,
                    error: result.error.message,
                });
                return undefined;
            }

            return resolveSingleRow<AgentPreparationRow>(result.data);
        },

        async loadPreparationRowById(preparationId: number): Promise<AgentPreparationRow | null | undefined> {
            const result = await supabase.from(agentPreparationTableName).select('*').eq('id', preparationId).limit(1);

            if (result.error) {
                console.error('[pre-index] Failed to load preparation row:', {
                    tablePrefix: normalizedTablePrefix,
                    preparationId,
                    error: result.error.message,
                });
                return undefined;
            }

            return resolveSingleRow<AgentPreparationRow>(result.data);
        },

        async loadPreparationRowByAgentAndFingerprint(
            agentPermanentId: string_agent_permanent_id,
            fingerprint: string,
        ): Promise<AgentPreparationRow | null | undefined> {
            const result = await supabase
                .from(agentPreparationTableName)
                .select('*')
                .eq('agentPermanentId', agentPermanentId)
                .eq('targetFingerprint', fingerprint)
                .limit(1);

            if (result.error) {
                console.error('[pre-index] Failed to load preparation row by agent+fingerprint:', {
                    tablePrefix: normalizedTablePrefix,
                    agentPermanentId,
                    fingerprint,
                    error: result.error.message,
                });
                return undefined;
            }

            return resolveSingleRow<AgentPreparationRow>(result.data);
        },

        async insertPreparationRow(values: Record<string, unknown>): Promise<boolean> {
            const insertResult = await supabase.from(agentPreparationTableName).insert(values);

            if (insertResult.error) {
                console.error('[pre-index] Failed to insert schedule row:', {
                    tablePrefix: normalizedTablePrefix,
                    agentPermanentId: values.agentPermanentId,
                    error: insertResult.error.message,
                });
                return false;
            }

            return true;
        },

        async updatePreparationRow(preparationId: number, values: Record<string, unknown>): Promise<boolean> {
            const updateResult = await supabase
                .from(agentPreparationTableName)
                .update(values)
                .eq('id', preparationId);

            if (updateResult.error) {
                console.error('[pre-index] Failed to update schedule row:', {
                    tablePrefix: normalizedTablePrefix,
                    jobId: preparationId,
                    error: updateResult.error.message,
                });
                return false;
            }

            return true;
        },

        async updateRunningPreparationRow(preparationId: number, values: Record<string, unknown>): Promise<boolean> {
            const updateResult = await supabase
                .from(agentPreparationTableName)
                .update(values)
                .eq('id', preparationId)
                .eq('status', 'RUNNING');

            if (updateResult.error) {
                console.error('[pre-index] Failed to update RUNNING job:', {
                    tablePrefix: normalizedTablePrefix,
                    preparationId,
                    error: updateResult.error.message,
                });
                return false;
            }

            return true;
        },
    };
}

/**
 * Extracts the first row from Supabase list responses.
 *
 * @private function of agentPreparation
 */
function resolveSingleRow<Row>(data: unknown): Row | null {
    return Array.isArray(data) ? ((data[0] as Row | undefined) ?? null) : null;
}
