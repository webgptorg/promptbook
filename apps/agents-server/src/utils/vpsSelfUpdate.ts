// Note: This file is a thin facade over the focused modules under `./vpsSelfUpdate/`.
//       It keeps the public standalone VPS self-update API stable while the launcher,
//       overview builder, git readers, persisted job state, and configuration helpers
//       remain split across small, single-responsibility modules.

export { listVpsSelfUpdateCandidateCommits } from './vpsSelfUpdate/listVpsSelfUpdateCandidateCommits';
export { readVpsSelfUpdateJobSnapshot } from './vpsSelfUpdate/readPersistedVpsSelfUpdateJob';
export { readVpsSelfUpdateOverview } from './vpsSelfUpdate/readVpsSelfUpdateOverview';
export { resolveVpsSelfUpdateJobForOverview } from './vpsSelfUpdate/resolveVpsSelfUpdateJobForOverview';
export { startVpsSelfUpdate } from './vpsSelfUpdate/startVpsSelfUpdate';
export {
    getCustomVpsSelfUpdateEnvironment,
    getDefaultVpsSelfUpdateEnvironment,
    resolveVpsSelfUpdateEnvironment,
    VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID,
    VPS_SELF_UPDATE_ENVIRONMENTS,
} from './vpsSelfUpdate/vpsSelfUpdateEnvironment';
export { VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL } from './vpsSelfUpdate/vpsSelfUpdateOriginRepository';
export {
    encodeStatusField,
    readVpsSelfUpdateLogFileContent,
    resolveVpsSelfUpdateLogFilePath,
    resolveVpsSelfUpdateStatusFilePath,
} from './vpsSelfUpdate/vpsSelfUpdateStateFiles';

export type { VpsSelfUpdateEnvironmentId, VpsSelfUpdateEnvironmentOption } from './vpsSelfUpdate/vpsSelfUpdateEnvironment';
export type {
    VpsSelfUpdateCandidateCommit,
    VpsSelfUpdateCandidateCommitsFilter,
    VpsSelfUpdateJobOverviewContext,
    VpsSelfUpdateJobSnapshot,
    VpsSelfUpdateJobStatus,
    VpsSelfUpdateOverview,
    VpsSelfUpdatePendingCommit,
    VpsSelfUpdateStartRequest,
} from './vpsSelfUpdate/vpsSelfUpdateTypes';
