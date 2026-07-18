import { MarkdownContent } from '@promptbook-local/components';
import { NotAllowed } from '../../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../../src/errors/NotFoundError';
import {
    ArrowLeftIcon,
    BookOpenTextIcon,
    ChevronRightIcon,
    ExternalLinkIcon,
    FileIcon,
    FolderIcon,
    FolderKanbanIcon,
    GitBranchIcon,
    PlugZapIcon,
    SquareIcon,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AgentProjectRuntimeStatusBadge } from '@/src/components/AgentProjects/AgentProjectRuntimeStatusBadge';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import {
    AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE,
    resolveAgentProjectsAccess,
} from '@/src/utils/agentProjects/agentProjectAccess';
import {
    buildAgentProjectFileHref,
    buildAgentProjectFolderHref,
    buildAgentProjectsDashboardHref,
} from '@/src/utils/agentProjects/agentProjectHrefs';
import {
    formatAgentProjectRuntimeMode,
    formatAgentProjectRuntimeStatus,
} from '@/src/utils/agentProjects/agentProjectRuntimeDisplay';
import { resolveAgentProjectRuntime } from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';
import type { AgentProjectRuntimeInfo } from '@/src/utils/agentProjects/AgentProjectRuntimeInfo';
import type {
    AgentProjectDirectoryEntry,
    AgentProjectDirectoryListing,
} from '@/src/utils/agentProjects/listAgentProjectDirectoryEntries';
import { listAgentProjectDirectoryEntries } from '@/src/utils/agentProjects/listAgentProjectDirectoryEntries';
import { readAgentProjectReadme } from '@/src/utils/agentProjects/readAgentProjectReadme';
import { resolveAgentProjectInfo } from '@/src/utils/agentProjects/resolveAgentProjectInfo';
import { buildAgentProfileHref } from '@/src/utils/agentRouting/agentRouteHrefs';
import { formatResourceBytes } from '@/src/utils/resourceMonitor/formatResourceMonitorValue';
import { enforceCanonicalLocalAgentId } from '../../_utils';
import { $terminateAgentProjectRuntimeFromProjectPageAction } from './actions';

/**
 * Query parameter used to choose the currently browsed project folder.
 */
const PROJECT_FOLDER_SEARCH_PARAM = 'folder';

/**
 * Forces fresh project details from disk on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Search parameters supported by the project profile page.
 */
type AgentProjectPageSearchParams = {
    /**
     * Folder path relative to the project root.
     */
    readonly folder?: string | ReadonlyArray<string>;
};

/**
 * Props accepted by the project profile route.
 */
type AgentProjectPageProps = {
    /**
     * Route parameters.
     */
    readonly params: Promise<{ agentName: string; projectName: string }>;

    /**
     * Query parameters.
     */
    readonly searchParams: Promise<AgentProjectPageSearchParams>;
};

/**
 * Builds canonical project profile path for one local agent id.
 *
 * @param canonicalAgentId - Canonical agent permanent id.
 * @param projectName - Project directory name.
 * @param directoryPathSegments - Currently browsed folder path segments.
 * @returns Canonical project path.
 */
function buildCanonicalAgentProjectPath(
    canonicalAgentId: string,
    projectName: string,
    directoryPathSegments: ReadonlyArray<string>,
): string {
    return buildAgentProjectFolderHref(canonicalAgentId, projectName, directoryPathSegments.join('/'));
}

/**
 * Renders the profile page of one agent project.
 *
 * @param props - Project page props.
 * @returns Project profile page.
 */
