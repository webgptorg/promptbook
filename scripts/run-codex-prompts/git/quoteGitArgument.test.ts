import { quoteGitArgument } from './quoteGitArgument';

describe('literal Git arguments', () => {
    it('protects shell expansion in repository paths and ref names', () => {
        expect(quoteGitArgument('project $HOME `filename` \\ "quoted"', true)).toBe(
            '"project \\$HOME \\`filename\\` \\\\ \\"quoted\\""',
        );
    });

    it('preserves the native Windows quoting contract outside the owned Bash lifecycle', () => {
        expect(quoteGitArgument('C:\\project files', false)).toBe('"C:\\\\project files"');
    });
});
