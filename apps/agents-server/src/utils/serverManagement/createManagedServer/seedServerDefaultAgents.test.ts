import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { access, readFile, readdir } from 'node:fs/promises';
import { createSqlRecorder } from './createSqlRecorder';
import { seedServerDefaultAgents } from './seedServerDefaultAgents';

jest.mock('node:fs/promises', () => ({
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
}));

const accessMock = access as jest.MockedFunction<typeof access>;
const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
const readdirMock = readdir as jest.MockedFunction<typeof readdir>;

describe('seedServerDefaultAgents', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('loads sorted default books and stores them as seeded agents', async () => {
        accessMock.mockImplementation(async () => undefined);
        readdirMock.mockImplementation(async () => ['zeta.book', 'ignore.txt', 'alpha.book'] as never);
        readFileMock.mockImplementation(async (...args: Parameters<typeof readFile>) => {
            const filePath = String(args[0]);

            if (filePath.endsWith('alpha.book')) {
                return 'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n' as never;
            }

            if (filePath.endsWith('zeta.book')) {
                return 'Zeta Agent\n\nPERSONA You answer zeta questions.\nCLOSED\n' as never;
            }

            throw new Error(`Unexpected file: ${filePath}`);
        });

        const query = jest.fn<(sql: string, parameters?: ReadonlyArray<unknown>) => Promise<{ rows: unknown[] }>>(
            async () => ({ rows: [] }),
        );
        const sqlRecorder = createSqlRecorder('acme-support');

        await seedServerDefaultAgents(
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
            },
            sqlRecorder,
        );

        expect(query).toHaveBeenCalledTimes(4);

        const firstAgentInsertParameters = query.mock.calls[0]![1] || [];
        const firstHistoryInsertParameters = query.mock.calls[1]![1] || [];
        const secondAgentInsertParameters = query.mock.calls[2]![1] || [];

        expect(firstAgentInsertParameters[0]).toBe('alpha-agent');
        expect(firstAgentInsertParameters[10]).toBe(0);
        expect(firstHistoryInsertParameters[1]).toBe('alpha-agent');
        expect(firstHistoryInsertParameters[2]).toBe(firstAgentInsertParameters[3]);
        expect(secondAgentInsertParameters[0]).toBe('zeta-agent');
        expect(secondAgentInsertParameters[10]).toBe(1);
        expect(sqlRecorder.render()).toContain('Alpha Agent');
        expect(sqlRecorder.render()).toContain('Zeta Agent');
    });
});
