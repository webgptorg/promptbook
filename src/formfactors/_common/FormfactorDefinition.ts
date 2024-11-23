import { FORMFACTOR_DEFINITIONS } from '../index';
//       <- TODO: !!!!!! Keep type import

/**
 * @@@
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/172
 */
export type FormfactorDefinition = typeof FORMFACTOR_DEFINITIONS[number];