export default async function AgentProjectPage({ params, searchParams }: AgentProjectPageProps) {
    const [routeParams, currentSearchParams] = await Promise.all([params, searchParams]);
    const agentName = decodeRouteSegment(routeParams.agentName);
    const projectName = decodeRouteSegment(routeParams.projectName);
    const directoryPathSegments = resolveProjectDirectoryPathSegments(currentSearchParams);
    const canonicalAgentId = await enforceCanonicalLocalAgentId(agentName, (nextCanonicalAgentId) =>
        buildCanonicalAgentProjectPath(nextCanonicalAgentId, projectName, directoryPathSegments),
    );

    const access = await resolveAgentProjectsAccess(canonicalAgentId);
    if (!access.isProjectOverviewVisible) {
        return <ForbiddenPage />;
    }

    const project = await resolveAgentProjectInfo(canonicalAgentId, projectName);
    if (!project) {
        notFound();
    }

    const [readme, directoryListing, projectRuntime] = await Promise.all([
        readAgentProjectReadme(project.absolutePath),
        access.isProjectDetailsVisible
            ? resolveProjectDirectoryListing({
                  agentPermanentId: canonicalAgentId,
                  projectName,
                  directoryPathSegments,
              })
            : null,
        access.isProjectDetailsVisible ? resolveAgentProjectRuntime(canonicalAgentId, projectName) : null,
    ]);

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <ProjectProfileHeader
                agentPermanentId={canonicalAgentId}
                project={project}
                isProjectDetailsVisible={access.isProjectDetailsVisible}
            />
            {access.isProjectDetailsVisible && (
                <ProjectRuntimePanel
                    agentPermanentId={canonicalAgentId}
                    projectName={project.projectName}
                    runtime={projectRuntime}
                />
            )}
            {directoryListing ? (
                <ProjectDirectoryBrowser
                    agentPermanentId={canonicalAgentId}
                    projectName={project.projectName}
                    listing={directoryListing}
                />
            ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE}
                </div>
            )}
            <ProjectReadmePanel fileName={readme?.fileName ?? null} content={readme?.content ?? null} />
        </div>
    );
}

/**
 * Decodes one dynamic route segment without failing on already-decoded literal `%` characters.
 *
 * @param segment - Raw route segment.
 * @returns Decoded segment.
 */
function decodeRouteSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * Resolves the folder path segments from project profile query parameters.
 *
 * @param searchParams - Current query parameters.
 * @returns Directory path segments.
 */
function resolveProjectDirectoryPathSegments(searchParams: AgentProjectPageSearchParams): ReadonlyArray<string> {
    const folderValue: AgentProjectPageSearchParams[typeof PROJECT_FOLDER_SEARCH_PARAM] =
        searchParams[PROJECT_FOLDER_SEARCH_PARAM];
    const rawFolderValue: string | undefined = Array.isArray(folderValue) ? folderValue[0] : folderValue;

    if (!rawFolderValue) {
        return [];
    }

    return rawFolderValue.split('/').filter((folderPathSegment: string) => folderPathSegment.length > 0);
}

/**
 * Loads the current-folder listing or routes invalid/missing folders to a 404 page.
 *
 * @param options - Agent, project, and current folder segments.
 * @returns Current-folder listing.
 */
async function resolveProjectDirectoryListing(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly directoryPathSegments: ReadonlyArray<string>;
}): Promise<AgentProjectDirectoryListing> {
    try {
        return await listAgentProjectDirectoryEntries(options);
    } catch (error) {
        if (error instanceof NotAllowed || error instanceof NotFoundError) {
            notFound();
        }

        throw error;
    }
}

/**
 * Renders runtime status and controls for one project.
 *
 * @param props - Runtime panel props.
 * @returns Runtime panel.
 */
