import { describe, expect, it } from '@jest/globals';
import { UNCERTAIN_USAGE } from '../execution/utils/usage-constants';
import type { AgentMessageRunReport } from './AgentMessageRunReport';
import {
    buildAgentMessageRunReportPath,
    normalizeAgentMessageRunReport,
    parseAgentMessageRunReport,
    serializeAgentMessageRunReport,
} from './AgentMessageRunReport';

describe('buildAgentMessageRunReportPath', () => {
    it('appends the report suffix to a relative message path', () => {
        expect(buildAgentMessageRunReportPath('messages/finished/2026-07-16-thread.book')).toBe(
            'messages/finished/2026-07-16-thread.book.report.json',
        );
    });
});

describe('serializeAgentMessageRunReport and parseAgentMessageRunReport', () => {
    it('round-trips one full report', () => {
        const report: AgentMessageRunReport = {
            version: 1,
            runnerName: 'codex',
            modelName: 'gpt-5.2-codex',
            loginMethod: 'chatgpt',
            usage: UNCERTAIN_USAGE,
            executionTiming: {
                startedAt: '2026-08-15T09:30:00.000Z',
                finishedAt: '2026-08-15T09:31:57.000Z',
            },
            touchedProjectNames: ['my-website'],
            touchedExternalSources: [
                { kind: 'integration', name: 'Gmail' },
                { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/pricing' },
            ],
        };

        expect(parseAgentMessageRunReport(serializeAgentMessageRunReport(report))).toEqual(report);
    });

    it('round-trips one minimal report without optional fields', () => {
        const report: AgentMessageRunReport = {
            version: 1,
            runnerName: 'claude-code',
            usage: UNCERTAIN_USAGE,
        };

        expect(parseAgentMessageRunReport(serializeAgentMessageRunReport(report))).toEqual(report);
    });

    it('returns null for invalid JSON', () => {
        expect(parseAgentMessageRunReport('not a json')).toBe(null);
    });
});

describe('normalizeAgentMessageRunReport', () => {
    it('rejects non-object values', () => {
        expect(normalizeAgentMessageRunReport(null)).toBe(null);
        expect(normalizeAgentMessageRunReport('report')).toBe(null);
        expect(normalizeAgentMessageRunReport([])).toBe(null);
    });

    it('rejects unsupported versions', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 2,
                runnerName: 'codex',
                usage: UNCERTAIN_USAGE,
            }),
        ).toBe(null);
    });

    it('rejects missing runner names', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 1,
                runnerName: '',
                usage: UNCERTAIN_USAGE,
            }),
        ).toBe(null);
    });

    it('rejects unknown login methods', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 1,
                runnerName: 'codex',
                loginMethod: 'oauth',
                usage: UNCERTAIN_USAGE,
            }),
        ).toBe(null);
    });

    it('rejects reports without usage', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 1,
                runnerName: 'codex',
            }),
        ).toBe(null);
    });

    it('rejects an execution interval whose finish precedes its start', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 1,
                runnerName: 'codex',
                usage: UNCERTAIN_USAGE,
                executionTiming: {
                    startedAt: '2026-08-15T09:31:57.000Z',
                    finishedAt: '2026-08-15T09:30:00.000Z',
                },
            }),
        ).toBe(null);
    });

    it('rejects touched external sources of an unknown category', () => {
        expect(
            normalizeAgentMessageRunReport({
                version: 1,
                runnerName: 'codex',
                usage: UNCERTAIN_USAGE,
                touchedExternalSources: [{ kind: 'database', name: 'Postgres' }],
            }),
        ).toBe(null);
    });

    it('accepts one valid report', () => {
        const report = {
            version: 1,
            runnerName: 'codex',
            loginMethod: 'api',
            usage: UNCERTAIN_USAGE,
        };

        expect(normalizeAgentMessageRunReport(report)).toEqual(report);
    });
});
