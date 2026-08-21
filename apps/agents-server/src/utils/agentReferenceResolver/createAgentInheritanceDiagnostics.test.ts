import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { string_agent_permanent_id, string_book } from '../../../../../src/_packages/types.index';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import { createAgentInheritanceDiagnostics } from './createAgentInheritanceDiagnostics';

/**
 * Origin used by the local inheritance graph fixtures.
 */
const LOCAL_SERVER_URL = 'https://local.example';

/**
 * One local source record used by the inheritance diagnostics collection mock.
 */
type LocalAgentRecord = {
    readonly agentName: string;
    readonly permanentId: string;
    readonly agentSource: string_book;
};

/**
 * Makes a Book source fixture without coupling these editor tests to persistence formatting.
 *
 * @param source - Indented Book source fixture.
 * @returns Trimmed Book source.
 */
function createBook(source: string): string_book {
    return spaceTrim(source) as string_book;
}

/**
 * Builds the smallest collection implementation required by the local resolver and source loader.
 *
 * @param agentRecords - Agents visible to the current server.
 * @returns Collection mock with case-insensitive name and permanent-id lookups.
 */
function createMockAgentCollection(agentRecords: ReadonlyArray<LocalAgentRecord>): AgentCollection {
    const findAgentRecord = (agentIdentifier: string): LocalAgentRecord => {
        const normalizedIdentifier = agentIdentifier.toLowerCase();
        const agentRecord = agentRecords.find(
            (candidate) =>
                candidate.agentName.toLowerCase() === normalizedIdentifier ||
                candidate.permanentId.toLowerCase() === normalizedIdentifier,
        );

        if (!agentRecord) {
            throw new Error(`Agent "${agentIdentifier}" was not found in the diagnostics fixture.`);
        }

        return agentRecord;
    };

    return {
        async listAgents() {
            return agentRecords.map(
                (agentRecord) =>
                    ({
                        agentName: agentRecord.agentName,
                        permanentId: agentRecord.permanentId,
                        agentHash: `test-${agentRecord.permanentId}`,
                        personaDescription: null,
                        initialMessage: null,
                        links: [],
                        capabilities: [],
                        samples: [],
                        knowledgeSources: [],
                        parameters: [],
                        meta: {},
                    } satisfies AgentBasicInformation),
            );
        },
        async getAgentPermanentId(agentIdentifier: string) {
            return findAgentRecord(agentIdentifier).permanentId as string_agent_permanent_id;
        },
        async getAgentSource(agentIdentifier: string) {
            return findAgentRecord(agentIdentifier).agentSource;
        },
    } as unknown as AgentCollection;
}

/**
 * Resolves diagnostics for the supplied unsaved Book source as the named fixture agent.
 *
 * @param agentSource - Source currently typed in the editor.
 * @param agentPermanentId - Stable id of the edited agent.
 * @param agentRecords - Persisted local source fixtures.
 * @returns Book editor inheritance diagnostics.
 */
async function resolveDiagnostics(
    agentSource: string_book,
    agentPermanentId: string,
    agentRecords: ReadonlyArray<LocalAgentRecord>,
) {
    return createAgentInheritanceDiagnostics({
        agentSource,
        agentPermanentId: agentPermanentId as string_agent_permanent_id,
        collection: createMockAgentCollection(agentRecords),
        localServerUrl: LOCAL_SERVER_URL,
    });
}

