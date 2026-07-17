import { FileIcon, FolderKanbanIcon, GitBranchIcon } from 'lucide-react';
import type { AgentProjectInfo } from '../../utils/agentProjects/AgentProjectInfo';
import { buildAgentProjectFileHref } from '../../utils/agentProjects/agentProjectHrefs';
import { listAgentProjectFiles } from '../../utils/agentProjects/listAgentProjectFiles';
import { formatResourceBytes } from '../../utils/resourceMonitor/formatResourceMonitorValue';

/**
 * Upper bound of files listed inside one project card.
 */
const MAX_LISTED_PROJECT_FILES = 100;

/**
 * Props of one agent project card.
 *
 * @private component of Agent Projects dashboards
 */
type AgentProjectCardProps = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Displayed project metadata.
     */
    readonly project: AgentProjectInfo;

    /**
     * Whether admin-only details (like the absolute folder path on the server disk) are shown.
     */
    readonly isAdminView: boolean;
};

/**
 * Renders one agent project as a card with metadata and a browsable file listing.
 *
 * @private component of Agent Projects dashboards
 */
export async function AgentProjectCard({ agentPermanentId, project, isAdminView }: AgentProjectCardProps) {
    const fileListing = await listAgentProjectFiles(project.absolutePath, MAX_LISTED_PROJECT_FILES);

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FolderKanbanIcon className="h-5 w-5 text-gray-500" aria-hidden />
                    <h3 className="text-lg font-semibold text-gray-900">{project.projectName}</h3>
                    {project.isGitRepository && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <GitBranchIcon className="h-3 w-3" aria-hidden />
                            git
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span>{formatResourceBytes(project.sizeBytes)}</span>
                    <span>
                        {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
                    </span>
                    {project.latestModifiedAt && (
                        <span>Updated {formatProjectTimestamp(project.latestModifiedAt)}</span>
                    )}
                </div>
            </div>
            <div className="mt-1 text-xs text-gray-400">
                <code>{isAdminView ? project.absolutePath : project.relativePath}</code>
            </div>
            <ProjectFileList
                agentPermanentId={agentPermanentId}
                projectName={project.projectName}
                fileListing={fileListing}
            />
        </section>
    );
}

/**
 * Renders the expandable file listing of one project.
 *
 * @private component of Agent Projects dashboards
 */
function ProjectFileList({
    agentPermanentId,
    projectName,
    fileListing,
}: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly fileListing: Awaited<ReturnType<typeof listAgentProjectFiles>>;
}) {
    if (fileListing.files.length === 0) {
        return <p className="mt-3 text-sm text-gray-500">This project is empty.</p>;
    }

    return (
        <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-blue-700 hover:text-blue-900">
                Browse {fileListing.files.length}
                {fileListing.omittedFileCount > 0 ? ` of ${fileListing.files.length + fileListing.omittedFileCount}` : ''}{' '}
                files
            </summary>
            <ul className="mt-2 space-y-1 border-l border-gray-100 pl-4">
                {fileListing.files.map((projectFile) => (
                    <li key={projectFile.relativePath} className="flex items-center justify-between gap-3 text-sm">
                        <a
                            href={buildAgentProjectFileHref(agentPermanentId, projectName, projectFile.relativePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1.5 text-gray-700 hover:text-blue-700 hover:underline"
                        >
                            <FileIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                            <span className="truncate">{projectFile.relativePath}</span>
                        </a>
                        <span className="shrink-0 text-xs text-gray-400">
                            {formatResourceBytes(projectFile.sizeBytes)}
                        </span>
                    </li>
                ))}
                {fileListing.omittedFileCount > 0 && (
                    <li className="text-xs text-gray-400">…and {fileListing.omittedFileCount} more files</li>
                )}
            </ul>
        </details>
    );
}

/**
 * Formats one project timestamp for display.
 *
 * @private utility of Agent Projects dashboards
 */
function formatProjectTimestamp(isoTimestamp: string): string {
    return new Date(isoTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
