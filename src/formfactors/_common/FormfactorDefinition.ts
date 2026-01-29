import { FORMFACTOR_DEFINITIONS } from '../index';
//       <- TODO: Keep this a type import even if the entity is runtime but used as a type

/**
 * FormfactorDefinition is a type that defines the structure and capabilities of a specific
 * application form factor in the Promptbook system. It encapsulates all properties needed
 * to represent how a particular interface handles inputs, outputs, and behaviors.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/172
 */
export type FormfactorDefinition = (typeof FORMFACTOR_DEFINITIONS)[number];
