import { spaceTrim } from 'spacetrim';
import type { really_any } from '../../utils/organization/really_any';
import type { string_url } from '../../types/typeAliases';
import type { FileSecurityChecker } from '../FileSecurityChecker';
import type { FileSecurityCheckResult } from '../FileSecurityCheckResult';

/**
 * File security checker that uses VirusTotal API.
 *
 * @see https://developers.virustotal.com/reference/overview
 * @public exported from `@promptbook/core`
 */
export class VirusTotalFileSecurityChecker implements FileSecurityChecker {
    /**
     * @param apiKey VirusTotal API key
     */
    public constructor(private readonly apiKey: string) {}

    /**
     * @inheritdoc
     */
    public get id(): string {
        return 'virustotal';
    }

    /**
     * @inheritdoc
     */
    public get title(): string {
        return 'VirusTotal';
    }

    /**
     * @inheritdoc
     */
    public get description(): string {
        return 'VirusTotal is a free service that analyzes suspicious files and URLs to detect types of malware.';
    }

    /**
     * @inheritdoc
     */
    public async checkConfiguration(): Promise<void> {
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('VirusTotal API key is not configured');
        }

        // Note: We could do a test call here, but for now we just check if it's present
    }

    /**
     * @inheritdoc
     */
    public async checkFile(fileUrl: string_url): Promise<FileSecurityCheckResult> {
        await this.checkConfiguration();

        try {
            // 1. First try to check the URL report
            // Note: VirusTotal URL ID is base64 of the URL without padding
            const urlId = Buffer.from(fileUrl).toString('base64').replace(/=/g, '');

            const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
                method: 'GET',
                headers: {
                    'x-apikey': this.apiKey,
                    accept: 'application/json',
                },
            });

            if (response.status === 404) {
                // 2. If URL not found, request a scan
                const scanResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
                    method: 'POST',
                    headers: {
                        'x-apikey': this.apiKey,
                        'content-type': 'application/x-www-form-urlencoded',
                        accept: 'application/json',
                    },
                    body: new URLSearchParams({ url: fileUrl }),
                });

                if (!scanResponse.ok) {
                    const errorData = await scanResponse.json().catch(() => ({}));
                    return {
                        isSafe: false,
                        status: 'ERROR',
                        confidence: 0,
                        message: `Failed to request scan from VirusTotal: ${scanResponse.statusText}`,
                        rawResponse: errorData,
                    };
                }

                // Note: Scan is now queued. In a real-world scenario we might want to poll for results.
                // But for now, we'll return UNKNOWN or similar as it's not yet analyzed.
                return {
                    isSafe: true, // We assume safe until proven otherwise for new scans to not block UX, or we could return UNKNOWN
                    status: 'UNKNOWN',
                    confidence: 0.5,
                    message: spaceTrim(`
                        File is currently being analyzed by VirusTotal.
                        Please check again later.
                    `),
                };
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    isSafe: false,
                    status: 'ERROR',
                    confidence: 0,
                    message: `Failed to get report from VirusTotal: ${response.statusText}`,
                    rawResponse: errorData,
                };
            }

            const data = (await response.json()) as really_any;
            const attributes = data.data.attributes;
            const lastAnalysisStats = attributes.last_analysis_stats;

            const maliciousCount = lastAnalysisStats.malicious || 0;
            const suspiciousCount = lastAnalysisStats.suspicious || 0;
            // const harmlessCount = lastAnalysisStats.harmless || 0;
            // const undetectedCount = lastAnalysisStats.undetected || 0;

            const isSafe = maliciousCount === 0 && suspiciousCount === 0;
            let status: FileSecurityCheckResult['status'] = 'SAFE';
            if (maliciousCount > 0) {
                status = 'MALICIOUS';
            } else if (suspiciousCount > 0) {
                status = 'SUSPICIOUS';
            }

            const totalEngines = Object.keys(attributes.last_analysis_results || {}).length || 1;
            const confidence = 1 - (maliciousCount + suspiciousCount) / totalEngines;

            return {
                isSafe,
                status,
                confidence,
                message: spaceTrim(`
                    VirusTotal report:
                    - Malicious: ${maliciousCount}
                    - Suspicious: ${suspiciousCount}
                    - Harmless: ${lastAnalysisStats.harmless}
                    - Undetected: ${lastAnalysisStats.undetected}
                `),
                reportUrl: `https://www.virustotal.com/gui/url/${urlId}`,
                rawResponse: data,
            };
        } catch (error) {
            return {
                isSafe: false,
                status: 'ERROR',
                confidence: 0,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
