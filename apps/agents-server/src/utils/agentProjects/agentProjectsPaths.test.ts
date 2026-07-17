import { join } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import {
    assertSafeAgentProjectPathSegment,
    parseAgentPermanentIdFromDirectoryName,
    resolveAgentProjectsRootPath,
    resolveSafeAgentProjectFilePath,
} from './agentProjectsPaths';

describe('parseAgentPermanentIdFromDirectoryName', () => {
    it('extracts the permanent id from conventional agent directory names', () => {
        expect(parseAgentPermanentIdFromDirectoryName('agent-1dkmraaikkd8yp')).toBe('1dkmraaikkd8yp');
        expect(parseAgentPermanentIdFromDirectoryName('AGENT-ABC')).toBe('ABC');
    });

    it('rejects directory names outside the convention', () => {
        expect(parseAgentPermanentIdFromDirectoryName('agent-')).toBe(null);
        expect(parseAgentPermanentIdFromDirectoryName('something-else')).toBe(null);
        expect(parseAgentPermanentIdFromDirectoryName('')).toBe(null);
    });
});

describe('assertSafeAgentProjectPathSegment', () => {
    it('accepts plain file and folder names', () => {
        expect(() => assertSafeAgentProjectPathSegment('my-website', 'project name')).not.toThrow();
        expect(() => assertSafeAgentProjectPathSegment('index.html', 'file path segment')).not.toThrow();
        expect(() => assertSafeAgentProjectPathSegment('.gitignore', 'file path segment')).not.toThrow();
    });

    it('rejects traversal and separator segments', () => {
        expect(() => assertSafeAgentProjectPathSegment('..', 'project name')).toThrow(NotAllowed);
        expect(() => assertSafeAgentProjectPathSegment('.', 'project name')).toThrow(NotAllowed);
        expect(() => assertSafeAgentProjectPathSegment('', 'project name')).toThrow(NotAllowed);
        expect(() => assertSafeAgentProjectPathSegment('a/b', 'project name')).toThrow(NotAllowed);
        expect(() => assertSafeAgentProjectPathSegment('a\\b', 'project name')).toThrow(NotAllowed);
        expect(() => assertSafeAgentProjectPathSegment('a\0b', 'project name')).toThrow(NotAllowed);
    });
});

describe('resolveSafeAgentProjectFilePath', () => {
    it('resolves file paths inside the agent projects root', () => {
        const filePath = resolveSafeAgentProjectFilePath({
            agentPermanentId: 'abc123',
            projectName: 'my-website',
            filePathSegments: ['assets', 'style.css'],
        });

        expect(filePath).toBe(join(resolveAgentProjectsRootPath('abc123'), 'my-website', 'assets', 'style.css'));
    });

    it('rejects path traversal in the project name and in file path segments', () => {
        expect(() =>
            resolveSafeAgentProjectFilePath({
                agentPermanentId: 'abc123',
                projectName: '..',
                filePathSegments: ['secret.txt'],
            }),
        ).toThrow(NotAllowed);

        expect(() =>
            resolveSafeAgentProjectFilePath({
                agentPermanentId: 'abc123',
                projectName: 'my-website',
                filePathSegments: ['..', '..', 'agent.book'],
            }),
        ).toThrow(NotAllowed);
    });
});