describe('createAgentInheritanceDiagnostics', () => {
    it('warns when an unsaved effective FROM closes a local inheritance cycle', async () => {
        const currentAgentSource = createBook(`
            Agent A

            FROM {Agent B}
            RULE Current unsaved source of A.
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'agent-a',
                permanentId: 'agent-a-id',
                agentSource: createBook(`
                    Agent A

                    FROM @Null
                `),
            },
            {
                agentName: 'agent-b',
                permanentId: 'agent-b-id',
                agentSource: createBook(`
                    Agent B

                    FROM {Agent A}
                `),
            },
        ];

        await expect(resolveDiagnostics(currentAgentSource, 'agent-a-id', persistedAgentRecords)).resolves.toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                startColumn: 1,
                endLineNumber: 3,
                endColumn: 5,
                severity: 'warning',
                source: 'agent-inheritance',
                message: expect.stringContaining(
                    'Cyclic `FROM` inheritance detected: `Agent A` → `Agent B` → `Agent A`',
                ),
            }),
        ]);
    });

    it('reports a cycle reached through a parent chain on the current effective FROM line', async () => {
        const currentAgentSource = createBook(`
            Agent A

            FROM {Agent B}
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'agent-a',
                permanentId: 'agent-a-id',
                agentSource: currentAgentSource,
            },
            {
                agentName: 'agent-b',
                permanentId: 'agent-b-id',
                agentSource: createBook(`
                    Agent B

                    FROM {Agent C}
                `),
            },
            {
                agentName: 'agent-c',
                permanentId: 'agent-c-id',
                agentSource: createBook(`
                    Agent C

                    FROM {Agent B}
                `),
            },
        ];

        const diagnostics = await resolveDiagnostics(currentAgentSource, 'agent-a-id', persistedAgentRecords);

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({
            startLineNumber: 3,
            severity: 'warning',
            message: expect.stringContaining('`Agent B` → `Agent C` → `Agent B`'),
        });
    });

    it('does not warn for a valid explicit parent chain ending in Null', async () => {
        const currentAgentSource = createBook(`
            Agent A

            FROM {Agent B}
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'agent-a',
                permanentId: 'agent-a-id',
                agentSource: currentAgentSource,
            },
            {
                agentName: 'agent-b',
                permanentId: 'agent-b-id',
                agentSource: createBook(`
                    Agent B

                    FROM {Agent C}
                `),
            },
            {
                agentName: 'agent-c',
                permanentId: 'agent-c-id',
                agentSource: createBook(`
                    Agent C

                    FROM @Void
                `),
            },
        ];

        await expect(resolveDiagnostics(currentAgentSource, 'agent-a-id', persistedAgentRecords)).resolves.toEqual([]);
    });

    it('uses only the last FROM when validating Adam', async () => {
        const adamSource = createBook(`
            Adam

            FROM {Other Agent}
            FROM {null}
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'adam',
                permanentId: 'adam-id',
                agentSource: adamSource,
            },
            {
                agentName: 'other-agent',
                permanentId: 'other-agent-id',
                agentSource: createBook(`
                    Other Agent

                    FROM @Null
                `),
            },
        ];

        await expect(resolveDiagnostics(adamSource, 'adam-id', persistedAgentRecords)).resolves.toEqual([]);
    });

    it('warns when Adam has no explicit Null or Void parent', async () => {
        const adamSource = createBook(`
            Adam

            FROM {Other Agent}
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'adam',
                permanentId: 'adam-id',
                agentSource: adamSource,
            },
            {
                agentName: 'other-agent',
                permanentId: 'other-agent-id',
                agentSource: createBook(`
                    Other Agent

                    FROM @Null
                `),
            },
        ];

        await expect(resolveDiagnostics(adamSource, 'adam-id', persistedAgentRecords)).resolves.toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                severity: 'warning',
                message: expect.stringContaining('core `Adam` agent must explicitly use `FROM @Null`'),
            }),
        ]);
    });

    it('warns on Adam title when its source omits FROM entirely', async () => {
        const adamSource = createBook(`
            Adam

            RULE Root rule.
        `);
        const persistedAgentRecords: ReadonlyArray<LocalAgentRecord> = [
            {
                agentName: 'adam',
                permanentId: 'adam-id',
                agentSource: adamSource,
            },
        ];

        await expect(resolveDiagnostics(adamSource, 'adam-id', persistedAgentRecords)).resolves.toEqual([
            expect.objectContaining({
                startLineNumber: 1,
                severity: 'warning',
                message: expect.stringContaining('core `Adam` agent must explicitly use `FROM @Null`'),
            }),
        ]);
    });
});
