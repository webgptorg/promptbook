import { parseAgentProjectToolCallResult } from './agentProjectToolCall';

describe('parseAgentProjectToolCallResult', () => {
    it('parses the full payload a project chip carries', () => {
        expect(
            parseAgentProjectToolCallResult({
                projectName: ' my-website ',
                displayName: 'My Website',
                description: 'A tiny site',
                projectHref: '/agents/Agent1234/projects/my-website',
                projectUrl: 'https://my-website.example.com',
                isRunning: true,
                runtimeStatusLabel: 'Running',
                sizeLabel: '12 kB',
                fileCount: 3,
                isGitRepository: true,
                change: {
                    projectName: 'my-website',
                    commitHash: '6f1c0de',
                    committedAt: '2026-08-17T10:15:00.000Z',
                    changedFiles: [{ path: 'index.html', insertionCount: 12, deletionCount: 3 }],
                    insertionCount: 12,
                    deletionCount: 3,
                    diff: '+<html>Hello</html>',
                    isDiffTruncated: false,
                },
            }),
        ).toEqual({
            projectName: 'my-website',
            displayName: 'My Website',
            description: 'A tiny site',
            projectHref: '/agents/Agent1234/projects/my-website',
            projectUrl: 'https://my-website.example.com',
            isRunning: true,
            runtimeStatusLabel: 'Running',
            sizeLabel: '12 kB',
            fileCount: 3,
            isGitRepository: true,
            change: {
                projectName: 'my-website',
                commitHash: '6f1c0de',
                committedAt: '2026-08-17T10:15:00.000Z',
                changedFiles: [{ path: 'index.html', insertionCount: 12, deletionCount: 3 }],
                insertionCount: 12,
                deletionCount: 3,
                diff: '+<html>Hello</html>',
                isDiffTruncated: false,
            },
        });
    });

    it('parses a chip written before projects reported their state', () => {
        expect(
            parseAgentProjectToolCallResult({
                projectName: 'my-website',
                displayName: 'My Website',
                projectHref: '/agents/Agent1234/projects/my-website',
            }),
        ).toEqual({
            projectName: 'my-website',
            displayName: 'My Website',
            projectHref: '/agents/Agent1234/projects/my-website',
        });
    });

    it('drops a malformed change instead of the whole chip', () => {
        expect(
            parseAgentProjectToolCallResult({
                projectName: 'my-website',
                change: { projectName: 'my-website', commitHash: '6f1c0de' },
            }),
        ).toEqual({ projectName: 'my-website' });
    });

    it('describes no project without a project name', () => {
        expect(parseAgentProjectToolCallResult({ displayName: 'My Website' })).toBeNull();
        expect(parseAgentProjectToolCallResult({ projectName: '   ' })).toBeNull();
        expect(parseAgentProjectToolCallResult(null)).toBeNull();
    });
});
