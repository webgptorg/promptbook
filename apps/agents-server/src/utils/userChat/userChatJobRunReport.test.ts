import { UNCERTAIN_USAGE } from '../../../../../src/execution/utils/usage-constants';
import type { AgentMessageRunReport } from '../../../../../src/book-3.0/AgentMessageRunReport';
import {
    getUserChatJobRunReportFromParameters,
    resolveUserChatJobExecutionTiming,
    USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY,
    withUserChatJobRunReport,
} from './userChatJobRunReport';

describe('userChatJobRunReport', () => {
    const report: AgentMessageRunReport = {
        version: 1,
        runnerName: 'codex',
        modelName: 'gpt-5.2-codex',
        loginMethod: 'chatgpt',
        usage: UNCERTAIN_USAGE,
    };

    it('stores and reads the run report through the job parameters', () => {
        const parameters = withUserChatJobRunReport({ existingKey: 'existing value' }, report);

        expect(parameters.existingKey).toBe('existing value');
        expect(parameters[USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY]).toEqual(report);
        expect(getUserChatJobRunReportFromParameters(parameters)).toEqual(report);
    });

    it('reads the run report from serialized JSON parameters', () => {
        const parameters = withUserChatJobRunReport({}, report);

        expect(getUserChatJobRunReportFromParameters(JSON.stringify(parameters))).toEqual(report);
    });

    it('returns null for parameters without a valid report', () => {
        expect(getUserChatJobRunReportFromParameters(null)).toBe(null);
        expect(getUserChatJobRunReportFromParameters(undefined)).toBe(null);
        expect(getUserChatJobRunReportFromParameters('not a json')).toBe(null);
        expect(getUserChatJobRunReportFromParameters({})).toBe(null);
        expect(
            getUserChatJobRunReportFromParameters({
                [USER_CHAT_JOB_RUN_REPORT_PARAMETERS_KEY]: { version: 999 },
            }),
        ).toBe(null);
    });

    it('uses runner execution timestamps instead of queued-job age', () => {
        expect(
            resolveUserChatJobExecutionTiming({
                ...report,
                executionTiming: {
                    startedAt: '2026-08-15T09:30:00.000Z',
                    finishedAt: '2026-08-15T09:31:57.500Z',
                },
            }),
        ).toEqual({
            executedAt: '2026-08-15T09:31:57.500Z',
            generationDurationMs: 117_500,
        });
    });

    it('returns null when an older runner report has no execution timestamps', () => {
        expect(resolveUserChatJobExecutionTiming(report)).toBe(null);
    });
});
