import { resolveAgentProjectReadmeProfile } from './resolveAgentProjectReadmeProfile';

describe('resolveAgentProjectReadmeProfile', () => {
    it('uses the folder name when there is no README', () => {
        expect(
            resolveAgentProjectReadmeProfile({
                projectDirectoryName: 'my-website',
                readme: null,
            }),
        ).toEqual({
            displayName: 'my-website',
            description: '',
            readmeFileName: null,
        });
    });

    it('uses the README heading and first paragraph for the project profile', () => {
        expect(
            resolveAgentProjectReadmeProfile({
                projectDirectoryName: 'my-website',
                readme: {
                    fileName: 'README.md',
                    content: '# **Public Website**\n\nThis is the **main** website [project](https://example.com).\n\n## Usage\n\nRun it.',
                },
            }),
        ).toEqual({
            displayName: 'Public Website',
            description: 'This is the main website project.',
            readmeFileName: 'README.md',
        });
    });

    it('keeps the folder name when the README has no heading', () => {
        expect(
            resolveAgentProjectReadmeProfile({
                projectDirectoryName: 'my-script',
                readme: {
                    fileName: 'README.txt',
                    content: 'Small automation script.\n\nSecond paragraph.',
                },
            }),
        ).toEqual({
            displayName: 'my-script',
            description: 'Small automation script.',
            readmeFileName: 'README.txt',
        });
    });

    it('uses the first explicit README heading after introductory content', () => {
        expect(
            resolveAgentProjectReadmeProfile({
                projectDirectoryName: 'dashboard',
                readme: {
                    fileName: 'README.md',
                    content: 'Status badge.\n\n# Operations Dashboard\n\nTrack running jobs.',
                },
            }),
        ).toMatchObject({
            displayName: 'Operations Dashboard',
            description: 'Status badge.',
        });
    });

    it('truncates long first paragraphs to 200 characters plus ellipsis', () => {
        const longParagraph = 'A'.repeat(205);

        expect(
            resolveAgentProjectReadmeProfile({
                projectDirectoryName: 'long-project',
                readme: {
                    fileName: 'README.md',
                    content: `# Long Project\n\n${longParagraph}`,
                },
            }).description,
        ).toBe(`${'A'.repeat(200)}...`);
    });
});
