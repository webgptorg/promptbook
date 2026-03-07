/**
 * Drag metadata for folders and agents in the agents list.
 *
 * @private function of AgentsList
 */
export type DragItem = {
    /**
     * Logical type of dragged item.
     */
    type: 'AGENT' | 'FOLDER';
    /**
     * Stable identifier of dragged item.
     */
    identifier: string;
    /**
     * Parent folder id of dragged item.
     */
    parentId: number | null;
};
