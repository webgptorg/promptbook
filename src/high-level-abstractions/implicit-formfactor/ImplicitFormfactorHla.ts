import type { $PipelineJson } from "../../commands/_common/types/CommandParser";
import { FORMFACTOR_DEFINITIONS } from "../../formfactors/index";
import { isPipelineImplementingInterface } from "../../pipeline/PipelineInterface/isPipelineImplementingInterface";
import type { SyncHighLevelAbstraction } from "../_common/HighLevelAbstraction";

/**
 * Set formfactor based on the pipeline interface e
 *
 * @private
 */
export const ImplicitFormfactorHla = {
	type: "SYNC",
	$applyToPipelineJson($pipelineJson: $PipelineJson): void {
		if ($pipelineJson.formfactorName !== undefined) {
			// Note: When formfactor is already set, do nothing
			return;
		}
		for (const formfactorDefinition of FORMFACTOR_DEFINITIONS.filter(
			({ name }) => name !== "GENERIC",
			// <- Note: Skip GENERIC formfactor, it will be used as a fallback if no other formfactor is compatible
		)) {
			// <- Note: [♓️][💩] This is the order of the formfactors, make some explicit priority

			const { name, pipelineInterface } = formfactorDefinition;

			const isCompatible = isPipelineImplementingInterface({
				pipeline: {
					formfactorName: name,
					// <- Note: `formfactorName` has no role in `isPipelineImplementingInterface`
					//           but it is needed to satisfy the typescript

					...$pipelineJson,
				},
				pipelineInterface,
			});

			/*/
            console.log({
                subject: `${$pipelineJson.title} implements ${name}`,
                pipelineTitle: $pipelineJson.title,
                formfactorName: name,
                isCompatible,
                formfactorInterface: pipelineInterface,
                pipelineInterface: getPipelineInterface($pipelineJson as PipelineJson),
            });
            /**/

			if (isCompatible) {
				$pipelineJson.formfactorName = name;
				return;
			}
		}
	},
} satisfies SyncHighLevelAbstraction;
