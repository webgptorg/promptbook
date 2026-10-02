/**
 * Registers `ptbk coder server` using the exact canonical `ptbk server` registration/action helper.
 * @private internal compatibility alias of `ptbk server`
 */
export { $initializeServerCommand as $initializeCoderServerCommand } from '../server';

// Note: [🟡] Workspace server alias is only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
