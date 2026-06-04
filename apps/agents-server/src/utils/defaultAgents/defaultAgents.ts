import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { AgentBasicInformation, AgentCollection, string_book } from '@promptbook-local/types';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { DEFAULT_AGENT_VISIBILITY } from '../agentVisibility';

/**
 * Installation status for one default agent book.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export type DefaultAgentInstallStatus = 'installed' | 'skipped';

/**
 * Result for one processed default agent book.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export type DefaultAgentInstallRecord = {
    /**
     * Source book filename.
     */
    readonly fileName: string;

    /**
     * Parsed canonical agent name.
     */
    readonly agentName: string;

    /**
     * Whether the agent was created or skipped because an active agent with the same name already exists.
     */
    readonly status: DefaultAgentInstallStatus;

    /**
     * Permanent id of the newly created agent, if created.
     */
    readonly permanentId?: string;
};

/**
 * Aggregate default-agent installation result.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export type DefaultAgentInstallResult = {
    /**
     * Number of newly created agents.
     */
    readonly installedCount: number;

    /**
     * Number of already-present agents skipped by name.
     */
    readonly skippedCount: number;

    /**
     * Per-book processing records.
     */
    readonly records: ReadonlyArray<DefaultAgentInstallRecord>;
};

/**
 * Options for installing default agents from a directory.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export type InstallDefaultAgentsFromDirectoryOptions = {
    /**
     * Agent collection used for persistence.
     */
    readonly collection: AgentCollection;

    /**
     * Directory containing the repository default `*.book` files.
     */
    readonly defaultAgentsDirectoryPath: string;

    /**
     * Optional logger for install-time progress.
     */
    readonly logger?: Pick<Console, 'info'>;
};

/**
 * Lists repository default book filenames in stable install order.
 *
 * @param defaultAgentsDirectoryPath - Directory containing default `*.book` files.
 * @returns Sorted book filenames.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export async function listDefaultAgentBookFileNames(defaultAgentsDirectoryPath: string): Promise<ReadonlyArray<string>> {
    const directoryEntries = await readdir(defaultAgentsDirectoryPath, { withFileTypes: true });

    return directoryEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.book'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

/**
 * Creates default agents from repository `*.book` files, skipping already-active agents with matching names.
 *
 * @param options - Installation options.
 * @returns Aggregate installation result.
 *
 * @private shared utility for Agents Server default-agent installation
 */
export async function installDefaultAgentsFromDirectory(
    options: InstallDefaultAgentsFromDirectoryOptions,
): Promise<DefaultAgentInstallResult> {
    const fileNames = await listDefaultAgentBookFileNames(options.defaultAgentsDirectoryPath);
    const existingAgentNames = new Set((await options.collection.listAgents()).map((agent) => agent.agentName));
    const records: Array<DefaultAgentInstallRecord> = [];

    for (const [index, fileName] of fileNames.entries()) {
        const agentSource = (await readFile(join(options.defaultAgentsDirectoryPath, fileName), 'utf-8')) as string_book;
        const parsedAgentProfile = parseAgentSource(agentSource);
        const agentName = parsedAgentProfile.agentName;

        if (existingAgentNames.has(agentName)) {
            options.logger?.info(`[default-agents] Skipping existing agent "${agentName}" from ${fileName}.`);
            records.push({
                fileName,
                agentName,
                status: 'skipped',
            });
            continue;
        }

        const createdAgent = await options.collection.createAgent(agentSource, {
            sortOrder: index + 1,
            visibility: DEFAULT_AGENT_VISIBILITY,
        });

        existingAgentNames.add(createdAgent.agentName);
        options.logger?.info(`[default-agents] Installed "${createdAgent.agentName}" from ${fileName}.`);
        records.push(createInstalledDefaultAgentRecord(fileName, createdAgent));
    }

    return {
        installedCount: records.filter((record) => record.status === 'installed').length,
        skippedCount: records.filter((record) => record.status === 'skipped').length,
        records,
    };
}

/**
 * Creates a typed result record for a newly installed default agent.
 *
 * @param fileName - Source book filename.
 * @param createdAgent - Created agent profile returned by the collection.
 * @returns Installation record.
 *
 * @private utility of `installDefaultAgentsFromDirectory`
 */
function createInstalledDefaultAgentRecord(
    fileName: string,
    createdAgent: AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>,
): DefaultAgentInstallRecord {
    return {
        fileName,
        agentName: createdAgent.agentName,
        status: 'installed',
        permanentId: createdAgent.permanentId,
    };
}
