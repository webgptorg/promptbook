import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveCoderProjectContext } from './resolveCoderProjectContext';

describe('single-agent project defaults', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk resolved project '));
        await mkdir(join(projectPath, 'agents'));
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nFROM @Null\nRULE Project developer.');
        await writeFile(join(projectPath, 'agents/planner.book'), 'Planner\nFROM @Null\nRULE Project planner.');
        await writeFile(join(projectPath, 'AGENTS.md'), 'Additional project rules.\n');
    });

    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('resolves the same contents with omitted or explicit defaults', async () => {
        const implicit = await resolveCoderProjectContext({ projectPath });
        const explicit = await resolveCoderProjectContext({ projectPath, agent: './agents/developer.book', context: './AGENTS.md' });
        expect(implicit.projectPath).toBe(explicit.projectPath);
        expect(implicit.agentBook?.agentSource).toBe(explicit.agentBook?.agentSource);
        expect(implicit.context).toBe(explicit.context);
        expect(implicit.agentBook?.agentName).toBe('Developer');
        expect(await readdir(join(projectPath, 'agents'))).toEqual(['developer.book', 'planner.book']);
    });

    it('preserves independent Book and context overrides', async () => {
        const agentOverride = await resolveCoderProjectContext({ projectPath, agent: 'agents/planner.book' });
        expect(agentOverride.agentBook?.agentName).toBe('Planner');
        expect(agentOverride.context).toBe(await readFile(join(projectPath, 'AGENTS.md'), 'utf-8'));
        const contextOverride = await resolveCoderProjectContext({ projectPath, context: 'Only these instructions' });
        expect(contextOverride.agentBook?.agentName).toBe('Developer');
        expect(contextOverride.context).toBe('Only these instructions');
        const both = await resolveCoderProjectContext({ projectPath, agent: join(projectPath, 'agents/planner.book'), context: '' });
        expect(both.agentBook?.agentName).toBe('Planner');
        expect(both.context).toBeUndefined();
    });

    it('fails explicit invalid Books without a fallback and preserves missing-default guidance', async () => {
        for (const agent of ['', './agents/missing.book', './agents']) {
            await expect(resolveCoderProjectContext({ projectPath, agent })).rejects.toThrow(/--agent/);
        }
        await rm(join(projectPath, 'agents/developer.book'));
        await expect(resolveCoderProjectContext({ projectPath })).rejects.toThrow('ptbk coder init');
        expect(await readdir(join(projectPath, 'agents'))).toEqual(['planner.book']);
    });
});
