import { Command } from 'commander';
import filesystem from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { addProjectPathOption, normalizeProjectCliOptions, resolveProjectDirectory } from './projectCliOptions';

describe('shared project selection', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await filesystem.realpath(await filesystem.mkdtemp(join(tmpdir(), 'ptbk project paths ')));
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await filesystem.rm(directory, { recursive: true, force: true });
    });

    it('captures cwd at each action, even when commands were registered earlier', async () => {
        const program = new Command();
        addProjectPathOption(program);
        const selected: string[] = [];
        program.action((options) => { selected.push(normalizeProjectCliOptions(options).projectDirectory); });
        const workingDirectory = jest.spyOn(process, 'cwd').mockReturnValue(join(directory, 'first project'));
        await program.parseAsync([], { from: 'user' });
        workingDirectory.mockReturnValue(join(directory, 'second project'));
        await program.parseAsync([], { from: 'user' });
        expect(selected).toEqual([join(directory, 'first project'), join(directory, 'second project')]);
    });

    it('resolves relative and absolute overrides independently of registration cwd', async () => {
        const projectPath = join(directory, 'nested', 'project with spaces');
        await filesystem.mkdir(projectPath, { recursive: true });
        for (const path of ['nested/project with spaces', join('nested', 'project with spaces'), projectPath]) {
            const options = normalizeProjectCliOptions({ path }, directory);
            expect(await resolveProjectDirectory(options.projectDirectory)).toBe(projectPath);
        }
        expect(normalizeProjectCliOptions({}, projectPath).projectDirectory).toBe(projectPath);
    });

    it('rejects empty, missing, non-directory and inaccessible paths without creating anything', async () => {
        expect(() => normalizeProjectCliOptions({ path: '' }, directory)).toThrow('non-empty');
        await expect(resolveProjectDirectory(join(directory, 'missing'))).rejects.toThrow('--path');
        const filePath = join(directory, 'file.txt');
        await filesystem.writeFile(filePath, 'Keep this file.');
        await expect(resolveProjectDirectory(filePath)).rejects.toThrow('not a directory');
        jest.spyOn(filesystem, 'access').mockRejectedValueOnce(Object.assign(new Error('Access denied'), { code: 'EACCES' }));
        await expect(resolveProjectDirectory(directory)).rejects.toThrow('readable and searchable');
        expect(await filesystem.readdir(directory)).toEqual(['file.txt']);
    });
});

// Note: [💞] Shared project registration and resolution tests.
