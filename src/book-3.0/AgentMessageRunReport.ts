// Note: [💞] Ignore a discrepancy between file name and entity name

import type { Usage } from '../execution/Usage';
import type { CodexLoginMethod } from './codexLoginMethod';

/**
 * File suffix appended to one answered message book to store its run report sidecar.
 *
 * For example `messages/finished/2026-07-16-thread.book` is reported in
 * `messages/finished/2026-07-16-thread.book.report.json`.
 *
 * @private internal constant of the agent folder convention
 */
export const AGENT_MESSAGE_RUN_REPORT_FILE_SUFFIX = '.report.json';

/**
 * Exact wall-clock interval during which one harness processed an agent message.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private internal type of the agent folder convention
 */
export type AgentMessageRunExecutionTiming = {
    /**
     * ISO 8601 timestamp captured immediately before the harness begins the message.
     */
    readonly startedAt: string;

    /**
     * ISO 8601 timestamp captured when the harness finishes the message.
     */
    readonly finishedAt: string;
};

/**
 * Report describing how one queued agent message was answered by a CLI harness runner.
 *
 * The agent runner writes it next to the answered message book so consumers
 * (for example the Agents Server task details) can show which runner, authentication
 * method and usage one answer cost without re-parsing the runner output.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private internal type of the agent folder convention
 */
export type AgentMessageRunReport = {
    /**
     * Report schema version for forward compatibility.
     */
    readonly version: 1;

    /**
     * Name of the harness runner which answered the message, for example `codex` or `claude-code`.
     */
    readonly runnerName: string;

    /**
     * Model identifier used by the runner, when known.
     */
    readonly modelName?: string;

    /**
     * Authentication method the runner used, when it can be determined.
     *
     * Currently only the OpenAI Codex runner reports this (its ChatGPT account vs. `OPENAI_API_KEY`);
     * other runners leave it `undefined`.
     */
    readonly loginMethod?: CodexLoginMethod;

    /**
     * Usage statistics of the run (price, token counts, duration).
     */
    readonly usage: Usage;

    /**
     * Measured wall-clock timing of the actual harness execution, excluding time spent waiting in the queue.
     */
    readonly executionTiming?: AgentMessageRunExecutionTiming;

    /**
     * Directory names of the agent projects the harness worked with while answering the message.
     *
     * Reported by the runner from its live runtime log, which is deleted once the message is
     * answered, so this is the only trace of the projects one answer viewed or edited.
     */
    readonly touchedProjectNames?: ReadonlyArray<string>;
};

/**
 * Builds the run-report sidecar path for one message book path.
 *
 * Works for absolute and relative paths because the suffix is simply appended.
 *
 * @private internal utility of the agent folder convention
 */
export function buildAgentMessageRunReportPath(messageFilePath: string): string {
    return `${messageFilePath}${AGENT_MESSAGE_RUN_REPORT_FILE_SUFFIX}`;
}

/**
 * Serializes one run report into the stable JSON format persisted next to the answered message book.
 *
 * @private internal utility of the agent folder convention
 */
export function serializeAgentMessageRunReport(report: AgentMessageRunReport): string {
    return `${JSON.stringify(report, null, 4)}\n`;
}

/**
 * Validates one already-parsed JSON value as a run report.
 *
 * @returns The typed report, or `null` when the value does not match the expected shape,
 * so consumers can silently skip malformed or foreign sidecar files.
 *
 * @private internal utility of the agent folder convention
 */
export function normalizeAgentMessageRunReport(value: unknown): AgentMessageRunReport | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const report = value as Record<string, unknown>;

    if (report.version !== 1 || typeof report.runnerName !== 'string' || report.runnerName.length === 0) {
        return null;
    }

    if (report.modelName !== undefined && typeof report.modelName !== 'string') {
        return null;
    }

    if (
        report.loginMethod !== undefined &&
        report.loginMethod !== 'chatgpt' &&
        report.loginMethod !== 'api' &&
        report.loginMethod !== 'unknown'
    ) {
        return null;
    }

    if (!isSerializedUsage(report.usage)) {
        return null;
    }

    if (report.executionTiming !== undefined && !isSerializedAgentMessageRunExecutionTiming(report.executionTiming)) {
        return null;
    }

    if (report.touchedProjectNames !== undefined && !isSerializedProjectNameList(report.touchedProjectNames)) {
        return null;
    }

    return report as AgentMessageRunReport;
}

/**
 * Checks that one value structurally matches a list of project directory names.
 *
 * @private internal helper of `normalizeAgentMessageRunReport`
 */
function isSerializedProjectNameList(value: unknown): value is ReadonlyArray<string> {
    return Array.isArray(value) && value.every((projectName) => typeof projectName === 'string');
}

/**
 * Checks that one value contains a valid, non-negative agent-message execution interval.
 *
 * @private internal helper of `normalizeAgentMessageRunReport`
 */
function isSerializedAgentMessageRunExecutionTiming(value: unknown): value is AgentMessageRunExecutionTiming {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const executionTiming = value as Record<string, unknown>;
    if (!isSerializedIsoTimestamp(executionTiming.startedAt) || !isSerializedIsoTimestamp(executionTiming.finishedAt)) {
        return false;
    }

    return Date.parse(executionTiming.finishedAt) >= Date.parse(executionTiming.startedAt);
}

/**
 * Checks that one JSON value is a parseable ISO timestamp.
 *
 * @private internal helper of `normalizeAgentMessageRunReport`
 */
function isSerializedIsoTimestamp(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

/**
 * Parses one run-report sidecar file content.
 *
 * @returns The typed report, or `null` when the content is not valid JSON or does not match the expected shape.
 *
 * @private internal utility of the agent folder convention
 */
export function parseAgentMessageRunReport(reportFileContent: string): AgentMessageRunReport | null {
    try {
        return normalizeAgentMessageRunReport(JSON.parse(reportFileContent));
    } catch {
        return null;
    }
}

/**
 * Checks that one value structurally matches the serialized `Usage` shape.
 *
 * @private internal helper of `normalizeAgentMessageRunReport`
 */
function isSerializedUsage(value: unknown): value is Usage {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const usage = value as Record<string, unknown>;
    return (
        isSerializedUncertainNumber(usage.price) &&
        isSerializedUncertainNumber(usage.duration) &&
        typeof usage.input === 'object' &&
        usage.input !== null &&
        typeof usage.output === 'object' &&
        usage.output !== null
    );
}

/**
 * Checks that one value structurally matches the serialized `UncertainNumber` shape.
 *
 * @private internal helper of `normalizeAgentMessageRunReport`
 */
function isSerializedUncertainNumber(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { value?: unknown }).value === 'number' &&
        Number.isFinite((value as { value: number }).value)
    );
}
