import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useRef } from 'react';
import { createToolCallMarker } from './createToolCallMarker';

/**
 * Callback invoked only for tool calls that have not been handled yet.
 *
 * @private function of useAgentChatToolInteractions
 */
type HandleToolCallOnceCallback = (toolCall: ToolCall) => void;

/**
 * Returns a stable handler that ignores duplicate tool calls based on their marker.
 *
 * @private function of useAgentChatToolInteractions
 */
export function useHandleToolCallOnce(onUnhandledToolCall: HandleToolCallOnceCallback): (toolCall: ToolCall | null) => void {
    const handledToolCallMarkersRef = useRef<Set<string>>(new Set());

    return useCallback(
        (toolCall: ToolCall | null) => {
            if (!toolCall) {
                return;
            }

            const marker = createToolCallMarker(toolCall);
            if (handledToolCallMarkersRef.current.has(marker)) {
                return;
            }

            handledToolCallMarkersRef.current.add(marker);
            onUnhandledToolCall(toolCall);
        },
        [onUnhandledToolCall],
    );
}
