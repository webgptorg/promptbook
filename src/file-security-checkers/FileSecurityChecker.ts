import type { Promisable } from 'type-fest';
import type { string_markdown, string_title, string_url } from '../types/typeAliases';
import type { FileSecurityCheckResult } from './FileSecurityCheckResult';

/**
 * Interface defining the requirements for file security checker implementations.
 * File security checkers are responsible for scanning uploaded files for viruses, malware, and other security threats.
 *
 * @public exported from `@promptbook/core`
 */
export type FileSecurityChecker = {
    /**
     * Unique identifier of the security checker (e.g. 'virustotal')
     */
    readonly id: string;

    /**
     * Human-readable title of the security checker
     */
    readonly title: string_title;

    /**
     * Human-readable description of the security checker
     */
    readonly description?: string_markdown;

    /**
     * Checks the security of a file by its URL
     *
     * @param fileUrl URL of the file to check
     * @returns Result of the security check
     */
    checkFile(fileUrl: string_url): Promise<FileSecurityCheckResult>;

    /**
     * Checks if the provider is properly configured (e.g. API keys are present)
     */
    checkConfiguration(): Promisable<void>;
};
