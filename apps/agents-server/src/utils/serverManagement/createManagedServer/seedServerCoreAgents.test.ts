import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { access, readFile, readdir } from 'node:fs/promises';
import { createSqlRecorder } from './createSqlRecorder';
import { seedServerCoreAgents } from './seedServerCoreAgents';

jest.mock('node:fs/promises', () => ({
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
}));

const accessMock = access as jest.MockedFunction<typeof access>;
const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
const readdirMock = readdir as jest.MockedFunction<typeof readdir>;

describe('seedServerCoreAgents', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('stores core agents with visibility from META VISIBILITY', async () => {
        accessMock.mockImplementation(async () => undefined);
        readdirMock.mockImplementation(async () => ['teacher.book'] as never);
        readFileMock.mockImplementation(async (...args: Parameters<typeof readFile>) => {
            const filePath = String(args[0]);

            if (filePath.endsWith('teacher.book')) {
                return 'Teacher\nMETA VISIBILITY PUBLIC\n\nPERSONA You teach clearly.\nCLOSED\n' as never;
            }

            throw new Error(`Unexpected file: ${filePath}`);
        });

        const query = jest.fn<(sql: string, parameters?: ReadonlyArray<unknown>) => Promise<{ rows: unknown[] }>>(
            async () => ({ rows: [{ id: 42 }] }),
        );
        const sqlRecorder = createSqlRecorder('acme-support');

        await seedServerCoreAgents(
            { query } as never,
            {
                name: 'Acme Support',
                identifier: 'acme-support',
                environment: 'PREVIEW',
                domain: 'acme-support.ptbk.io',
                tablePrefix: 'server_AcmeSupport_',
                iconUrl: null,
                users: [],
                metadataEntries: [],
                isDefaultAgentsInstalled: true,
            },
            sqlRecorder,
        );

        expect(query).toHaveBeenCalledTimes(3);

        const folderInsertParameters = query.mock.calls[0]![1] || [];
        const agentInsertParameters = query.mock.calls[1]![1] || [];
        const historyInsertParameters = query.mock.calls[2]![1] || [];

        expect(folderInsertParameters[0]).toBe('.core');
        expect(agentInsertParameters[0]).toBe('teacher');
        expect(agentInsertParameters[9]).toBe(42);
        expect(agentInsertParameters[10]).toBe(0);
        expect(agentInsertParameters[11]).toBe('PUBLIC');
        expect(historyInsertParameters[1]).toBe('teacher');
        expect(historyInsertParameters[2]).toBe(agentInsertParameters[3]);
        expect(sqlRecorder.render()).toContain('Teacher');
        expect(sqlRecorder.render()).toContain('META VISIBILITY PUBLIC');
    });
});
