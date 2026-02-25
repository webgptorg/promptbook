import { VirusTotalFileSecurityChecker } from './VirusTotalFileSecurityChecker';

describe('VirusTotalFileSecurityChecker', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        fetchSpy = jest.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('should return SAFE for a clean file', async () => {
        const checker = new VirusTotalFileSecurityChecker('fake-api-key');

        // Mock successful report
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                data: {
                    attributes: {
                        last_analysis_stats: {
                            malicious: 0,
                            suspicious: 0,
                            harmless: 70,
                            undetected: 10,
                        },
                        last_analysis_results: {
                            engine1: { category: 'harmless' },
                            engine2: { category: 'harmless' },
                        },
                    },
                },
            }),
        } as Response);

        const result = await checker.checkFile('https://example.com/safe.pdf');

        expect(result.isSafe).toBe(true);
        expect(result.status).toBe('SAFE');
        expect(result.message).toContain('Malicious: 0');
    });

    it('should return MALICIOUS for a flagged file', async () => {
        const checker = new VirusTotalFileSecurityChecker('fake-api-key');

        // Mock malicious report
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                data: {
                    attributes: {
                        last_analysis_stats: {
                            malicious: 5,
                            suspicious: 1,
                            harmless: 60,
                            undetected: 4,
                        },
                        last_analysis_results: {
                            engine1: { category: 'malicious' },
                            engine2: { category: 'harmless' },
                        },
                    },
                },
            }),
        } as Response);

        const result = await checker.checkFile('https://example.com/malicious.exe');

        expect(result.isSafe).toBe(false);
        expect(result.status).toBe('MALICIOUS');
        expect(result.message).toContain('Malicious: 5');
    });

    it('should request a scan if URL is not found', async () => {
        const checker = new VirusTotalFileSecurityChecker('fake-api-key');

        // 1. Mock 404 for report
        fetchSpy.mockResolvedValueOnce({
            ok: false,
            status: 404,
        } as Response);

        // 2. Mock 200 for scan request
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                data: {
                    type: 'analysis',
                    id: 'new-scan-id',
                },
            }),
        } as Response);

        const result = await checker.checkFile('https://example.com/new-file.zip');

        expect(result.status).toBe('UNKNOWN');
        expect(result.message).toContain('currently being analyzed');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should fail if API key is missing', async () => {
        const checker = new VirusTotalFileSecurityChecker('');
        await expect(checker.checkFile('https://example.com/file.pdf')).rejects.toThrow(
            'VirusTotal API key is not configured',
        );
    });
});
