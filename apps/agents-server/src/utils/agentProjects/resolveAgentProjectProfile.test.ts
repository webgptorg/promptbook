import { resolveAgentProjectProfile } from './resolveAgentProjectProfile';

describe('resolveAgentProjectProfile', () => {
    it('uses the folder name when the project has no README or HTML title', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'my-website',
                readme: null,
                indexHtmlMetadata: {
                    title: null,
                    faviconRelativePaths: [],
                },
                faviconRelativePath: null,
            }),
        ).toEqual({
            displayName: 'my-website',
            description: '',
            readmeFileName: null,
            faviconRelativePath: null,
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
                indexHtmlMetadata: {
                    title: 'Website from HTML',
                    faviconRelativePaths: [],
                },
                faviconRelativePath: null,
            }),
        ).toEqual({
            displayName: 'Public Website',
            description: 'This is the main website project.',
            readmeFileName: 'README.md',
            faviconRelativePath: null,
        });
    });

    it('uses the HTML title when the README has no heading', () => {
        expect(
            resolveAgentProjectProfile({
                projectDirectoryName: 'my-script',
                readme: {
                    fileName: 'README.txt',
                    content: 'Small automation script.\n\nSecond paragraph.',
                },
                indexHtmlMetadata: {
                    title: 'Automated Reports',
                    faviconRelativePaths: ['assets/reports.svg'],
                },
                faviconRelativePath: 'assets/reports.svg',
            }),
        ).toEqual({
            displayName: 'Automated Reports',
            description: 'Small automation script.',
            readmeFileName: 'README.txt',
            faviconRelativePath: 'assets/reports.svg',
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
                indexHtmlMetadata: {
                    title: 'Dashboard from HTML',
                    faviconRelativePaths: [],
                },
                faviconRelativePath: null,
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
                    content: '# Long Project\n\n' + longParagraph,
                },
                indexHtmlMetadata: {
                    title: null,
                    faviconRelativePaths: [],
                },
                faviconRelativePath: null,
            }).description,
        ).toBe('A'.repeat(200) + '...');
    });
});
