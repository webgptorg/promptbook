import { spaceTrim } from 'spacetrim';

/**
 * Shared constraints for initial repair PRDs and post-prompt check feedback.
 */
export const CHECK_REPAIR_INSTRUCTIONS = spaceTrim(`
    Fix the underlying lint, typechecking, build, generated-code consistency, or test failure without weakening validation.
    Do not delete assertions, disable lint rules, remove failing checks from the aggregate, lower quality thresholds,
    skip a build, or force exit code zero merely to obtain a pass. Keep the project's chosen check scope intact.
    Missing or unconfigured validation requires project-owner setup; never replace it with a meaningless green result.
`);
