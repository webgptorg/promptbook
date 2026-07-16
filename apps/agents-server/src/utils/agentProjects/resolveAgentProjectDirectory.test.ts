import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
    createAgentProjectDirectoryName,
    normalizeAgentProjectName,
    resolveAgentProjectDirectory,
    resolveAgentProjectFilePath,
    resolveAgentProjectsStorageDirectory,
} from './resolveAgentProjectDirectory';

describe('agent project directory helpers', () => {
    let originalStorageDirectoryEnv: string | undefined;

    beforeEach(() => {
        originalStorageDirectoryEnv = process.env.AGENT_PROJECTS_STORAGE_DIRECTORY;
    });

    afterEach(() => {
        if (originalStorageDirectoryEnv === undefined) {
            delete process.env.AGENT_PROJECTS_STORAGE_DIRECTORY;
        } else {
            process.env.AGENT_PROJECTS_STORAGE_DIRECTORY = originalStorageDirectoryEnv;
        }
    });

    it('resolves project directories under a per-agent folder', () => {
        delete process.env.AGENT_PROJECTS_STORAGE_DIRECTORY;

        const directory = resolveAgentProjectDirectory('agent/../id', 'website-12345678');

        expect(directory).toBe(`${resolveAgentProjectsStorageDirectory()}/agent-agent-id/website-12345678`);
        expect(directory).toContain('.promptbook');
        expect(directory).not.toContain('..');
    });

    it('honors the AGENT_PROJECTS_STORAGE_DIRECTORY override', () => {
        process.env.AGENT_PROJECTS_STORAGE_DIRECTORY = '/persistent/projects';

        expect(resolveAgentProjectDirectory('abc', 'demo-12345678')).toBe(
            '/persistent/projects/agent-abc/demo-12345678',
        );
    });

    it('creates safe unique project directory names from human project names', () => {
        const directoryName = createAgentProjectDirectoryName('  My website!  ');

        expect(directoryName).toMatch(/^my-website-[a-f0-9]{8}$/u);
    });

    it('normalizes project names without accepting empty values', () => {
        expect(normalizeAgentProjectName('  My    Project  ')).toBe('My Project');
        expect(() => normalizeAgentProjectName('   ')).toThrow(/Project name is required/);
    });

    it('rejects project-relative paths that escape the project directory', () => {
        expect(() => resolveAgentProjectFilePath('/projects/agent/demo', '../secrets.txt')).toThrow(/inside/);
        expect(() => resolveAgentProjectFilePath('/projects/agent/demo', 'nested/../../secrets.txt')).toThrow(
            /inside/,
        );
    });

    it('resolves safe project-relative paths', () => {
        const resolvedPath = resolveAgentProjectFilePath('/projects/agent/demo', 'src/index.ts');

        expect(resolvedPath.relativePath).toBe('src/index.ts');
        expect(resolvedPath.absolutePath.replace(/\\/g, '/')).toMatch(/\/projects\/agent\/demo\/src\/index\.ts$/u);
    });
});
