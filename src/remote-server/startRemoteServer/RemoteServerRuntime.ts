import type express from 'express';
import type { ExecutionTask } from '../../execution/ExecutionTask';
import type { StartRemoteServerConfiguration } from './StartRemoteServerConfiguration';

/**
 * Runtime state shared by HTTP and Socket.io handlers.
 *
 * @private internal utility of `startRemoteServer`
 */
export type RemoteServerRuntime<TCustomOptions> = {
    readonly app: express.Express;
    readonly configuration: StartRemoteServerConfiguration<TCustomOptions>;
    readonly runningExecutionTasks: Array<ExecutionTask>;
    readonly startupDate: Date;
};
