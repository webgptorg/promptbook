import { VirusTotalFileSecurityChecker } from '../../../../src/file-security-checkers/virustotal/VirusTotalFileSecurityChecker';
import type { FileSecurityChecker } from '../../../../src/file-security-checkers/FileSecurityChecker';

export const FILE_SECURITY_CHECKERS: Record<string, FileSecurityChecker> = {};

if (process.env.VIRUSTOTAL_API_KEY) {
    FILE_SECURITY_CHECKERS['VIRUSTOTAL'] = new VirusTotalFileSecurityChecker(process.env.VIRUSTOTAL_API_KEY);
}
