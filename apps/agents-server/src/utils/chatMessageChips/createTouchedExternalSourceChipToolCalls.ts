import type { ToolCall } from '@promptbook-local/types';
import { EXTERNAL_SOURCE_TOOL_CALL_NAME } from '../../../../../src/book-components/Chat/utils/externalSourceToolCall';
import type { AgentMessageTouchedExternalSource } from '../../../../../src/utils/agent-message-runtime/AgentMessageTouchedExternalSource';

/**
 * Prefix of the idempotency keys identifying touched-external-source chips.
 */
const TOUCHED_EXTERNAL_SOURCE_CHIP_IDEMPOTENCY_PREFIX = 'external-source';

/**
 * Creates the external-source chips of one answered message.
 *
 * An external source is reported by the runner once the answering harness reached beyond the
 * agent itself — an integration such as Gmail, a website, or a web search — so the chat always
 * tells which outside services and addresses one answer really involved. Work the agent does
 * only inside itself reaches this with an empty list and therefore shows no chip.
 *
 * @param options - External sources the answer touched.
 * @returns External-source tool calls shown as chips below the answer.
 */
export function createTouchedExternalSourceChipToolCalls(options: {
    readonly touchedExternalSources: ReadonlyArray<AgentMessageTouchedExternalSource>;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): ReadonlyArray<ToolCall> {
    return options.touchedExternalSources.map((touchedExternalSource) => ({
        name: EXTERNAL_SOURCE_TOOL_CALL_NAME,
        arguments: {
            kind: touchedExternalSource.kind,
            name: touchedExternalSource.name,
            ...(touchedExternalSource.url === undefined ? {} : { url: touchedExternalSource.url }),
        },
        result: touchedExternalSource,
        state: 'COMPLETE',
        idempotencyKey: `${TOUCHED_EXTERNAL_SOURCE_CHIP_IDEMPOTENCY_PREFIX}-${
            touchedExternalSource.kind
        }-${touchedExternalSource.name.toLowerCase()}`,
        createdAt: options.createdAt,
    }));
}
