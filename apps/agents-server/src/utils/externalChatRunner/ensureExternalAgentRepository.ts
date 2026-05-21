import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { string_book } from '@promptbook-local/types';
import { join } from 'path';
import {
    ensureExternalChatRunnerGithubConfiguration,
    loadExternalChatRunnerGithubConfiguration,
    type ExternalChatRunnerGithubConfiguration,
} from './ExternalChatRunnerConfiguration';
import {
    EXTERNAL_AGENT_REPOSITORY_TYPE,
    EXTERNAL_AGENT_REPOSITORY_VENDOR,
} from './externalChatRunnerConstants';
import {
    createGithubFileIfMissing,
    createGithubRepository,
    getGithubRepository,
    type GithubRepositoryMetadata,
    upsertGithubFile,
} from './GithubRepositoryClient';
import { createExternalAgentRepositoryFiles } from './createExternalAgentRepositoryFiles';
import { loadLocalAgentRunnerConfiguration, type LocalAgentRunnerConfiguration } from './LocalAgentRunnerConfiguration';
import {
    createLocalAgentRunnerFileIfMissing,
    upsertLocalAgentRunnerFile,
} from './LocalAgentRunnerFileClient';

/**
 * Persisted agent source snapshot used to synchronize one runner repository.
 */
export type ExternalAgentSourceSnapshot = {
    agentName: string;
    agentPermanentId: string;
    agentSource: string_book;
};

/**
 * Repository metadata resolved for one agent.
 */
export type ExternalAgentRepository = {
    fullName: string;
    defaultBranch: string;
};

/**
 * Loads one persisted agent source snapshot by permanent id.
 */
export async function loadExternalAgentSourceSnapshot(agentPermanentId: string): Promise<ExternalAgentSourceSnapshot> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select('agentName,permanentId,agentSource')
        .eq('permanentId', agentPermanentId)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load agent "${agentPermanentId}" for external repository sync: ${error.message}`);
    }

    if (!data?.permanentId || !data.agentName || typeof data.agentSource !== 'string') {
        throw new Error(`Agent "${agentPermanentId}" was not found for external repository sync.`);
    }

    return {
        agentName: data.agentName,
        agentPermanentId: data.permanentId,
        agentSource: data.agentSource as string_book,
    };
}

/**
 * Ensures the external GitHub repository for one agent exists and contains current baseline files.
 */
export async function ensureExternalAgentRepository(
    snapshot: ExternalAgentSourceSnapshot,
): Promise<ExternalAgentRepository> {
    const localConfiguration = loadLocalAgentRunnerConfiguration();
    if (localConfiguration) {
        return await ensureLocalAgentRunnerRepository(localConfiguration, snapshot);
    }

    const configuration = ensureExternalChatRunnerGithubConfiguration();
    return await ensureExternalAgentRepositoryWithConfiguration(configuration, snapshot);
}

/**
 * Best-effort repository synchronization used from non-chat source writes.
 */
export async function trySynchronizeExternalAgentRepository(snapshot: ExternalAgentSourceSnapshot): Promise<boolean> {
    const localConfiguration = loadLocalAgentRunnerConfiguration();
    if (localConfiguration) {
        await ensureLocalAgentRunnerRepository(localConfiguration, snapshot);
        return true;
    }

    const configuration = loadExternalChatRunnerGithubConfiguration();
    if (!configuration) {
        return false;
    }

    await ensureExternalAgentRepositoryWithConfiguration(configuration, snapshot);
    return true;
}

/**
 * Ensures one self-hosted local runner project contains current baseline files.
 */
async function ensureLocalAgentRunnerRepository(
    configuration: LocalAgentRunnerConfiguration,
    snapshot: ExternalAgentSourceSnapshot,
): Promise<ExternalAgentRepository> {
    const projectPath = join(
        configuration.agentRepositoriesDirectoryPath,
        createExternalAgentRepositoryName(snapshot.agentPermanentId),
    );
    const files = createExternalAgentRepositoryFiles(snapshot);

    await Promise.all([
        upsertLocalAgentRunnerFile({
            projectPath,
            path: 'agent.book',
            content: files.agentBook,
        }),
        upsertLocalAgentRunnerFile({
            projectPath,
            path: '.gitignore',
            content: files.gitignore,
        }),
        upsertLocalAgentRunnerFile({
            projectPath,
            path: 'package.json',
            content: files.packageJson,
        }),
        upsertLocalAgentRunnerFile({
            projectPath,
            path: 'README.md',
            content: files.readme,
        }),
        ...['messages/queued/.gitkeep', 'messages/finished/.gitkeep', 'messages/failed/.gitkeep'].map((path) =>
            createLocalAgentRunnerFileIfMissing({
                projectPath,
                path,
                content: '',
            }),
        ),
    ]);

    return {
        fullName: projectPath,
        defaultBranch: 'local',
    };
}

/**
 * Ensures the external repository using a preloaded configuration.
 */
async function ensureExternalAgentRepositoryWithConfiguration(
    configuration: ExternalChatRunnerGithubConfiguration,
    snapshot: ExternalAgentSourceSnapshot,
): Promise<ExternalAgentRepository> {
    const linkedRepositoryFullName = await loadLinkedRepositoryFullName(snapshot.agentPermanentId);
    const expectedRepositoryFullName = `${configuration.owner}/${createExternalAgentRepositoryName(
        snapshot.agentPermanentId,
    )}`;
    const repository =
        linkedRepositoryFullName === expectedRepositoryFullName
            ? await ensureGithubRepositoryExists(configuration, linkedRepositoryFullName)
            : await ensureAndLinkGithubRepository(configuration, snapshot, expectedRepositoryFullName);

    await synchronizeExternalAgentRepositoryFiles(configuration, repository.fullName, snapshot);

    return {
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
    };
}

/**
 * Loads the repository full name already linked through AgentExternals.
 */
async function loadLinkedRepositoryFullName(agentPermanentId: string): Promise<string | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('AgentExternals'))
        .select('externalId')
        .eq('type', EXTERNAL_AGENT_REPOSITORY_TYPE)
        .eq('hash', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load external repository link for agent "${agentPermanentId}": ${error.message}`);
    }

    return typeof data?.externalId === 'string' && data.externalId.trim().length > 0 ? data.externalId : null;
}

