import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { loadAgentOrganizationState } from '../../../utils/agentOrganization/loadAgentOrganizationState';
import { getFolderPathSegments } from '../../../utils/agentOrganization/folderPath';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import type { UsageActorType, UsageAgentOption, UsageCallType, UsageFolderOption, UsageTimeframePreset } from '../../../utils/usageAdmin';
import { UsageClient } from './UsageClient';

/**
 * Search params supported by the usage page.
 */
type AdminUsagePageSearchParams = {
    agentName?: string;
    folderId?: string;
    timeframe?: string;
    from?: string;
    to?: string;
    callType?: string;
    actorType?: string;
};

/**
 * Admin usage analytics page.
 */
export default async function AdminUsagePage({
    searchParams,
}: {
    searchParams?: Promise<AdminUsagePageSearchParams>;
}) {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const organization = await loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true });
    const resolvedSearchParams = (await searchParams) || {};

    const folderById = new Map(organization.folders.map((folder) => [folder.id, folder] as const));
    const folders: UsageFolderOption[] = organization.folders
        .map((folder) => {
            const segments = getFolderPathSegments(folder.id, folderById).map((segment) => segment.name);
            return {
                id: folder.id,
                name: segments.join(' / ') || folder.name,
                parentId: folder.parentId,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const agents: UsageAgentOption[] = organization.agents
        .map((agent) => ({
            agentName: agent.agentName,
            fullname: typeof agent.meta?.fullname === 'string' ? agent.meta.fullname : null,
            folderId: agent.folderId,
        }))
        .sort((a, b) => {
            const aName = (a.fullname || a.agentName).toLowerCase();
            const bName = (b.fullname || b.agentName).toLowerCase();
            return aName.localeCompare(bName);
        });

    return (
        <UsageClient
            folders={folders}
            agents={agents}
            initialAgentName={resolveOptionalText(resolvedSearchParams.agentName)}
            initialFolderId={resolveOptionalFolderId(resolvedSearchParams.folderId)}
            initialTimeframe={resolveTimeframePreset(resolvedSearchParams.timeframe)}
            initialFrom={resolveOptionalDate(resolvedSearchParams.from)}
            initialTo={resolveOptionalDate(resolvedSearchParams.to)}
            initialCallType={resolveCallType(resolvedSearchParams.callType)}
            initialActorType={resolveActorType(resolvedSearchParams.actorType)}
        />
    );
}

/**
 * Normalizes optional string values.
 */
function resolveOptionalText(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses optional folder id query value.
 */
function resolveOptionalFolderId(value: string | undefined): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

/**
 * Parses timeframe preset from query.
 */
function resolveTimeframePreset(value: string | undefined): UsageTimeframePreset {
    if (value === '24h' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') {
        return value;
    }
    return '30d';
}

/**
 * Parses optional date string from query.
 */
function resolveOptionalDate(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Parses optional call type from query.
 */
function resolveCallType(value: string | undefined): UsageCallType | null {
    if (value === 'WEB_CHAT' || value === 'VOICE_CHAT' || value === 'COMPATIBLE_API') {
        return value;
    }
    return null;
}

/**
 * Parses optional actor type from query.
 */
function resolveActorType(value: string | undefined): UsageActorType | null {
    if (value === 'ANONYMOUS' || value === 'TEAM_MEMBER' || value === 'API_KEY') {
        return value;
    }
    return null;
}
