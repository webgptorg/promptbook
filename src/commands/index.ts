import { bookVersionCommandParser } from "./BOOK_VERSION/bookVersionCommandParser";
import { expectCommandParser } from "./EXPECT/expectCommandParser";
import { foreachCommandParser } from "./FOREACH/foreachCommandParser";
import { formatCommandParser } from "./FORMAT/formatCommandParser";
import { formfactorCommandParser } from "./FORMFACTOR/formfactorCommandParser";
import { jokerCommandParser } from "./JOKER/jokerCommandParser";
import { knowledgeCommandParser } from "./KNOWLEDGE/knowledgeCommandParser";
import { modelCommandParser } from "./MODEL/modelCommandParser";
import { parameterCommandParser } from "./PARAMETER/parameterCommandParser";
import { personaCommandParser } from "./PERSONA/personaCommandParser";
import { postprocessCommandParser } from "./POSTPROCESS/postprocessCommandParser";
import { sectionCommandParser } from "./SECTION/sectionCommandParser";
import { urlCommandParser } from "./URL/urlCommandParser";
import { actionCommandParser } from "./X_ACTION/actionCommandParser";
import { instrumentCommandParser } from "./X_INSTRUMENT/instrumentCommandParser";
import { boilerplateCommandParser } from "./_BOILERPLATE/boilerplateCommandParser";

/**
 * All available command parsers
 *
 * @public exported from `@promptbook/editable`
 */
export const COMMANDS = [
	sectionCommandParser,
	expectCommandParser,
	formatCommandParser,
	jokerCommandParser,
	modelCommandParser,
	parameterCommandParser,
	postprocessCommandParser,
	bookVersionCommandParser,
	formfactorCommandParser,
	urlCommandParser,
	knowledgeCommandParser,
	actionCommandParser,
	instrumentCommandParser,
	personaCommandParser,
	foreachCommandParser,
	boilerplateCommandParser, // <- TODO: Only in development, remove in production

	// <- Note: [♓️][💩] This is the order of the commands in the pipeline, BUT its not used in parsing and before usage maybe it should be done better
] as const;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