/**
 * Creates a repository and stores the AgentExternals link.
 */
async function ensureAndLinkGithubRepository(
    configuration: ExternalChatRunnerGithubConfiguration,
    snapshot: ExternalAgentSourceSnapshot,
    expectedRepositoryFullName: string,
): Promise<GithubRepositoryMetadata> {
    const existingRepository = await getGithubRepository(configuration, expectedRepositoryFullName);
    const repositoryName = expectedRepositoryFullName.split('/').pop();
    if (!repositoryName) {
        throw new Error(`Invalid expected external repository full name "${expectedRepositoryFullName}".`);
    }

    const repository = existingRepository || (await createGithubRepository(configuration, repositoryName));

    await linkExternalAgentRepository(snapshot, repository.fullName);

    return repository;
}

/**
 * Stores one AgentExternals row for the runner repository.
 */
async function linkExternalAgentRepository(
    snapshot: ExternalAgentSourceSnapshot,
    repositoryFullName: string,
): Promise<void> {
    const supabase = $provideSupabaseForServer();
    const { error } = await supabase.from(await $getTableName('AgentExternals')).upsert(
        {
            type: EXTERNAL_AGENT_REPOSITORY_TYPE,
            hash: snapshot.agentPermanentId,
            externalId: repositoryFullName,
            vendor: EXTERNAL_AGENT_REPOSITORY_VENDOR,
            note: `External chat runner repository for ${snapshot.agentName}`,
            updatedAt: new Date().toISOString(),
        },
        {
            onConflict: 'type,hash',
        },
    );

    if (error) {
        throw new Error(
            `Failed to link external repository "${repositoryFullName}" for agent "${snapshot.agentPermanentId}": ${error.message}`,
        );
    }
}

/**
 * Ensures a linked GitHub repository still exists.
 */
async function ensureGithubRepositoryExists(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryFullName: string,
): Promise<GithubRepositoryMetadata> {
    const repository = await getGithubRepository(configuration, repositoryFullName);
    if (repository) {
        return repository;
    }

    const repositoryName = repositoryFullName.split('/').pop();
    if (!repositoryName) {
        throw new Error(`Invalid external repository full name "${repositoryFullName}".`);
    }

    return await createGithubRepository(configuration, repositoryName);
}

/**
 * Synchronizes all baseline files in one external runner repository.
 */
async function synchronizeExternalAgentRepositoryFiles(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryFullName: string,
    snapshot: ExternalAgentSourceSnapshot,
): Promise<void> {
    const files = createExternalAgentRepositoryFiles(snapshot);
    await upsertGithubFile({
        configuration,
        repositoryFullName,
        path: 'agent.book',
        content: files.agentBook,
        message: `Sync agent source for ${snapshot.agentName}`,
    });
    await upsertGithubFile({
        configuration,
        repositoryFullName,
        path: '.gitignore',
        content: files.gitignore,
        message: 'Sync Promptbook runner gitignore',
    });
    await upsertGithubFile({
        configuration,
        repositoryFullName,
        path: 'package.json',
        content: files.packageJson,
        message: 'Sync Promptbook runner package',
    });
    await upsertGithubFile({
        configuration,
        repositoryFullName,
        path: 'README.md',
        content: files.readme,
        message: `Sync README for ${snapshot.agentName}`,
    });

    await Promise.all(
        ['messages/queued/.gitkeep', 'messages/finished/.gitkeep', 'messages/failed/.gitkeep'].map((path) =>
            createGithubFileIfMissing({
                configuration,
                repositoryFullName,
                path,
                content: '',
                message: 'Initialize external runner message folders',
            }),
        ),
    );
}

/**
 * Creates a stable GitHub repository name for one agent.
 */
export function createExternalAgentRepositoryName(agentPermanentId: string): string {
    const normalizedPermanentId = normalizeRepositoryNameSegment(agentPermanentId) || 'id';
    return `agent-${normalizedPermanentId}`;
}

/**
 * Normalizes one repository-name segment.
 */
function normalizeRepositoryNameSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^[._-]+|[._-]+$/g, '');
}
