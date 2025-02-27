import type { FORMFACTOR_DEFINITIONS } from "../index";
//       <- TODO: Keep this a type import even if the entity is runtime but used as a type

/**
 * @@@
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/172
 */
export type FormfactorDefinition = (typeof FORMFACTOR_DEFINITIONS)[number];
