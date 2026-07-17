import { UNCERTAIN_USAGE } from '../../../../../src/execution/utils/usage-constants';
import type { AgentMessageRunReport } from '../../../../../src/book-3.0/AgentMessageRunReport';
import {
    getUserChatJobRunReportFromParameters,
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
});
