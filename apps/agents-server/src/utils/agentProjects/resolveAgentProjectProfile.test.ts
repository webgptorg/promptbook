import { resolveAgentProjectProfile } from './resolveAgentProjectProfile';

describe('resolveAgentProjectProfile', () => {
    it('humanizes the folder name when the project describes itself nowhere', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'prague-murders-map',
                readme: null,
                indexHtmlTitle: null,
            }),
        ).toEqual({
            displayName: 'Prague Murders Map',
            description: '',
            readmeFileName: null,
        });
    });

    it('uses the README heading and first paragraph for the project profile', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'my-website',
                readme: {
                    fileName: 'README.md',
                    content:
                        '# **Public Website**\n\nThis is the **main** website [project](https://example.com).\n\n## Usage\n\nRun it.',
                },
                indexHtmlTitle: 'Ignored HTML Title',
            }),
        ).toEqual({
            displayName: 'Public Website',
            description: 'This is the main website project.',
            readmeFileName: 'README.md',
        });
    });

    it('uses the index.html title when the README has no heading', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'my-script',
                readme: {
                    fileName: 'README.txt',
                    content: 'Small automation script.\n\nSecond paragraph.',
                },
                indexHtmlTitle: 'Small Automation',
            }),
        ).toEqual({
            displayName: 'Small Automation',
            description: 'Small automation script.',
            readmeFileName: 'README.txt',
        });
    });

    it('uses the index.html title when the project has no README', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'snake-game',
                readme: null,
                indexHtmlTitle: 'Snake — the classic game',
            }),
        ).toEqual({
            displayName: 'Snake — the classic game',
            description: '',
            readmeFileName: null,
        });
    });

    it('uses the first explicit README heading after introductory content', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'dashboard',
                readme: {
                    fileName: 'README.md',
                    content: 'Status badge.\n\n# Operations Dashboard\n\nTrack running jobs.',
                },
                indexHtmlTitle: null,
            }),
        ).toMatchObject({
            displayName: 'Operations Dashboard',
            description: 'Status badge.',
        });
    });

    it('truncates long first paragraphs to 200 characters plus ellipsis', () => {
        const longParagraph = 'A'.repeat(205);

        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'long-project',
                readme: {
                    fileName: 'README.md',
                    content: `# Long Project\n\n${longParagraph}`,
                },
                indexHtmlTitle: null,
            }).description,
        ).toBe(`${'A'.repeat(200)}...`);
    });
});
