import type { Json } from '@/src/database/schema';
import {
    normalizeAgentMessageRunReport,
    type AgentMessageRunReport,
} from '../../../../../src/book-3.0/AgentMessageRunReport';
import { provideUserChatJobTable } from './provideUserChatJobTable';
import type { UserChatJobParameters, UserChatJobRecord } from './UserChatJobRecord';

/**
 * Reserved UserChatJob.parameters key used for the harness run report of the answered turn.
 */
export const USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY = '__promptbookRunReport';

/**
 * Reads the harness run report from one raw job parameters value as loaded from the database.
 *
 * Accepts both parsed JSONB objects and serialized JSON strings so PostgreSQL and SQLite modes work.
 *
 * @returns The typed report, or `null` when the parameters do not carry a valid report.
 */
export function getUserChatJobRunReportFromParameters(rawParameters: unknown): AgentMessageRunReport | null {
    const parameters = typeof rawParameters === 'string' ? parseUserChatJobParametersJson(rawParameters) : rawParameters;
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
        return null;
    }

    return normalizeAgentMessageRunReport(
        (parameters as Record<string, unknown>)[USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY],
    );
}

/**
 * Stores one harness run report in a UserChatJob parameters object.
 */
export function withUserChatJobRunReport(
    parameters: UserChatJobParameters,
    report: AgentMessageRunReport,
): UserChatJobParameters {
    return {
        ...parameters,
        [USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY]: report,
    };
}

/**
 * Persists one runner-produced run report into the job parameters so task details can show it.
 */
export async function persistUserChatJobRunReport(
    job: Pick<UserChatJobRecord, 'id' | 'parameters'>,
    report: AgentMessageRunReport,
): Promise<void> {
    const userChatJobTable = await provideUserChatJobTable();
    const { error } = await userChatJobTable
        .update({
            updatedAt: new Date().toISOString(),
            parameters: withUserChatJobRunReport(job.parameters, report) as Json,
        })
        .eq('id', job.id);

    if (error) {
        throw new Error(`Failed to persist the run report for user chat job "${job.id}": ${error.message}`);
    }
}

/**
 * Parses one serialized parameters JSON string and treats malformed content as absent.
 *
 * @private helper of `getUserChatJobRunReportFromParameters`
 */
function parseUserChatJobParametersJson(serializedParameters: string): unknown {
    try {
        return JSON.parse(serializedParameters);
    } catch {
        return null;
    }
}
