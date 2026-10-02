import { getCurrentUser } from '../../utils/getCurrentUser';
import { WorkspaceExecutionView } from './WorkspaceExecutionView';

/** Existing Agent Server layout/navigation surrounds the authenticated project execution view. */
export default async function WorkspacePage() {
    if (!(await getCurrentUser())?.isAdmin) return <p>Sign in as an administrator to inspect project execution.</p>;
    if (!process.env.PTBK_AGENTS_SERVER_WORKSPACE) return <p>This server uses standalone agent storage.</p>;
    return <WorkspaceExecutionView />;
}
