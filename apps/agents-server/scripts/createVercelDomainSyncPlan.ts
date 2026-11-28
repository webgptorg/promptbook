export {
    type DesiredVercelProjectDomain,
    type VercelApiConfiguration,
    type VercelCustomEnvironment,
    type VercelDomainConfiguration,
    type VercelDomainReconfiguration,
    type VercelDomainSyncPlan,
    type VercelProjectDomain,
    type VercelProjectMetadata,
} from './createVercelDomainSyncPlan/VercelDomainSyncPlan';
export { addProjectDomain } from './createVercelDomainSyncPlan/addProjectDomain';
export { createVercelDomainSyncPlan } from './createVercelDomainSyncPlan/createVercelDomainSyncPlan';
export { getVercelDomainConfiguration } from './createVercelDomainSyncPlan/getVercelDomainConfiguration';
export { listProjectDomains } from './createVercelDomainSyncPlan/listProjectDomains';
export { loadProjectMetadata } from './createVercelDomainSyncPlan/loadProjectMetadata';
export { loadVercelApiConfiguration } from './createVercelDomainSyncPlan/loadVercelApiConfiguration';
export { normalizeVercelDomainBinding } from './createVercelDomainSyncPlan/normalizeVercelDomainBinding';
export { removeProjectDomain } from './createVercelDomainSyncPlan/removeProjectDomain';
export { resolveDesiredProjectDomain } from './createVercelDomainSyncPlan/resolveDesiredProjectDomain';
export { verifyProjectDomain } from './createVercelDomainSyncPlan/verifyProjectDomain';
