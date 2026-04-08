/**
 * Characters that are unsafe inside Monaco in-memory model URI segments.
 *
 * @private function of useBookEditorWrapper
 */
const INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN = /[^a-zA-Z0-9._-]/g;

/**
 * Creates a stable Monaco in-memory model path for one agent book.
 *
 * Stable model paths let Monaco restore view state (cursor/scroll) after unmount/remount.
 *
 * @param nextAgentName - Agent route identifier.
 * @returns Monaco model URI for the book editor.
 * @private function of useBookEditorWrapper
 */
export function createAgentBookMonacoModelPath(nextAgentName: string): string {
    const safeAgentName = nextAgentName.replace(INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN, '-');
    const normalizedAgentName = safeAgentName || 'agent';
    return `memory://agents-server/book-editor/${normalizedAgentName}.book`;
}
