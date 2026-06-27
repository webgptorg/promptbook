import { afterEach, describe, expect, it, jest } from '@jest/globals';
import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import { resolveCurrentUserIdentity } from '../currentUserIdentity';
import { extractAgentsImportBookEntries, importAgentsFromFiles, type AgentsImportFile } from './importAgentsFromFiles';

jest.mock('../../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('../../tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(),
}));

jest.mock('../currentUserIdentity', () => ({
    resolveCurrentUserIdentity: jest.fn(),
}));

/**
 * Mocked table-name resolver used by agents import tests.
 */
const getTableNameMock = $getTableName as jest.MockedFunction<typeof $getTableName>;

/**
 * Mocked Supabase provider used by agents import tests.
 */
const provideSupabaseForServerMock = $provideSupabaseForServer as jest.MockedFunction<typeof $provideSupabaseForServer>;

/**
 * Mocked agent collection provider used to verify conflict planning does not mutate.
 */
const provideAgentCollectionForServerMock = $provideAgentCollectionForServer as jest.MockedFunction<
    typeof $provideAgentCollectionForServer
>;

/**
 * Mocked current identity resolver used to verify conflict planning does not resolve write identity.
 */
const resolveCurrentUserIdentityMock = resolveCurrentUserIdentity as jest.MockedFunction<typeof resolveCurrentUserIdentity>;

/**
 * Encodes text as an import file.
 *
 * @param name - File name.
 * @param content - UTF-8 file content.
 * @returns Import file.
 */
function createTextImportFile(name: string, content: string): AgentsImportFile {
    return {
        name,
        content: new TextEncoder().encode(content),
    };
}

/**
 * Creates a ZIP import file.
 *
 * @param name - File name.
 * @param entries - ZIP entries keyed by path.
 * @returns Import file.
 */
async function createZipImportFile(name: string, entries: Record<string, string>): Promise<AgentsImportFile> {
    const zip = new JSZip();

    for (const [path, content] of Object.entries(entries)) {
        zip.file(path, content);
    }

    return {
        name,
        content: await zip.generateAsync({ type: 'uint8array' }),
    };
}

/**
 * Creates a minimal Supabase mock for duplicate conflict planning.
 *
 * @returns Supabase mock.
 */
function createConflictPlanningSupabaseMock() {
    const from = jest.fn(() => ({
        select: jest.fn(() => ({
            is: jest.fn(async () => ({
                data: [
                    {
                        agentName: 'helper',
                        agentSource: 'Helper\n\nPERSONA Existing assistant',
                    },
                ],
                error: null,
            })),
        })),
    }));

    return { from };
}

describe('agents import utilities', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('extracts individual and zipped book files while warning about non-book ZIP entries', async () => {
        const zipFile = await createZipImportFile('agents.zip', {
            'Team/Helper.book': 'Helper',
            'Team/readme.txt': 'This is ignored.',
        });
        const result = await extractAgentsImportBookEntries([
            createTextImportFile('Root.book', 'Root'),
            zipFile,
        ]);

        expect(result.entries.map((entry) => ({ path: entry.path, folderSegments: entry.folderSegments }))).toEqual([
            {
                path: 'Root.book',
                folderSegments: [],
            },
            {
                path: 'agents.zip/Team/Helper.book',
                folderSegments: ['Team'],
            },
        ]);
        expect(result.ignoredFileCount).toBe(1);
        expect(result.warnings).toEqual([
            {
                path: 'agents.zip/Team/readme.txt',
                message: 'ZIP entry was ignored because it is not a `.book` file.',
            },
        ]);
    });

    it('returns duplicate conflicts before creating agents', async () => {
        getTableNameMock.mockImplementation(async (tableName) => tableName);
        provideSupabaseForServerMock.mockReturnValue(createConflictPlanningSupabaseMock() as never);

        const result = await importAgentsFromFiles({
            files: [createTextImportFile('Helper.book', 'Helper\n\nPERSONA Imported assistant')],
            targetFolderId: null,
            conflictResolution: 'ASK',
        });

        expect(result.importedCount).toBe(0);
        expect(result.conflicts).toEqual([
            {
                agentName: 'helper',
                path: 'Helper.book',
                existingDifferentBookCount: 1,
            },
        ]);
        expect(provideAgentCollectionForServerMock).not.toHaveBeenCalled();
        expect(resolveCurrentUserIdentityMock).not.toHaveBeenCalled();
    });
});
