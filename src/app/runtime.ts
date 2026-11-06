import { createHash } from 'node:crypto';
import type { Agenda } from '../engine/agenda.js';
import type { Project } from '../project/workspace.js';
import { EngineApi } from './api/engine-api.js';
import { CONFORMANCE_BUILD } from './build.js';
import { AppConnection, type AppConnectionOptions } from './connection.js';
import type { ProjectOnboarding } from './onboarding.js';
import { appDirectory } from './settings.js';
import { engineHomePage } from './web/documents.js';
import { UiLoader } from './web/ui-loader.js';

/** Opens the shared App connection and verified UI loader for either lifecycle stage. @private App connection */
export async function createAppRuntime(options: Pick<AppConnectionOptions, 'env' | 'figures' | 'log' | 'onChange'> & {
    readonly project: Project;
    readonly agenda?: Agenda;
    readonly onboarding?: ProjectOnboarding;
}): Promise<{ readonly connection: AppConnection; readonly loader: UiLoader }> {
    const { project, env, agenda, onboarding, log, figures, onChange } = options;
    const directory = appDirectory(project.runtime.app, env);
    const loader = await UiLoader.create({ directory, env, log });
    const pageHash = createHash('sha256').update(engineHomePage.toString()).digest('hex');
    const view = (): ReturnType<AppConnection['view']> => connection.view();
    const api: EngineApi = new EngineApi({
        agenda, onboarding, projectRoot: project.root, stateDirectory: directory,
        engineId: () => view().engineId, hostname: () => view().hostname, dashboardUrl: () => view().dashboardUrl,
        security: () => connection.securityFacts(), ui: () => loader.status(pageHash), log,
    });
    const connection: AppConnection = new AppConnection({
        directory, env, figures, onChange, log,
        web: {
            api: (request, actor, access) => api.handle(request, actor, access),
            documents: async (request, actor) => (await loader.serve(request)) ?? engineHomePage(request, actor, { name: agenda?.snapshot().project.name || 'Project setup', engineId: view().engineId }),
            ...(CONFORMANCE_BUILD ? { certificateSource: 'dev-ca' as const } : {}),
        },
    });
    return { connection, loader };
}
