import { executeCommandParser } from './EXECUTE/executeCommandParser';
import { expectCommandParser } from './EXPECT/expectCommandParser';
import { jokerCommandParser } from './JOKER/jokerCommandParser';
import { knowledgeCommandParser } from './KNOWLEDGE/knowledgeCommandParser';
import { modelCommandParser } from './MODEL/modelCommandParser';
import { parameterCommandParser } from './PARAMETER/parameterCommandParser';
import { postprocessCommandParser } from './POSTPROCESS/postprocessCommandParser';
import { promptbookVersionCommandParser } from './PROMPTBOOK_VERSION/promptbookVersionCommandParser';
import { urlCommandParser } from './URL/urlCommandParser';
import { boilerplateCommandParser } from './_BOILERPLATE/boilerplateCommandParser';

/**
 * All available command parsers
 */
export const COMMANDS = [
    executeCommandParser,
    expectCommandParser,
    jokerCommandParser,
    modelCommandParser,
    parameterCommandParser,
    postprocessCommandParser,
    promptbookVersionCommandParser,
    urlCommandParser,
    knowledgeCommandParser,
    boilerplateCommandParser, // <- TODO: !!!! Only in development, remove in production
] as const;
