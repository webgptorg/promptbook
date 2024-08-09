/**
 * Represents items which are compared to each other
 */
export type FromtoItems = Array<{
    /**
     * The title of the item
     */
    readonly title: string;
    /**
     * The start of the item
     *
     * This can mean anything, like seconds, milliseconds, dollars, etc.
     */
    readonly from: number;
    /**
     * The end of the item
     */
    readonly to: number;
}>;
