import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';
import { resolveTouchedAgentProjects } from './resolveTouchedAgentProjects';

describe('resolveTouchedAgentProjects', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('reports the existing projects named by the harness tool calls', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-touched-projects-'));
        await mkdir(join(temporaryDirectory, AGENT_PROJECTS_DIRECTORY_PATH, 'my-website'), { recursive: true });
        await mkdir(join(temporaryDirectory, AGENT_PROJECTS_DIRECTORY_PATH, 'prague-map'), { recursive: true });

        const runtimeLogPath = join(temporaryDirectory, 'question.log.txt');
        await writeFile(
            runtimeLogPath,
            [
                JSON.stringify({
                    type: 'assistant',
                    message: {
                        content: [
                            {
                                type: 'tool_use',
                                name: 'Edit',
                                input: { file_path: join(temporaryDirectory, 'projects', 'my-website', 'index.html') },
                            },
                        ],
                    },
                }),
                JSON.stringify({
                    type: 'assistant',
                    message: { content: [{ type: 'text', text: 'I also know about projects/prague-map.' }] },
                }),
            ].join('\n'),
            'utf-8',
        );

        await expect(resolveTouchedAgentProjects({ projectPath: temporaryDirectory, runtimeLogPath })).resolves.toEqual(
            ['my-website'],
        );
    });

    it('reports nothing when the runtime log is already gone', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-touched-projects-'));
        await mkdir(join(temporaryDirectory, AGENT_PROJECTS_DIRECTORY_PATH, 'my-website'), { recursive: true });

        await expect(
            resolveTouchedAgentProjects({
                projectPath: temporaryDirectory,
                runtimeLogPath: join(temporaryDirectory, 'missing.log.txt'),
            }),
        ).resolves.toEqual([]);
    });

    it('reports nothing when the agent has no projects folder', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-touched-projects-'));
        const runtimeLogPath = join(temporaryDirectory, 'question.log.txt');
        await writeFile(
            runtimeLogPath,
            JSON.stringify({
                type: 'item.started',
                item: { type: 'command_execution', command: 'ls projects/my-website' },
            }),
            'utf-8',
        );

        await expect(resolveTouchedAgentProjects({ projectPath: temporaryDirectory, runtimeLogPath })).resolves.toEqual(
            [],
        );
    });
});
