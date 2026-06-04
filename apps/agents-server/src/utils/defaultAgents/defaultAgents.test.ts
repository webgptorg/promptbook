import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AgentCollection, string_book } from '@promptbook-local/types';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { DEFAULT_AGENT_VISIBILITY } from '../agentVisibility';
import { installDefaultAgentsFromDirectory, listDefaultAgentBookFileNames } from './defaultAgents';

/**
 * Creates an isolated temporary default-agent directory for one test.
 *
 * @returns Temporary directory path.
 */
async function createTemporaryDefaultAgentsDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-default-agents-'));
}

/**
 * Creates a minimal collection mock for default-agent installation tests.
 *
 * @param existingAgentNames - Active agent names returned from `listAgents`.
 * @returns Mocked collection and its create spy.
 */
function createMockAgentCollection(existingAgentNames: ReadonlyArray<string> = []): {
    readonly collection: AgentCollection;
    readonly createAgentMock: jest.Mock;
} {
    const createAgentMock = jest.fn(async (agentSource: string_book) => ({
        ...parseAgentSource(agentSource),
        permanentId: `id-${parseAgentSource(agentSource).agentName}`,
    }));

    return {
        collection: {
            listAgents: jest.fn(async () => existingAgentNames.map((agentName) => ({ agentName }))),
            createAgent: createAgentMock,
        } as unknown as AgentCollection,
        createAgentMock,
    };
}

describe('default Agents Server agents', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await createTemporaryDefaultAgentsDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { force: true, recursive: true });
    });

    it('lists only book files in stable order', async () => {
        await writeFile(join(temporaryDirectoryPath, 'zeta.book'), 'Zeta\nPERSONA Last.', 'utf-8');
        await writeFile(join(temporaryDirectoryPath, 'alpha.book'), 'Alpha\nPERSONA First.', 'utf-8');
        await writeFile(join(temporaryDirectoryPath, '_prompt.md'), 'ignored', 'utf-8');

        await expect(listDefaultAgentBookFileNames(temporaryDirectoryPath)).resolves.toEqual([
            'alpha.book',
            'zeta.book',
        ]);
    });

    it('creates missing default agents and skips active agents with the same parsed name', async () => {
        await writeFile(join(temporaryDirectoryPath, 'alpha.book'), 'Alpha\nPERSONA Existing.', 'utf-8');
        await writeFile(join(temporaryDirectoryPath, 'bravo.book'), 'Bravo\nPERSONA New.', 'utf-8');
        const { collection, createAgentMock } = createMockAgentCollection(['alpha']);

        const result = await installDefaultAgentsFromDirectory({
            collection,
            defaultAgentsDirectoryPath: temporaryDirectoryPath,
        });

        expect(createAgentMock).toHaveBeenCalledTimes(1);
        expect(createAgentMock).toHaveBeenCalledWith(expect.stringContaining('Bravo'), {
            sortOrder: 2,
            visibility: DEFAULT_AGENT_VISIBILITY,
        });
        expect(result).toMatchObject({
            installedCount: 1,
            skippedCount: 1,
            records: [
                {
                    agentName: 'alpha',
                    fileName: 'alpha.book',
                    status: 'skipped',
                },
                {
                    agentName: 'bravo',
                    fileName: 'bravo.book',
                    permanentId: 'id-bravo',
                    status: 'installed',
                },
            ],
        });
    });
});
