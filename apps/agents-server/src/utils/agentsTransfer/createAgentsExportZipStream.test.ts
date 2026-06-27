import { afterEach, describe, expect, it, jest } from '@jest/globals';
import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { getMetadata } from '../../database/getMetadata';
import { createAgentsExportFilenameStem, createAgentsExportZipStream } from './createAgentsExportZipStream';

jest.mock('../../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('../../database/getMetadata', () => ({
    getMetadata: jest.fn(),
}));

/**
 * Mocked table-name resolver used by agents export tests.
 */
const getTableNameMock = $getTableName as jest.MockedFunction<typeof $getTableName>;

/**
 * Mocked Supabase provider used by agents export tests.
 */
const provideSupabaseForServerMock = $provideSupabaseForServer as jest.MockedFunction<typeof $provideSupabaseForServer>;

/**
 * Mocked metadata loader used by agents export tests.
 */
const getMetadataMock = getMetadata as jest.MockedFunction<typeof getMetadata>;

/**
 * Consumes one Node stream into a buffer.
 *
 * @param stream - ZIP stream.
 * @returns Stream bytes.
 */
async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
    });
}

/**
 * Creates a minimal Supabase mock for agents export tests.
 *
 * @returns Supabase mock.
 */
function createSupabaseMock() {
    const from = jest.fn((tableName: string) => ({
        select: jest.fn(async () => {
            if (tableName === 'Agent') {
                return {
                    data: [
                        {
                            id: 1,
                            agentName: 'Helper',
                            agentSource: 'Helper',
                            folderId: 7,
                            sortOrder: 1,
                        },
                    ],
                    error: null,
                };
            }

            if (tableName === 'AgentFolder') {
                return {
                    data: [
                        {
                            id: 7,
                            name: 'Support',
                            parentId: null,
                            sortOrder: 1,
                        },
                    ],
                    error: null,
                };
            }

            return { data: [], error: null };
        }),
    }));

    return { from };
}

describe('createAgentsExportZipStream', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('exports books at the ZIP root and names the archive after the server', async () => {
        getMetadataMock.mockResolvedValue('My Server');
        getTableNameMock.mockImplementation(async (tableName) => tableName);
        provideSupabaseForServerMock.mockReturnValue(createSupabaseMock() as never);

        const { filename, stream } = await createAgentsExportZipStream();
        const zip = await JSZip.loadAsync(await readStreamToBuffer(stream));

        expect(filename).toBe('my-server.agents.zip');
        expect(await zip.file('Support/Helper.book')!.async('string')).toBe('Helper');
        expect(zip.file('my-server/Support/Helper.book')).toBeNull();
    });

    it('normalizes server names into safe filename stems', () => {
        expect(createAgentsExportFilenameStem('Promptbook Agents Server')).toBe('promptbook-agents-server');
        expect(createAgentsExportFilenameStem('  Žlutý server!  ')).toBe('zluty-server');
        expect(createAgentsExportFilenameStem('***')).toBe('promptbook-agents-server');
    });
});
