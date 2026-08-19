import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

jest.mock('../defaultAgents/resolveDefaultAgentsStatus', () => ({
    resolveDefaultAgentsStatus: jest.fn(),
}));

import {
    resolveDefaultAgentsStatus,
    type CoreAgentReport,
    type DefaultAgentsStatus,
} from '../defaultAgents/resolveDefaultAgentsStatus';
import type { MissingAgentReference } from './createUnresolvedAgentReferenceDiagnostics';
import { resolveCoreAgentAwareMissingReferences } from './resolveCoreAgentAwareMissingReferences';

/**
 * Mocked bundled-agent status of the current server.
 */
const mockResolveDefaultAgentsStatus = jest.mocked(resolveDefaultAgentsStatus);

/**
 * Builds one core agent report fixture.
 *
 * @param agentName - Normalized name of the bundled core agent.
 * @param title - Human-readable title of the bundled core agent.
 * @param isPresent - Whether the core agent exists on the server.
 * @returns Core agent report fixture.
 */
function createCoreAgentReport(agentName: string, title: string, isPresent: boolean): CoreAgentReport {
    return {
        agentName,
        title,
        expectedAgentHash: `${agentName}-hash`,
        explanation: `Why ${title} exists.`,
        isPresent,
        isDifferentFromRepository: false,
        permanentId: isPresent ? `${agentName}-1` : null,
    };
}

/**
 * Makes the mocked status report the given core agents.
 *
 * @param coreAgents - Core agent reports the server should have.
 */
function mockCoreAgents(coreAgents: ReadonlyArray<CoreAgentReport>): void {
    mockResolveDefaultAgentsStatus.mockResolvedValue({
        coreAgents,
        defaultAgents: [],
        isAnyCoreAgentMissing: coreAgents.some((coreAgent) => !coreAgent.isPresent),
        isAnyDefaultAgentMissing: false,
    } satisfies DefaultAgentsStatus);
}

/**
 * Book that relies on the implicit `FROM @Adam` inheritance.
 */
const BOOK_WITHOUT_FROM = spaceTrim(`
    Generic chatter

    GOAL Keep your projects up to date
    CLOSED
`) as string_book;

describe('resolveCoreAgentAwareMissingReferences', () => {
    beforeEach(() => {
        mockResolveDefaultAgentsStatus.mockReset();
        mockCoreAgents([
            createCoreAgentReport('adam', 'Adam', false),
            createCoreAgentReport('teacher', 'Teacher', false),
        ]);
    });

    it('surfaces the implicitly inherited Adam ancestor when the core agent is missing', async () => {
        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource: BOOK_WITHOUT_FROM,
            missingAgentReferences: [],
            isReinstateAllowed: true,
        });

        expect(missingAgentReferences).toHaveLength(1);
        expect(missingAgentReferences[0]).toMatchObject({
            reference: 'Adam',
            token: '{Adam}',
            commitmentType: 'FROM',
            isImplicit: true,
        });
        expect(missingAgentReferences[0]!.coreAgentRecovery).toEqual({
            missingCoreAgentTitles: ['Adam', 'Teacher'],
            isReinstateAllowed: true,
        });
    });

    it('hides the reinstate action from users who are not allowed to reinstate', async () => {
        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource: BOOK_WITHOUT_FROM,
            missingAgentReferences: [],
            isReinstateAllowed: false,
        });

        expect(missingAgentReferences[0]!.coreAgentRecovery).toMatchObject({ isReinstateAllowed: false });
    });

    it('reports nothing when Adam is present on the server', async () => {
        mockCoreAgents([createCoreAgentReport('adam', 'Adam', true), createCoreAgentReport('teacher', 'Teacher', true)]);

        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource: BOOK_WITHOUT_FROM,
            missingAgentReferences: [],
            isReinstateAllowed: true,
        });

        expect(missingAgentReferences).toEqual([]);
    });

    it('reports nothing when the book explicitly opts out of inheritance', async () => {
        const agentSource = spaceTrim(`
            Generic chatter

            FROM @Null
            GOAL Keep your projects up to date
            CLOSED
        `) as string_book;

        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource,
            missingAgentReferences: [],
            isReinstateAllowed: true,
        });

        expect(missingAgentReferences).toEqual([]);
        expect(mockResolveDefaultAgentsStatus).not.toHaveBeenCalled();
    });

    it('offers reinstatement instead of creation for an explicitly referenced core agent', async () => {
        const agentSource = spaceTrim(`
            Generic chatter

            FROM {Adam}
            GOAL Keep your projects up to date
            CLOSED
        `) as string_book;
        const explicitMissingAdamReference: MissingAgentReference = {
            reference: 'Adam',
            token: '{Adam}',
            commitmentType: 'FROM',
        };

        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource,
            missingAgentReferences: [explicitMissingAdamReference],
            isReinstateAllowed: true,
        });

        expect(missingAgentReferences).toHaveLength(1);
        expect(missingAgentReferences[0]).toMatchObject({
            reference: 'Adam',
            token: '{Adam}',
            commitmentType: 'FROM',
        });
        expect(missingAgentReferences[0]!.isImplicit).toBeUndefined();
        expect(missingAgentReferences[0]!.coreAgentRecovery).toBeDefined();
    });

    it('keeps an ordinary missing reference creatable and still reports the implicit Adam ancestor', async () => {
        const agentSource = spaceTrim(`
            Generic chatter

            TEAM {Financial advisor}
            GOAL Keep your projects up to date
            CLOSED
        `) as string_book;
        const missingTeammateReference: MissingAgentReference = {
            reference: 'Financial advisor',
            token: '{Financial advisor}',
            commitmentType: 'TEAM',
        };

        const missingAgentReferences = await resolveCoreAgentAwareMissingReferences({
            agentSource,
            missingAgentReferences: [missingTeammateReference],
            isReinstateAllowed: true,
        });

        expect(missingAgentReferences).toHaveLength(2);
        expect(missingAgentReferences[0]).toMatchObject({ reference: 'Adam', isImplicit: true });
        expect(missingAgentReferences[1]).toEqual(missingTeammateReference);
    });
});
