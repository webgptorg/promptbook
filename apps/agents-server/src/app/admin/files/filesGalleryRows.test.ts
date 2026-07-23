import {
    collectFilesGalleryAgentIds,
    normalizeFilesGalleryRows,
    type FilesGalleryDatabaseAgentRow,
    type FilesGalleryDatabaseFileRow,
} from './filesGalleryRows';

describe('filesGalleryRows', () => {
    it('normalizes files and attaches agent labels from a separate lookup', () => {
        const files: FilesGalleryDatabaseFileRow[] = [
            {
                id: 10,
                createdAt: '2026-07-23T10:00:00.000Z',
                fileName: 'documents/report.pdf',
                fileSize: 4096,
                fileType: 'application/pdf',
                storageUrl: 'https://example.com/report.pdf',
                shortUrl: null,
                purpose: 'KNOWLEDGE',
                status: 'COMPLETED',
                agentId: 7,
            },
        ];
        const agents: FilesGalleryDatabaseAgentRow[] = [
            {
                id: 7,
                agentName: 'Research Agent',
                permanentId: 'agent_7',
            },
        ];

        expect(normalizeFilesGalleryRows(files, agents)).toEqual([
            {
                id: 10,
                createdAt: '2026-07-23T10:00:00.000Z',
                fileName: 'documents/report.pdf',
                fileSize: 4096,
                fileType: 'application/pdf',
                storageUrl: 'https://example.com/report.pdf',
                shortUrl: null,
                purpose: 'KNOWLEDGE',
                status: 'COMPLETED',
                agentId: 7,
                agent: {
                    id: 7,
                    agentName: 'Research Agent',
                    permanentId: 'agent_7',
                },
            },
        ]);
    });

    it('falls back for malformed legacy values without producing invalid display numbers', () => {
        const files = [
            {
                id: 11,
                createdAt: '2026-07-23T10:00:00.000Z',
                fileName: '',
                fileSize: 'not-a-number',
                fileType: '',
                storageUrl: '',
                shortUrl: '',
                purpose: '',
                status: 'UNKNOWN',
                agentId: null,
            },
        ] as unknown as FilesGalleryDatabaseFileRow[];

        expect(normalizeFilesGalleryRows(files, [])).toEqual([
            {
                id: 11,
                createdAt: '2026-07-23T10:00:00.000Z',
                fileName: 'Unnamed file',
                fileSize: 0,
                fileType: 'application/octet-stream',
                storageUrl: null,
                shortUrl: null,
                purpose: 'UNKNOWN',
                status: 'COMPLETED',
                agentId: null,
                agent: null,
            },
        ]);
    });

    it('collects unique finite agent ids', () => {
        const files = [
            { agentId: 3 },
            { agentId: 3 },
            { agentId: 9 },
            { agentId: null },
            { agentId: Number.NaN },
        ] as unknown as FilesGalleryDatabaseFileRow[];

        expect(collectFilesGalleryAgentIds(files)).toEqual([3, 9]);
    });
});
