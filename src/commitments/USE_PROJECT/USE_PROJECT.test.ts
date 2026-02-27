import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import { UseProjectCommitmentDefinition } from './USE_PROJECT';

describe('USE PROJECT commitment', () => {
    const commitment = new UseProjectCommitmentDefinition();
    const basicRequirements = createBasicAgentModelRequirements('test-agent');
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('has correct type and aliases', () => {
        expect(commitment.type).toBe('USE PROJECT');
        expect(commitment.aliases).toEqual(['PROJECT']);
    });

    it('adds project tools and metadata when applied', () => {
        const result = commitment.applyToAgentModelRequirements(
            basicRequirements,
            'https://github.com/example/project',
        );

        expect(result._metadata?.useProject).toBe(true);
        expect(result._metadata?.useProjects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: 'https://github.com/example/project',
                    slug: 'example/project',
                }),
            ]),
        );
        expect(result.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'project_list_files' }),
                expect.objectContaining({ name: 'project_read_file' }),
                expect.objectContaining({ name: 'project_upsert_file' }),
                expect.objectContaining({ name: 'project_delete_file' }),
                expect.objectContaining({ name: 'project_create_branch' }),
                expect.objectContaining({ name: 'project_create_pull_request' }),
            ]),
        );
    });

    it('does not duplicate project tools when applied multiple times', () => {
        let result = commitment.applyToAgentModelRequirements(basicRequirements, 'https://github.com/example/project');
        result = commitment.applyToAgentModelRequirements(result, 'https://github.com/example/project');
        result = commitment.applyToAgentModelRequirements(result, 'https://github.com/example/project');

        expect(result.tools!.filter((tool) => tool.name === 'project_list_files').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'project_read_file').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'project_upsert_file').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'project_delete_file').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'project_create_branch').length).toBe(1);
        expect(result.tools!.filter((tool) => tool.name === 'project_create_pull_request').length).toBe(1);
    });

    it('returns wallet-credential-required result when GitHub token is missing', async () => {
        const toolFunctions = commitment.getToolFunctions();
        const listFilesTool = toolFunctions.project_list_files!;

        const resultRaw = await listFilesTool({
            repository: 'example/project',
        });
        const result = JSON.parse(resultRaw) as {
            action?: string;
            status?: string;
            service?: string;
            key?: string;
        };

        expect(result.action).toBe('project-auth');
        expect(result.status).toBe('wallet-credential-required');
        expect(result.service).toBe('github');
        expect(result.key).toBe('use-project-github-token');
    });

    it('lists project files through GitHub API', async () => {
        const fetchMock = jest.fn(async () => {
            return new Response(
                JSON.stringify([
                    {
                        type: 'file',
                        name: 'README.md',
                        path: 'README.md',
                        sha: 'abc123',
                    },
                ]),
                {
                    status: 200,
                    statusText: 'OK',
                },
            );
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const toolFunctions = commitment.getToolFunctions();
        const listFilesTool = toolFunctions.project_list_files!;
        const resultText = await listFilesTool({
            repository: 'example/project',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                projects: {
                    githubToken: 'ghp_test_token',
                    repositories: ['https://github.com/example/project'],
                },
            }),
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/repos/example/project/contents'),
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: 'Bearer ghp_test_token',
                }),
            }),
        );

        const result = JSON.parse(resultText);
        expect(result.repository).toBe('https://github.com/example/project');
        expect(result.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'README.md',
                    path: 'README.md',
                    type: 'file',
                    sha: 'abc123',
                }),
            ]),
        );
    });

    it('rejects repositories outside USE PROJECT configuration', async () => {
        const toolFunctions = commitment.getToolFunctions();
        const listFilesTool = toolFunctions.project_list_files!;

        await expect(
            listFilesTool({
                repository: 'other/repository',
                [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                    projects: {
                        githubToken: 'ghp_test_token',
                        repositories: ['https://github.com/example/project'],
                    },
                }),
            }),
        ).rejects.toThrow('is not configured by USE PROJECT');
    });
});
