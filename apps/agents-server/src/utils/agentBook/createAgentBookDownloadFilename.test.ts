import {
    createAgentBookDownloadContentDisposition,
    createAgentBookDownloadFilename,
} from './createAgentBookDownloadFilename';

describe('createAgentBookDownloadFilename', () => {
    it('creates a safe .book filename from an agent name', () => {
        expect(createAgentBookDownloadFilename('Support/Agent: Level 1')).toBe('Support_Agent_ Level 1.book');
    });

    it('does not append the .book extension twice', () => {
        expect(createAgentBookDownloadFilename('Sales Helper.book')).toBe('Sales Helper.book');
    });

    it('falls back when the sanitized name is empty', () => {
        expect(createAgentBookDownloadFilename('...')).toBe('Agent book.book');
    });
});

describe('createAgentBookDownloadContentDisposition', () => {
    it('creates an encoded filename header with an ASCII fallback', () => {
        const filename = createAgentBookDownloadFilename('Školník');
        const contentDisposition = createAgentBookDownloadContentDisposition(filename);

        expect(contentDisposition).toContain('attachment; filename="_koln_k.book"');
        expect(contentDisposition).toContain(`filename*=UTF-8''%C5%A0koln%C3%ADk.book`);
    });
});
