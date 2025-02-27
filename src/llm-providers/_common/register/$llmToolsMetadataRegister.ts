import { $Register } from "../../../utils/$Register";
import type { LlmToolsMetadata } from "./LlmToolsMetadata";

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $llmToolsMetadataRegister = new $Register<LlmToolsMetadata>(
	"llm_tools_metadata",
);

/**
 * TODO: [®] DRY Register logic
 */