function ProjectRuntimePanel({
    agentPermanentId,
    projectName,
    runtime,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Runtime assigned to the project.
     */
    readonly runtime: AgentProjectRuntimeInfo | null;
}) {
    if (!runtime) {
        return (
            <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <PlugZapIcon className="h-4 w-4 text-gray-400" aria-hidden />
                    <span className="font-semibold text-gray-900">Runtime</span>
                    <span>Project is not running.</span>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <PlugZapIcon className="h-4 w-4 text-gray-500" aria-hidden />
                        <h2 className="text-sm font-semibold text-gray-900">Runtime</h2>
                        <AgentProjectRuntimeStatusBadge isRunning={runtime.isRunning}>
                            {formatAgentProjectRuntimeStatus(runtime)}
                        </AgentProjectRuntimeStatusBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>{formatAgentProjectRuntimeMode(runtime.mode)}</span>
                        <a
                            href={runtime.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-blue-700 hover:text-blue-900 hover:underline"
                        >
                            {runtime.url}
                            <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden />
                        </a>
                        {runtime.command && (
                            <span className="max-w-full truncate font-mono text-xs text-gray-500">
                                {runtime.command}
                            </span>
                        )}
                    </div>
                </div>
                <form
                    action={$terminateAgentProjectRuntimeFromProjectPageAction.bind(
                        null,
                        agentPermanentId,
                        projectName,
                    )}
                >
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                        <SquareIcon className="h-4 w-4" aria-hidden />
                        {runtime.isRunning ? 'Terminate' : 'Release port'}
                    </button>
                </form>
            </div>
        </section>
    );
}

/**
 * Renders the project profile header.
 *
 * @param props - Header props.
 * @returns Project profile header.
 */
function ProjectProfileHeader({
    agentPermanentId,
    project,
    isProjectDetailsVisible,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project metadata.
     */
    readonly project: NonNullable<Awaited<ReturnType<typeof resolveAgentProjectInfo>>>;

    /**
     * Whether detailed project metadata can be shown.
     */
    readonly isProjectDetailsVisible: boolean;
}) {
    return (
        <div className="mt-20 space-y-4">
            <Link
                href={buildAgentProjectsDashboardHref(agentPermanentId)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
            >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                All projects
            </Link>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Project</p>
                    <h1 className="mt-1 flex min-w-0 items-center gap-2 text-3xl font-light text-gray-900">
                        <FolderKanbanIcon className="h-7 w-7 shrink-0 text-gray-400" aria-hidden />
                        <span className="truncate">{project.displayName}</span>
                    </h1>
                    {project.displayName !== project.projectName && (
                        <p className="mt-1 font-mono text-xs text-gray-400">{project.projectName}</p>
                    )}
                    {project.description && <p className="mt-2 max-w-3xl text-sm text-gray-600">{project.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Link
                        href={buildAgentProfileHref(agentPermanentId)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:border-blue-200 hover:text-blue-700"
                    >
                        Agent profile
                    </Link>
                    <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 font-mono text-gray-700">
                        {formatResourceBytes(project.sizeBytes)}
                    </span>
                    {isProjectDetailsVisible && (
                        <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-700">
                            {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
                        </span>
                    )}
                    {project.isGitRepository && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                            <GitBranchIcon className="h-3.5 w-3.5" aria-hidden />
                            git
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the current-folder browser.
 *
 * @param props - Browser props.
 * @returns Project directory browser.
 */
function ProjectDirectoryBrowser({
    agentPermanentId,
    projectName,
    listing,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Current-folder listing.
     */
    readonly listing: AgentProjectDirectoryListing;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <ProjectDirectoryBreadcrumbs
                agentPermanentId={agentPermanentId}
                projectName={projectName}
                directoryPathSegments={listing.directoryPathSegments}
            />
            {listing.entries.length === 0 ? (
                <ProjectDirectoryEmptyState />
            ) : (
                <ul className="divide-y divide-gray-100">
                    {listing.directoryPathSegments.length > 0 && (
                        <ProjectParentDirectoryRow
                            agentPermanentId={agentPermanentId}
                            projectName={projectName}
                            directoryPathSegments={listing.directoryPathSegments}
                        />
                    )}
                    {listing.entries.map((entry) => (
                        <ProjectDirectoryEntryRow
                            key={entry.relativePath}
                            agentPermanentId={agentPermanentId}
                            projectName={projectName}
                            entry={entry}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

/**
 * Renders the breadcrumb for the current project folder.
 *
 * @param props - Breadcrumb props.
 * @returns Folder breadcrumb.
 */
function ProjectDirectoryBreadcrumbs({
    agentPermanentId,
    projectName,
    directoryPathSegments,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Current folder path segments.
     */
    readonly directoryPathSegments: ReadonlyArray<string>;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <Link
                href={buildAgentProjectFolderHref(agentPermanentId, projectName, '')}
                className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
            >
                {projectName}
            </Link>
            {directoryPathSegments.map((directoryPathSegment, index) => {
                const nextDirectoryRelativePath = directoryPathSegments.slice(0, index + 1).join('/');

                return (
                    <span key={`${nextDirectoryRelativePath}-${directoryPathSegment}`} className="flex items-center gap-1">
                        <ChevronRightIcon className="h-4 w-4 text-gray-300" aria-hidden />
                        <Link
                            href={buildAgentProjectFolderHref(
                                agentPermanentId,
                                projectName,
                                nextDirectoryRelativePath,
                            )}
                            className="font-medium text-gray-700 hover:text-blue-700 hover:underline"
                        >
                            {directoryPathSegment}
                        </Link>
                    </span>
                );
            })}
        </div>
    );
}

/**
 * Renders a parent-directory row.
 *
 * @param props - Parent row props.
 * @returns Parent directory row.
 */
function ProjectParentDirectoryRow({
    agentPermanentId,
    projectName,
    directoryPathSegments,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Current directory path segments.
     */
    readonly directoryPathSegments: ReadonlyArray<string>;
}) {
    const parentDirectoryRelativePath = directoryPathSegments.slice(0, -1).join('/');

    return (
        <li>
            <Link
                href={buildAgentProjectFolderHref(agentPermanentId, projectName, parentDirectoryRelativePath)}
                className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-2 text-sm hover:bg-blue-50/60"
            >
                <span className="flex min-w-0 items-center gap-2 font-medium text-gray-700">
                    <FolderIcon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span className="truncate">..</span>
                </span>
                <span className="hidden text-xs text-gray-400 sm:block">Parent folder</span>
                <span className="w-16" aria-hidden />
            </Link>
        </li>
    );
}

/**
 * Renders one project directory entry row.
 *
 * @param props - Entry row props.
 * @returns Directory entry row.
 */
function ProjectDirectoryEntryRow({
    agentPermanentId,
    projectName,
    entry,
}: {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Directory entry to render.
     */
    readonly entry: AgentProjectDirectoryEntry;
}) {
    const href =
        entry.kind === 'directory'
            ? buildAgentProjectFolderHref(agentPermanentId, projectName, entry.relativePath)
            : buildAgentProjectFileHref(agentPermanentId, projectName, entry.relativePath);
    const Icon = entry.kind === 'directory' ? FolderIcon : FileIcon;

    return (
        <li>
            <Link
                href={href}
                target={entry.kind === 'file' ? '_blank' : undefined}
                rel={entry.kind === 'file' ? 'noreferrer' : undefined}
                className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-2 text-sm hover:bg-blue-50/60"
            >
                <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
                    <Icon
                        className={`h-4 w-4 shrink-0 ${entry.kind === 'directory' ? 'text-blue-600' : 'text-gray-400'}`}
                        aria-hidden
                    />
                    <span className="truncate">{entry.name}</span>
                </span>
                <span className="hidden text-xs text-gray-400 sm:block">
                    {entry.latestModifiedAt ? formatProjectTimestamp(entry.latestModifiedAt) : ''}
                </span>
                <span className="w-16 text-right font-mono text-xs text-gray-500">
                    {entry.sizeBytes === null ? '' : formatResourceBytes(entry.sizeBytes)}
                </span>
            </Link>
        </li>
    );
}

/**
 * Renders an empty-directory state.
 *
 * @returns Empty directory state.
 */
function ProjectDirectoryEmptyState() {
    return (
        <div className="px-4 py-10 text-center text-sm text-gray-500">
            <FolderIcon className="mx-auto h-7 w-7 text-gray-300" aria-hidden />
            <p className="mt-2">This folder is empty.</p>
        </div>
    );
}

/**
 * Renders the README panel of a project.
 *
 * @param props - README props.
 * @returns README panel.
 */
function ProjectReadmePanel({
    fileName,
    content,
}: {
    /**
     * README filename.
     */
    readonly fileName: string | null;

    /**
     * README markdown content.
     */
    readonly content: string | null;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <BookOpenTextIcon className="h-4 w-4 text-gray-500" aria-hidden />
                <h2 className="text-sm font-semibold text-gray-900">{fileName || 'README'}</h2>
            </div>
            {content ? (
                <article className="prose prose-sm prose-slate max-w-none px-5 py-4 prose-headings:text-gray-900 prose-a:text-blue-700 prose-code:rounded-md prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none">
                    <MarkdownContent content={content} />
                </article>
            ) : (
                <div className="px-5 py-8 text-sm text-gray-500">This project has no README file.</div>
            )}
        </section>
    );
}

/**
 * Formats one project timestamp for display.
 *
 * @param isoTimestamp - ISO timestamp.
 * @returns Human-readable timestamp.
 */
function formatProjectTimestamp(isoTimestamp: string): string {
    return new Date(isoTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
