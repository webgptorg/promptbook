import { ChatFormfactorDefinition } from './chat/ChatFormfactorDefinition';
import { GenericFormfactorDefinition } from './generic/GenericFormfactorDefinition';

/**
 * All available formfactor definitions
 *
 * @public exported from `@promptbook/core`
 */
export const FORMFACTOR_DEFINITIONS = [GenericFormfactorDefinition, ChatFormfactorDefinition] as const;
