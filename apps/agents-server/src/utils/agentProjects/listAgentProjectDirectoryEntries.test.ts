import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import { listAgentProjectDirectoryEntries } from './listAgentProjectDirectoryEntries';

jest.mock('../localChatRunner/ensureLocalAgentFolder', () => ({
    resolveLocalAgentRootPath: jest.fn(),
    createLocalAgentDirectoryName: (agentPermanentId: string) => `agent-${agentPermanentId}`,
}));

/**
 * Mocked local-agent root resolver.
 */
const resolveLocalAgentRootPathMock = resolveLocalAgentRootPath as jest.MockedFunction<
    typeof resolveLocalAgentRootPath
>;

describe('listAgentProjectDirectoryEntries', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-listing-'));
        resolveLocalAgentRootPathMock.mockReturnValue(temporaryDirectory);
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        jest.clearAllMocks();
    });

    it('lists only direct entries in the selected project folder', async () => {
        const projectPath = join(temporaryDirectory!, 'agent-abc123', 'projects', 'website');
        await mkdir(join(projectPath, 'src', 'components'), { recursive: true });
        await mkdir(join(projectPath, '.git'), { recursive: true });
        await writeFile(join(projectPath, 'README.md'), '# Website', 'utf-8');
        await writeFile(join(projectPath, 'src', 'index.ts'), 'export {};\n', 'utf-8');
        await writeFile(join(projectPath, 'src', 'components', 'Button.tsx'), 'export function Button() {}\n', 'utf-8');

        await expect(
            listAgentProjectDirectoryEntries({
                agentPermanentId: 'abc123',
                projectName: 'website',
                directoryPathSegments: [],
            }),
        ).resolves.toMatchObject({
            directoryPathSegments: [],
            directoryRelativePath: '',
            entries: [
                { name: 'src', relativePath: 'src', kind: 'directory', sizeBytes: null },
                { name: 'README.md', relativePath: 'README.md', kind: 'file' },
            ],
        });
    });

    it('lists entries inside a nested folder without recursively including deeper files', async () => {
        const projectPath = join(temporaryDirectory!, 'agent-abc123', 'projects', 'website');
        await mkdir(join(projectPath, 'src', 'components'), { recursive: true });
        await writeFile(join(projectPath, 'src', 'index.ts'), 'export {};\n', 'utf-8');
        await writeFile(join(projectPath, 'src', 'components', 'Button.tsx'), 'export function Button() {}\n', 'utf-8');

        const listing = await listAgentProjectDirectoryEntries({
            agentPermanentId: 'abc123',
            projectName: 'website',
            directoryPathSegments: ['src'],
        });

        expect(listing.entries.map((entry) => entry.relativePath)).toEqual(['src/components', 'src/index.ts']);
    });
});
