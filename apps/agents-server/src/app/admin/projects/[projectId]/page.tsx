import { ArrowLeft, File, FileSymlink, Folder, FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import {
    createAgentProjectFilePathname,
    listAgentProjectDirectoryEntries,
    normalizeProjectRelativePath,
    readAgentProjectDirectoryUsage,
    resolveAgentProjectReadAccess,
    type AgentProjectDirectoryListing,
    type AgentProjectRecord,
} from '../../../../utils/agentProjects';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { formatResourceBytes } from '../../../../utils/resourceMonitor/formatResourceMonitorValue';
import { parseAgentProjectIdRouteParameter } from '../../../api/agent-projects/parseAgentProjectIdRouteParameter';

/**
 * Forces fresh folder listings for every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Props of the admin project folder browser page.
 */
type AgentProjectBrowsePageProps = {
    readonly params: Promise<{ projectId: string }>;
    readonly searchParams: Promise<{ path?: string }>;
};

/**
 * Admin page browsing one agent project folder.
 */
export default async function AgentProjectBrowseAdminPage({ params, searchParams }: AgentProjectBrowsePageProps) {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const { projectId } = await params;
    const { path } = await searchParams;
    const parsedProjectId = parseAgentProjectIdRouteParameter(projectId);

    if (parsedProjectId === null) {
        return <ProjectBrowseMessage message="Invalid project id." />;
    }

    const accessResult = await resolveAgentProjectReadAccess(parsedProjectId, await getCurrentUser());
    if (!accessResult.isAllowed) {
        return <ProjectBrowseMessage message={accessResult.message} />;
    }

    const project = accessResult.project;
    const requestedPath = normalizeBrowsePath(path);
    const usage = await readAgentProjectDirectoryUsage(project.directoryPath);
    let listing: AgentProjectDirectoryListing | null = null;
    let listingErrorMessage: string | null = null;

    try {
        listing = await listAgentProjectDirectoryEntries(project.directoryPath, requestedPath);
    } catch (error) {
        listingErrorMessage = error instanceof Error ? error.message : 'Project folder cannot be listed.';
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <ProjectBrowseHeader
                project={project}
                sizeBytes={usage.sizeBytes}
                fileCount={usage.fileCount}
                isGitRepository={usage.isGitRepository}
            />
            <ProjectBreadcrumbs projectId={project.id} projectName={project.name} path={requestedPath} />
            {listing ? (
                <ProjectEntriesTable projectId={project.id} listing={listing} />
            ) : (
                <ProjectBrowseMessage message={listingErrorMessage || 'Project folder cannot be listed.'} />
            )}
        </div>
    );
}

/**
 * Normalizes the requested browse path, treating invalid paths as the project root.
 *
 * @private function of `AgentProjectBrowseAdminPage`
 */
function normalizeBrowsePath(rawPath: string | undefined): string {
    if (!rawPath) {
        return '';
    }

    try {
        return normalizeProjectRelativePath(rawPath, { isEmptyPathAllowed: true });
    } catch {
        return '';
    }
}

/**
 * Renders project heading with folder metadata.
 */
function ProjectBrowseHeader({
    project,
    sizeBytes,
    fileCount,
    isGitRepository,
}: {
    readonly project: AgentProjectRecord;
    readonly sizeBytes: number;
    readonly fileCount: number;
    readonly isGitRepository: boolean;
}) {
    return (
        <div className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Administration</p>
                <h1 className="mt-1 flex items-center gap-2 text-3xl font-light text-gray-900">
                    {project.name}
                    {isGitRepository ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
                            Repository
                        </span>
                    ) : null}
                </h1>
                <p className="mt-1 max-w-3xl break-all font-mono text-xs text-gray-500">{project.directoryPath}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    {fileCount.toLocaleString()} files, {formatResourceBytes(sizeBytes)}
                </span>
                <Link
                    href="/admin/projects"
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All projects
                </Link>
            </div>
        </div>
    );
}

/**
 * Renders folder breadcrumbs inside one project.
 */
function ProjectBreadcrumbs({
    projectId,
    projectName,
    path,
}: {
    readonly projectId: number;
    readonly projectName: string;
    readonly path: string;
}) {
    const segments = path ? path.split('/') : [];

    return (
        <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
            <Link href={`/admin/projects/${projectId}`} className="text-blue-700 hover:underline">
                {projectName}
            </Link>
            {segments.map((segment, segmentIndex) => {
                const segmentPath = segments.slice(0, segmentIndex + 1).join('/');
                return (
                    <span key={segmentPath} className="flex items-center gap-1">
                        <span className="text-gray-400">/</span>
                        <Link
                            href={`/admin/projects/${projectId}?path=${encodeURIComponent(segmentPath)}`}
                            className="text-blue-700 hover:underline"
                        >
                            {segment}
                        </Link>
                    </span>
                );
            })}
        </nav>
    );
}

/**
 * Renders one project directory listing.
 */
function ProjectEntriesTable({
    projectId,
    listing,
}: {
    readonly projectId: number;
    readonly listing: AgentProjectDirectoryListing;
}) {
    if (listing.entries.length === 0) {
        return <ProjectBrowseMessage message="This folder is empty." />;
    }

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                            <th className="py-2 pr-4 font-semibold">Name</th>
                            <th className="py-2 pr-4 font-semibold">Size</th>
                            <th className="py-2 pr-4 font-semibold">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listing.entries.map((entry) => (
                            <tr key={entry.path} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 pr-4 align-top">
                                    {entry.type === 'directory' ? (
                                        <Link
                                            href={`/admin/projects/${projectId}?path=${encodeURIComponent(
                                                entry.path,
                                            )}`}
                                            className="flex items-center gap-2 font-medium text-blue-700 hover:underline"
                                        >
                                            <Folder className="h-4 w-4 text-gray-400" aria-hidden />
                                            {entry.name}
                                        </Link>
                                    ) : (
                                        <a
                                            href={createAgentProjectFilePathname(projectId, entry.path)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 text-gray-900 hover:text-blue-700 hover:underline"
                                        >
                                            {entry.type === 'symlink' ? (
                                                <FileSymlink className="h-4 w-4 text-gray-400" aria-hidden />
                                            ) : (
                                                <File className="h-4 w-4 text-gray-400" aria-hidden />
                                            )}
                                            {entry.name}
                                        </a>
                                    )}
                                </td>
                                <td className="py-2 pr-4 align-top text-gray-700">
                                    {entry.type === 'directory' ? '—' : formatResourceBytes(entry.sizeBytes)}
                                </td>
                                <td className="py-2 pr-4 align-top text-gray-700">
                                    {new Date(entry.updatedAt).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {listing.isTruncated ? (
                <p className="mt-3 text-xs text-amber-700">
                    Listing truncated to {listing.entries.length.toLocaleString()} of{' '}
                    {listing.totalEntryCount.toLocaleString()} entries.
                </p>
            ) : null}
        </section>
    );
}

/**
 * Renders one informational message box.
 */
function ProjectBrowseMessage({ message }: { readonly message: string }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            {message}
        </section>
    );
}
