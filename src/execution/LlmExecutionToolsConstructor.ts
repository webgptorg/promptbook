import type { Registered } from "../utils/$Register";
import type { TODO_any } from "../utils/organization/TODO_any";
import type { LlmExecutionTools } from "./LlmExecutionTools";

/**
 * @@@
 */
export type LlmExecutionToolsConstructor = Registered &
	((options: TODO_any) => LlmExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
