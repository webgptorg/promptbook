import moment from 'moment';
import type { SelfLearningToolCallResult } from '../../../types/ToolCall';
import { countLines } from '../../../utils/expectation-counters/countLines';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { ChatMessage } from '../types/ChatMessage';
import { getToolCallTimestamp } from '../utils/toolCallParsing';

/**
 * Resolved summary data for self-learning tool calls.
 * 
 * @private component of `<Chat/>`
 */
export type SelfLearningSummaryData = {
    commitments: Array<string>;
    commitmentsText: string;
    commitmentsLineCount: number;
    hasTeacherCommitments: boolean;
    samplesLabel: string | null;
    updatedLabel: string | null;
};

/**
 * Parses ISO timestamps into Date instances.
 * 
 * @private component of `<Chat/>`
 */
function parseIsoDate(value: unknown): Date | null {
    if (typeof value !== 'string') {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats singular/plural labels from numeric counts.
 * 
 * @private component of `<Chat/>`
 */
function formatCountLabel(count: number, singular: string, plural?: string): string {
    if (count === 1) {
        return `${count} ${singular}`;
    }

    const resolvedPlural = plural ?? `${singular}s`;
    return `${count} ${resolvedPlural}`;
}

/**
 * Builds UI-ready data for the self-learning modal from a tool call.
 * 
 * @private component of `<Chat/>`
 */
export function buildSelfLearningSummary(
    toolCall: NonNullable<ChatMessage['toolCalls']>[number],
    resultRaw: TODO_any,
): SelfLearningSummaryData {
    const typedResult =
        resultRaw && typeof resultRaw === 'object' ? (resultRaw as Partial<SelfLearningToolCallResult>) : null;
    const startedAt = parseIsoDate(typedResult?.startedAt) || getToolCallTimestamp(toolCall);
    const completedAt = parseIsoDate(typedResult?.completedAt);
    const updatedAt = completedAt || startedAt;
    const updatedLabel = updatedAt ? moment(updatedAt).fromNow() : null;

    const teacher = typedResult?.teacher;
    const commitmentLines = Array.isArray(teacher?.commitments) ? [...(teacher?.commitments ?? [])] : [];
    const commitmentsText = commitmentLines.join('\n');
    const commitmentsLineCount = commitmentsText ? countLines(commitmentsText) : 0;
    const totalCommitmentsRaw = teacher?.commitmentTypes?.total;
    const totalCommitments = typeof totalCommitmentsRaw === 'number' ? Math.max(totalCommitmentsRaw, 0) : 0;
    const hasTeacherCommitments = totalCommitments > 0 || commitmentLines.length > 0;
    const samplesAdded = typeof typedResult?.samplesAdded === 'number' ? Math.max(typedResult.samplesAdded, 0) : null;
    const samplesLabel = samplesAdded && samplesAdded > 0 ? `${formatCountLabel(samplesAdded, 'example')} saved` : null;

    return {
        commitments: commitmentLines,
        commitmentsText,
        commitmentsLineCount,
        hasTeacherCommitments,
        samplesLabel,
        updatedLabel,
    };
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name, BUT maybe rename to `buildSelfLearningSummary`
 */
