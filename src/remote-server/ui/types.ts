export type ServerInfo = {
    bookLanguageVersion: string;
    promptbookEngineVersion: string;
    nodeVersion: string;
    port: number | string | undefined;
    startupDate: string;
    isAnonymousModeAllowed: boolean;
    isApplicationModeAllowed: boolean;
    pipelines: ReadonlyArray<string>;
    runningExecutions: number;
    paths: ReadonlyArray<string>;
};

/**
 * Add Note: [💞] Ignore a discrepancy between file name and entity name
 *     <- TODO: !!! Maybe split into multiple files
 */
