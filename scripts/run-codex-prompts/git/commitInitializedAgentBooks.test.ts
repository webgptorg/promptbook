import { resolve } from 'path';
import { commitChanges } from './commitChanges';
import { commitInitializedAgentBooks } from './commitInitializedAgentBooks';
import { listWorkingTreeChangedFiles } from './workingTreeChanges';

jest.mock('./commitChanges', () => ({ commitChanges: jest.fn() }));
jest.mock('./workingTreeChanges', () => ({ listWorkingTreeChangedFiles: jest.fn() }));

describe('commitInitializedAgentBooks', () => {
    beforeEach(() => jest.clearAllMocks());

    it('commits only the Adam file created by the current run', async () => {
        jest.mocked(listWorkingTreeChangedFiles).mockResolvedValue(['agents/.core/adam.book', 'unrelated.txt']);
        await commitInitializedAgentBooks(process.cwd(), [resolve('agents/.core/adam.book')]);
        expect(commitChanges).toHaveBeenCalledWith('Initialize Adam agent', {
            projectPath: process.cwd(),
            relevantPaths: ['agents/.core/adam.book'],
        });
    });

    it('does not commit ignored books or pre-existing changes', async () => {
        jest.mocked(listWorkingTreeChangedFiles).mockResolvedValue(['unrelated.txt']);
        await commitInitializedAgentBooks(process.cwd(), [resolve('agents/.core/adam.book')]);
        expect(commitChanges).not.toHaveBeenCalled();
    });

    it('does not access Git when no book was created', async () => {
        await commitInitializedAgentBooks(process.cwd(), []);
        expect(listWorkingTreeChangedFiles).not.toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
    });
});
