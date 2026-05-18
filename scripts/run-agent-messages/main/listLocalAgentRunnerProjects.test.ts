import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { listLocalAgentRunnerProjects } from './listLocalAgentRunnerProjects';

/**
 * Creates one temporary root directory for local multi-agent project discovery tests.
 */
async function createTemporaryRootDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-multiple-'));
}

describe('listLocalAgentRunnerProjects', () => {
    let temporaryRootDirectory: string | undefined;

    afterEach(async () => {
        if (temporaryRootDirectory) {
            await rm(temporaryRootDirectory, { recursive: true, force: true });
            temporaryRootDirectory = undefined;
        }
    });

    it('lists only direct child directories that contain `agent.book`', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-a'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-b', 'nested-agent'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'plain-folder'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-b', 'nested-agent', 'agent.book'), 'Nested Agent', 'utf-8');

        const result = await listLocalAgentRunnerProjects(temporaryRootDirectory);

        expect(result).toEqual({
            projects: [
                {
                    directoryName: 'agent-a',
                    projectPath: join(temporaryRootDirectory, 'agent-a'),
                },
            ],
            ignoredProjects: [],
        });
    });

    it('filters ignored direct child agent repositories by repository-name pattern', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'John-agent'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-a'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'John-agent', 'agent.book'), 'John Agent', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');

        const result = await listLocalAgentRunnerProjects(temporaryRootDirectory, {
            ignorePattern: 'John*',
        });

        expect(result).toEqual({
            projects: [
                {
                    directoryName: 'agent-a',
                    projectPath: join(temporaryRootDirectory, 'agent-a'),
                },
            ],
            ignoredProjects: [
                {
                    directoryName: 'John-agent',
                    projectPath: join(temporaryRootDirectory, 'John-agent'),
                },
            ],
        });
    });
});
