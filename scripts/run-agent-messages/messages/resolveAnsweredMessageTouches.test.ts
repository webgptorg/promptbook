import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';
import { resolveAnsweredMessageTouches } from './resolveAnsweredMessageTouches';

describe('resolveAnsweredMessageTouches', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('reports the existing projects named by the harness tool calls', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-message-touches-'));
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

        await expect(
            resolveAnsweredMessageTouches({ projectPath: temporaryDirectory, runtimeLogPath }),
        ).resolves.toEqual({
            touchedProjectNames: ['my-website'],
            touchedExternalSources: [],
        });
    });

    it('reports the external sources reached by the harness tool calls', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-message-touches-'));

        const runtimeLogPath = join(temporaryDirectory, 'question.log.txt');
        await writeFile(
            runtimeLogPath,
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [
                        { type: 'tool_use', name: 'mcp__gmail__create_draft', input: { to: 'manager@ptbk.io' } },
                        { type: 'tool_use', name: 'WebFetch', input: { url: 'https://ptbk.io/pricing' } },
                    ],
                },
            }),
            'utf-8',
        );

        await expect(
            resolveAnsweredMessageTouches({ projectPath: temporaryDirectory, runtimeLogPath }),
        ).resolves.toEqual({
            touchedProjectNames: [],
            touchedExternalSources: [
                { kind: 'integration', name: 'Gmail' },
                { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/pricing' },
            ],
        });
    });

    it('reports nothing when the runtime log is already gone', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-message-touches-'));
        await mkdir(join(temporaryDirectory, AGENT_PROJECTS_DIRECTORY_PATH, 'my-website'), { recursive: true });

        await expect(
            resolveAnsweredMessageTouches({
                projectPath: temporaryDirectory,
                runtimeLogPath: join(temporaryDirectory, 'missing.log.txt'),
            }),
        ).resolves.toEqual({ touchedProjectNames: [], touchedExternalSources: [] });
    });

    it('reports nothing when the agent has no projects folder', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-message-touches-'));
        const runtimeLogPath = join(temporaryDirectory, 'question.log.txt');
        await writeFile(
            runtimeLogPath,
            JSON.stringify({
                type: 'item.started',
                item: { type: 'command_execution', command: 'ls projects/my-website' },
            }),
            'utf-8',
        );

        await expect(
            resolveAnsweredMessageTouches({ projectPath: temporaryDirectory, runtimeLogPath }),
        ).resolves.toEqual({ touchedProjectNames: [], touchedExternalSources: [] });
    });
});
