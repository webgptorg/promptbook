import { ChatbotFormfactorDefinition } from './chatbot/ChatbotFormfactorDefinition';
import { GeneratorFormfactorDefinition } from './generator/GeneratorFormfactorDefinition';
import { GenericFormfactorDefinition } from './generic/GenericFormfactorDefinition';
import { ImageGeneratorFormfactorDefinition } from './image-generator/ImageGeneratorFormfactorDefinition';
import { MatcherFormfactorDefinition } from './matcher/MatcherFormfactorDefinition';
import { SheetsFormfactorDefinition } from './sheets/SheetsFormfactorDefinition';
import { TranslatorFormfactorDefinition } from './translator/TranslatorFormfactorDefinition';

/**
 * All available formfactor definitions
 *
 * @public exported from `@promptbook/core`
 */
export const FORMFACTOR_DEFINITIONS = [
    GenericFormfactorDefinition,
    ChatbotFormfactorDefinition,
    TranslatorFormfactorDefinition,
    SheetsFormfactorDefinition,
    MatcherFormfactorDefinition,
    GeneratorFormfactorDefinition,
    ImageGeneratorFormfactorDefinition,
    // <- [🛬] When making new formfactor, copy the _boilerplate and link it here
] as const;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
